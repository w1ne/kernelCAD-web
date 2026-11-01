// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox mode — switch-on, argv parsing and status.
//
// `enableSandbox()` is called once, by the CLI/MCP entry point, BEFORE any
// other kernelCAD module runs (src/agent/cli/lib/sandboxBoot.ts is the first
// import of src/agent/cli/index.ts). It:
//
//   1. resolves the workspace root (realpath; must be an existing directory);
//   2. redirects every runtime scratch location INTO the workspace —
//      TMPDIR (so `os.tmpdir()` temp dirs land in it), KERNELCAD_CACHE_DIR,
//      KERNELCAD_CONFIG_HOME — under `<workspace>/.kernelcad-sandbox/`;
//   3. forces telemetry off (KERNELCAD_TELEMETRY=0, DO_NOT_TRACK=1) and the
//      remote parts tier off (KERNELCAD_PARTS_BASE_URL=off);
//   4. exports KERNELCAD_SANDBOX=1 / KERNELCAD_WORKSPACE so child processes
//      (the heap re-exec, helpers) inherit the mode, and points the standard
//      proxy variables at a closed port so well-behaved helpers fail fast;
//   5. installs the fs and network chokepoints (fsGuard.ts, networkGuard.ts).

import { existsSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  envFlagOn,
  getSandboxConfig,
  sandboxRequestedByEnv,
  setSandboxConfig,
  setSandboxScriptPathCheck,
  type SandboxConfig,
  type SandboxSource,
} from './config';
import { installFsGuard, uninstallFsGuard } from './fsGuard';
import { installNetworkGuard, uninstallNetworkGuard } from './networkGuard';
import { sandboxCommandRefused, sandboxPathArgError } from './errors';
import { checkSandboxPath, shortRefusal } from './pathGuard';

export interface EnableSandboxOptions {
  /** Workspace root; default `KERNELCAD_WORKSPACE`, then the cwd. */
  workspace?: string;
  source?: SandboxSource;
  env?: NodeJS.ProcessEnv;
  /** Skip installing the fs / network patches (unit tests of the policy only). */
  installGuards?: boolean;
}

/** Closed TCP port the proxy variables point at (discard; nothing listens). */
const DEAD_PROXY = 'http://127.0.0.1:9';
const DEVICE_PATHS = ['/dev/null', '/dev/zero', '/dev/random', '/dev/urandom', '/dev/tty', '/dev/stdin', '/dev/stdout', '/dev/stderr'];

function realOrNull(p: string): string | null {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
}

/** Directory holding kernelCAD's own package.json (source checkout or installed package). */
export function findPackageRoot(start = dirname(fileURLToPath(import.meta.url))): string | null {
  let dir = start;
  for (;;) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest)) {
      try {
        if ((JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }).name === 'kernelcad') return dir;
      } catch {
        // Unreadable manifest — keep walking.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function playwrightCache(env: NodeJS.ProcessEnv): string {
  if (env.PLAYWRIGHT_BROWSERS_PATH && env.PLAYWRIGHT_BROWSERS_PATH !== '0') return env.PLAYWRIGHT_BROWSERS_PATH;
  if (platform() === 'darwin') return join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (platform() === 'win32') return join(env.LOCALAPPDATA ?? homedir(), 'ms-playwright');
  return join(env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'ms-playwright');
}

/** Read-only roots the runtime needs: package, node_modules, browsers, PATH binaries, extras. */
export function runtimeReadOnlyRoots(env: NodeJS.ProcessEnv): string[] {
  const out: string[] = [];
  const pkg = findPackageRoot();
  if (pkg !== null) {
    out.push(pkg, join(pkg, 'node_modules'));
    // npm global / npx installs hoist dependencies into the enclosing node_modules.
    const parent = dirname(pkg);
    if (basename(parent) === 'node_modules') out.push(parent);
  }
  out.push(playwrightCache(env), dirname(process.execPath));
  for (const dir of (env.PATH ?? '').split(delimiter)) if (dir !== '' && dir !== '.') out.push(dir);
  for (const dir of (env.KERNELCAD_SANDBOX_READ_PATHS ?? '').split(delimiter)) if (dir !== '') out.push(resolve(dir));
  const real = out.map(realOrNull).filter((p): p is string => p !== null);
  return [...new Set(real)];
}

function resolveWorkspace(raw: string): string {
  const real = realOrNull(resolve(raw));
  if (real === null || !statSync(real).isDirectory()) {
    throw sandboxCommandRefused(
      `workspace ${raw}`,
      'the sandbox workspace root must be an existing directory (set --workspace / KERNELCAD_WORKSPACE)',
    );
  }
  return real;
}

