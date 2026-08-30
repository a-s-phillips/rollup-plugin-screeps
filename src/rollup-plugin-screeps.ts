import * as fs from "fs";
import * as path from "path";
import { Plugin, OutputOptions, OutputBundle } from "rollup";
import {
  ScreepsConfig,
  CodeModule,
  authenticate,
  getBranches,
  setCode,
  cloneBranch,
  getBranchName
} from "./screeps-client.js";

export { ScreepsConfig };

export interface ScreepsOptions {
  configFile?: string;
  config?: ScreepsConfig;
  dryRun?: boolean;
}

export interface BinaryModule {
  binary: string;
}

export interface CodeList {
  [key: string]: CodeModule;
}

export function generateSourceMaps(bundle: OutputBundle) {
  let itemName: string;
  for (itemName in bundle) {
    const item = bundle[itemName];
    if (item.type === "chunk" && item.map) {
      const tmp = item.map.toString;

      delete item.map.sourcesContent;

      item.map.toString = function () {
        return "module.exports = " + tmp.apply(this, arguments as unknown as []) + ";";
      };
    }
  }
}

export function writeSourceMaps(options: OutputOptions) {
  fs.renameSync(options.file + ".map", options.file + ".map.js");
}

export function validateConfig(cfg: Partial<ScreepsConfig>): cfg is ScreepsConfig {
  if (cfg.hostname && cfg.hostname === "screeps.com") {
    return [
      typeof cfg.token === "string",
      cfg.protocol === "http" || cfg.protocol === "https",
      typeof cfg.hostname === "string",
      typeof cfg.port === "number",
      typeof cfg.path === "string",
      typeof cfg.branch === "string"
    ].reduce((a, b) => a && b);
  }

  return [
    (typeof cfg.email === "string" && typeof cfg.password === "string") ||
      typeof cfg.token === "string",
    cfg.protocol === "http" || cfg.protocol === "https",
    typeof cfg.hostname === "string",
    typeof cfg.port === "number",
    typeof cfg.path === "string",
    typeof cfg.branch === "string"
  ].reduce((a, b) => a && b);
}

export function loadConfigFile(configFile: string) {
  const data = fs.readFileSync(configFile, "utf8");
  const cfg = JSON.parse(data) as Partial<ScreepsConfig>;
  if (!validateConfig(cfg)) throw new TypeError("Invalid config");
  if (cfg.email && cfg.password && !cfg.token && cfg.hostname === "screeps.com") {
    console.log("Please change your email/password to a token");
  }
  return cfg;
}

export async function uploadSource(
  config: string | ScreepsConfig,
  options: OutputOptions,
  bundle: OutputBundle
) {
  if (!config) {
    console.log(
      "screeps() needs a config e.g. screeps({configFile: './screeps.json'}) or screeps({config: { ... }})"
    );
    return;
  }

  if (typeof config === "string") config = loadConfigFile(config);

  const code = getFileList(options.file!);
  const branch = getBranchName(config.branch);

  const token = config.token ?? (await authenticate(config));

  await runUpload(config, token, branch, code);
}

export async function runUpload(
  config: ScreepsConfig,
  token: string,
  branch: string,
  code: CodeList
) {
  const branches = await getBranches(config, token);

  if (branches.includes(branch)) {
    await setCode(config, token, branch, code);
  } else {
    await cloneBranch(config, token, branch, code);
  }
}

export function getFileList(outputFile: string) {
  const code: CodeList = {};
  const base = path.dirname(outputFile);
  const files = fs
    .readdirSync(base)
    .filter((f) => path.extname(f) === ".js" || path.extname(f) === ".wasm");
  files.map((file) => {
    if (file.endsWith(".js")) {
      code[file.replace(/\.js$/i, "")] = fs.readFileSync(path.join(base, file), "utf8");
    } else {
      code[file] = {
        binary: fs.readFileSync(path.join(base, file)).toString("base64")
      };
    }
  });
  return code;
}

export { getBranchName };

export function screeps(screepsOptions: ScreepsOptions = {}) {
  return {
    name: "screeps",

    generateBundle(options: OutputOptions, bundle: OutputBundle) {
      if (options.sourcemap) generateSourceMaps(bundle);
    },

    async writeBundle(options: OutputOptions, bundle: OutputBundle) {
      if (options.sourcemap) writeSourceMaps(options);

      if (!screepsOptions.dryRun) {
        await uploadSource((screepsOptions.configFile || screepsOptions.config)!, options, bundle);
      }
    }
  } as Plugin;
}

export default screeps;
