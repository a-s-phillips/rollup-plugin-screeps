import { execSync } from "child_process";

export interface ScreepsConfig {
  token?: string;
  email?: string;
  password?: string;
  protocol: "http" | "https";
  hostname: string;
  port: number;
  path: string;
  branch: string | "auto";
}

export type CodeModule = string | { binary: string };

interface BranchListResponse {
  list: { branch: string }[];
}

interface AuthResponse {
  token: string;
}

function baseUrl(config: ScreepsConfig): string {
  let url = `${config.protocol}://${config.hostname}:${config.port}${config.path}`;
  if (!url.endsWith("/")) url += "/";
  return url;
}

async function request<T>(
  config: ScreepsConfig,
  token: string | undefined,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = new URL(path, baseUrl(config));
  const headers: Record<string, string> = {};
  if (token) {
    headers["X-Token"] = token;
    headers["X-Username"] = token;
  }

  let init: RequestInit;
  if (method === "GET") {
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        url.searchParams.set(key, String(value));
      }
    }
    init = { method, headers };
  } else {
    headers["Content-Type"] = "application/json";
    init = { method, headers, body: JSON.stringify(body ?? {}) };
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Screeps API request failed: ${method} ${path} -> ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function authenticate(config: ScreepsConfig): Promise<string> {
  const res = await request<AuthResponse>(config, undefined, "POST", "api/auth/signin", {
    email: config.email,
    password: config.password
  });
  return res.token;
}

export async function getBranches(config: ScreepsConfig, token: string): Promise<string[]> {
  const res = await request<BranchListResponse>(config, token, "GET", "api/user/branches");
  return res.list.map((b) => b.branch);
}

export async function setCode(
  config: ScreepsConfig,
  token: string,
  branch: string,
  modules: Record<string, CodeModule>
): Promise<void> {
  await request(config, token, "POST", "api/user/code", { branch, modules });
}

export async function cloneBranch(
  config: ScreepsConfig,
  token: string,
  branch: string,
  defaultModules: Record<string, CodeModule>
): Promise<void> {
  await request(config, token, "POST", "api/user/clone-branch", {
    branch: "",
    newName: branch,
    defaultModules
  });
}

export function getBranchName(branch: string): string {
  if (branch !== "auto") return branch;

  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: process.cwd() }).toString().trim();
  } catch (err) {
    throw new Error(
      `Could not determine current git branch (branch: "auto" requires running inside a git repository): ${
        (err as Error).message
      }`
    );
  }
}
