import { describe, it, expect, vi, afterEach } from "vitest";
import * as path from "path";
import { execSync } from "child_process";
import { validateConfig, loadConfigFile, getFileList } from "../src/rollup-plugin-screeps";
import { getBranchName } from "../src/screeps-client";

const fixturesDist = path.join(__dirname, "fixtures/dist");

describe("validateConfig", () => {
  it("requires a token for screeps.com", () => {
    expect(
      validateConfig({
        token: "foo",
        branch: "auto",
        protocol: "https",
        hostname: "screeps.com",
        port: 443,
        path: "/"
      })
    ).toBe(true);

    expect(
      validateConfig({
        email: "you@domain.tld",
        password: "foo",
        branch: "auto",
        protocol: "https",
        hostname: "screeps.com",
        port: 443,
        path: "/"
      })
    ).toBe(false);
  });

  it("accepts a token or email/password for any other server", () => {
    expect(
      validateConfig({
        token: "foo",
        branch: "auto",
        protocol: "https",
        hostname: "myscreeps.com",
        port: 443,
        path: "/"
      })
    ).toBe(true);

    expect(
      validateConfig({
        email: "you@domain.tld",
        password: "foo",
        branch: "auto",
        protocol: "https",
        hostname: "myscreeps.com",
        port: 443,
        path: "/"
      })
    ).toBe(true);
  });
});

describe("loadConfigFile", () => {
  it("reads and validates a config file", () => {
    const config = loadConfigFile(path.join(__dirname, "fixtures/screeps.json"));
    expect(config.branch).toBe("foo");
  });

  it("throws on an invalid config file", () => {
    expect(() => loadConfigFile(path.join(__dirname, "fixtures/invalid-screeps.json"))).toThrow();
  });
});

describe("getBranchName", () => {
  it("returns the branch as-is when not 'auto'", () => {
    expect(getBranchName("ai")).toBe("ai");
  });

  it("resolves the current git branch when 'auto'", () => {
    const actualBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    expect(getBranchName("auto")).toBe(actualBranch);
  });
});

describe("getFileList", () => {
  it("collects JS modules and base64-encodes WASM binaries", () => {
    const code = getFileList(path.join(fixturesDist, "main.js"));

    expect(Object.keys(code).sort()).toEqual(["main", "main.js.map", "wasm_module.wasm"]);
    expect(code.main).toMatch(/use strict/);
    expect(code["main.js.map"]).toMatch(/^module.exports/);
    expect(code["wasm_module.wasm"]).toEqual({
      binary: expect.any(String)
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