function hardenEnv(env: NodeJS.ProcessEnv, cfg: SandboxConfig): void {
  env.KERNELCAD_SANDBOX = '1';
  env.KERNELCAD_WORKSPACE = cfg.workspaceRoot;
  env.TMPDIR = cfg.scratch.tmp;
  env.TMP = cfg.scratch.tmp;
  env.TEMP = cfg.scratch.tmp;
  env.KERNELCAD_CACHE_DIR = cfg.scratch.cache;
  env.KERNELCAD_CONFIG_HOME = cfg.scratch.config;
  env.KERNELCAD_TELEMETRY = '0';
  env.DO_NOT_TRACK = '1';
  env.KERNELCAD_PARTS_BASE_URL = 'off';
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) {
    env[key] = DEAD_PROXY;
  }
  delete env.NO_PROXY;
  delete env.no_proxy;
}

/** Build the config without side effects (exported for tests and `sandbox status`). */
export function buildSandboxConfig(opts: EnableSandboxOptions = {}): SandboxConfig {
  const env = opts.env ?? process.env;
  const workspaceRoot = resolveWorkspace(opts.workspace ?? env.KERNELCAD_WORKSPACE ?? process.cwd());
  const root = join(workspaceRoot, '.kernelcad-sandbox');
  return {
    workspaceRoot,
    readOnlyRoots: runtimeReadOnlyRoots(env),
    devicePaths: DEVICE_PATHS,
    scratch: { root, tmp: join(root, 'tmp'), cache: join(root, 'cache'), config: join(root, 'config') },
    allowLoopback: envFlagOn(env.KERNELCAD_SANDBOX_ALLOW_LOOPBACK),
    source: opts.source ?? 'api',
  };
}

/** Switch sandbox mode on for this process. Idempotent: a second call returns the active config. */
export function enableSandbox(opts: EnableSandboxOptions = {}): SandboxConfig {
  const existing = getSandboxConfig();
  if (existing !== null) return existing;
  const env = opts.env ?? process.env;
  const cfg = buildSandboxConfig(opts);
  for (const dir of [cfg.scratch.tmp, cfg.scratch.cache, cfg.scratch.config]) mkdirSync(dir, { recursive: true });
  hardenEnv(env, cfg);
  setSandboxConfig(cfg);
  setSandboxScriptPathCheck(scriptAssetCheck);
  if (opts.installGuards !== false) {
    installFsGuard();
    installNetworkGuard();
  }
  return cfg;
}

/** Script asset paths (lib.fromSTEP, referenceImage, fonts, textures) must be readable under the sandbox. */
function scriptAssetCheck(requested: string, absPath: string): void {
  const cfg = getSandboxConfig();
  if (cfg === null) return;
  const verdict = checkSandboxPath(absPath, 'read', cfg);
  if (verdict.allowed) return;
  throw sandboxPathArgError({
    api: 'script asset (lib.fromSTEP / fromSTL / fromDXF / referenceImage / font)',
    arg: 'path',
    got: requested,
    detail: shortRefusal(verdict),
    workspaceRoot: cfg.workspaceRoot,
  });
}

/** Test-only: switch the sandbox off and restore the patched modules. */
export function disableSandboxForTest(): void {
  uninstallFsGuard();
  uninstallNetworkGuard();
  setSandboxScriptPathCheck(null);
  setSandboxConfig(null);
}

export interface SandboxArgv {
  sandbox: boolean;
  workspace?: string;
  /** argv with the sandbox flags removed (commander never sees them). */
  rest: string[];
}

/**
 * Pull `--sandbox`, `--workspace <dir>` / `--workspace=<dir>` out of argv,
 * wherever they appear before a `--` terminator. Works for every subcommand
 * (`kernelcad --sandbox export …`, `kernelcad mcp --sandbox`).
 */
export function parseSandboxArgv(argv: readonly string[]): SandboxArgv {
  const rest: string[] = [];
  let sandbox = false;
  let workspace: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') { rest.push(...argv.slice(i)); break; }
    if (a === '--sandbox') { sandbox = true; continue; }
    if (a === '--workspace' && i + 1 < argv.length) { workspace = argv[++i]; continue; }
    if (a.startsWith('--workspace=')) { workspace = a.slice('--workspace='.length); continue; }
    rest.push(a);
  }
  return { sandbox, workspace, rest };
}

/** Entry-point helper: enable from env and/or argv. Returns the remaining argv. */
export function bootSandboxFromProcess(argv: string[], env: NodeJS.ProcessEnv = process.env): string[] {
  const parsed = parseSandboxArgv(argv);
  // `--workspace` implies `--sandbox`: a workspace root only means something in sandbox mode.
  const byFlag = parsed.sandbox || parsed.workspace !== undefined;
  if (byFlag || sandboxRequestedByEnv(env)) {
    enableSandbox({ workspace: parsed.workspace, source: byFlag ? 'flag' : 'env', env });
  }
  return parsed.rest;
}
