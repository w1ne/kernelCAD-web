// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox mode — process-wide state.
//
// PURE (no node imports): telemetry, the MCP server and the CLI read the
// sandbox state through this module, and none of them should drag `node:fs`
// into a browser bundle just to ask "is the sandbox on?". The node guards that
// enforce it live beside this file (`pathGuard.ts`, `fsGuard.ts`,
// `networkGuard.ts`, `enable.ts`). See docs/sandbox.md.

/** How the sandbox was switched on. */
export type SandboxSource = 'env' | 'flag' | 'api';

export interface SandboxConfig {
  /** Realpath of the workspace root. Reads and writes are allowed inside it. */
  readonly workspaceRoot: string;
  /**
   * Realpaths of read-only roots the runtime itself needs (the kernelCAD
   * package and its node_modules, the Playwright browser cache, PATH
   * directories for helper binaries, plus `KERNELCAD_SANDBOX_READ_PATHS`).
   * Writes there are refused.
   */
  readonly readOnlyRoots: readonly string[];
  /** Exact device paths allowed for read + write (`/dev/null`, `/dev/urandom` …). */
  readonly devicePaths: readonly string[];
  /** Workspace-local scratch dirs the runtime is redirected to. */
  readonly scratch: {
    readonly root: string;
    readonly tmp: string;
    readonly cache: string;
    readonly config: string;
  };
  /** When true, outbound connections to loopback (127.0.0.0/8, ::1, `localhost`) are allowed. Default false. */
  readonly allowLoopback: boolean;
  readonly source: SandboxSource;
}

let active: SandboxConfig | null = null;

/** The active sandbox configuration, or `null` when sandbox mode is off. */
export function getSandboxConfig(): SandboxConfig | null {
  return active;
}

/** True when sandbox mode is enforcing in this process. */
export function isSandboxEnabled(): boolean {
  return active !== null;
}

/** Internal: set by `enableSandbox()` / cleared by `disableSandboxForTest()`. */
export function setSandboxConfig(cfg: SandboxConfig | null): void {
  active = cfg;
}

/** True for the env values that switch a boolean flag on. */
export function envFlagOn(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** True when the environment asks for sandbox mode (`KERNELCAD_SANDBOX=1`). */
export function sandboxRequestedByEnv(env: Record<string, string | undefined>): boolean {
  return envFlagOn(env.KERNELCAD_SANDBOX);
}

/**
 * Script asset-path check (`lib.fromSTEP/fromSTL/fromDXF…`, reference images,
 * textures). Registered by `enableSandbox()` so the PURE resolver in
 * shared/runtime/scriptRelativePath.ts can refuse a path without importing
 * node:fs into browser bundles. Throws a `cli.sandbox-path-denied` KernelError.
 */
export type ScriptPathCheck = (requested: string, absPath: string) => void;
let scriptPathCheck: ScriptPathCheck | null = null;

export function setSandboxScriptPathCheck(check: ScriptPathCheck | null): void {
  scriptPathCheck = check;
}

export function getSandboxScriptPathCheck(): ScriptPathCheck | null {
  return active === null ? null : scriptPathCheck;
}
