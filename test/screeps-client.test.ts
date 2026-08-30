import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ScreepsConfig,
  authenticate,
  getBranches,
  setCode,
  cloneBranch
} from "../src/screeps-client";

const config: ScreepsConfig = {
  token: "test-token",
  protocol: "https",
  hostname: "screeps.com",
  port: 443,
  path: "/",
  branch: "auto"
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response;
}

describe("screeps-client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("authenticates with email/password and returns a token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: "issued-token" }));

    const token = await authenticate({ ...config, token: undefined, email: "a@b.com", password: "pw" });

    expect(token).toBe("issued-token");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://screeps.com/api/auth/signin");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.com", password: "pw" });
  });

  it("lists branches using X-Token/X-Username headers", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ list: [{ branch: "main" }, { branch: "ai" }] })
    );

    const branches = await getBranches(config, "test-token");

    expect(branches).toEqual(["main", "ai"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://screeps.com/api/user/branches");
    expect(init.method).toBe("GET");
    expect(init.headers["X-Token"]).toBe("test-token");
    expect(init.headers["X-Username"]).toBe("test-token");
  });

  it("pushes code with a 'modules' body key", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await setCode(config, "test-token", "main", { main: "console.log(1)" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://screeps.com/api/user/code");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      branch: "main",
      modules: { main: "console.log(1)" }
    });
  });

  it("clones a branch with defaultModules", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await cloneBranch(config, "test-token", "ai", { main: "console.log(1)" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://screeps.com/api/user/clone-branch");
    expect(JSON.parse(init.body)).toEqual({
      branch: "",
      newName: "ai",
      defaultModules: { main: "console.log(1)" }
    });
  });

  it("throws with status and body text on a failed request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "nope" }, false, 401));

    await expect(getBranches(config, "bad-token")).rejects.toThrow(/401/);
  });
});
