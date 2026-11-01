// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox filesystem CHOKEPOINT.
//
// kernelCAD reaches the filesystem from ~75 modules (exporters, importers,
// render/inspect bundles, caches, the parts catalog, user scripts through the
// host-fs port). Rather than sprinkle a check into each, sandbox mode wraps
// the path-taking functions of `node:fs` and `node:fs/promises` ONCE and then
// calls `module.syncBuiltinESMExports()` so every ESM named import
// (`import { writeFileSync } from 'node:fs'`) sees the guarded function too.
// Every wrapped call routes its path argument(s) through `checkSandboxPath`
// (pathGuard.ts) — the same decision the MCP and CLI argument guards use.
//
// Error shape per API style: sync functions throw, callback functions call
// back with the error on the next tick, promise functions reject. The error is
// a KernelError `cli.sandbox-path-denied` (with `errno: 'EACCES'`).
// `existsSync` / `exists` report "does not exist" for refused paths instead of
// throwing, matching their never-throw contract — a refused path is invisible.
//
// Known bypasses, by design documented in docs/sandbox.md: file descriptors
// opened before the guard was installed, native addons doing their own I/O,
// and child processes (which inherit sandbox env but not this patch).

import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { getSandboxConfig } from './config';
import { checkSandboxPath, describeRefusal, type SandboxAccess } from './pathGuard';
import { sandboxFsError } from './errors';

type AnyFn = (...args: unknown[]) => unknown;
type Style = 'sync' | 'callback' | 'promise';
/** Per-argument access: index → 'read' | 'write'. */
type ArgSpec = ReadonlyArray<readonly [number, SandboxAccess | 'open-flags']>;

const R0: ArgSpec = [[0, 'read']];
const W0: ArgSpec = [[0, 'write']];
const RW01: ArgSpec = [[0, 'read'], [1, 'write']];
const WW01: ArgSpec = [[0, 'write'], [1, 'write']];
const OPEN: ArgSpec = [[0, 'open-flags']];

/** Base names (no Sync suffix) of path-taking fs functions and their arg specs. */
const FS_SPECS: Record<string, ArgSpec> = {
  readFile: R0, readdir: R0, opendir: R0, stat: R0, lstat: R0, statfs: R0, access: R0,
  realpath: R0, readlink: R0,
  writeFile: W0, appendFile: W0, mkdir: W0, mkdtemp: W0, rm: W0, rmdir: W0, unlink: W0,
  truncate: W0, chmod: W0, lchmod: W0, chown: W0, lchown: W0, utimes: W0, lutimes: W0,
  open: OPEN,
  copyFile: RW01, cp: RW01,
  rename: WW01, link: WW01, symlink: WW01,
};
/** Sync-only / stream / watch entry points. */
const EXTRA_SYNC: Record<string, ArgSpec> = {
  createReadStream: R0, createWriteStream: W0, watch: R0, watchFile: R0,
};

const saved: Array<{ target: Record<string, unknown>; key: string; fn: unknown }> = [];
let installed = false;

function openAccess(flags: unknown): SandboxAccess {
  if (flags === undefined || flags === null) return 'read';
  if (typeof flags === 'number') {
    const { O_WRONLY, O_RDWR, O_CREAT, O_TRUNC, O_APPEND } = fs.constants;
    return (flags & (O_WRONLY | O_RDWR | O_CREAT | O_TRUNC | O_APPEND)) !== 0 ? 'write' : 'read';
  }
  return /[wa+]/.test(String(flags)) ? 'write' : 'read';
}

function isPathLike(v: unknown): v is string | Buffer | URL {
  return typeof v === 'string' || Buffer.isBuffer(v) || v instanceof URL;
}

/** Returns the refusal error for this call, or null when every path is allowed. */
function refusal(op: string, spec: ArgSpec, args: unknown[]): Error | null {
  const cfg = getSandboxConfig();
  if (cfg === null) return null;
  for (const [index, kind] of spec) {
    const p = args[index];
    if (!isPathLike(p)) continue; // fd / FileHandle / undefined
    const access = kind === 'open-flags' ? openAccess(args[index + 1]) : kind;
    const verdict = checkSandboxPath(p, access, cfg);
    if (!verdict.allowed) return sandboxFsError(op, access, describeRefusal(verdict, cfg));
  }
  return null;
}

function guardSync(op: string, orig: AnyFn, spec: ArgSpec): AnyFn {
  return function guarded(this: unknown, ...args: unknown[]) {
    const err = refusal(op, spec, args);
    if (err) throw err;
    return orig.apply(this, args);
  };
}

function guardCallback(op: string, orig: AnyFn, spec: ArgSpec): AnyFn {
  return function guarded(this: unknown, ...args: unknown[]) {
    const err = refusal(op, spec, args);
    if (!err) return orig.apply(this, args);
    const cb = args[args.length - 1];
    if (typeof cb !== 'function') throw err;
    process.nextTick(() => (cb as (e: Error) => void)(err));
    return undefined;
  };
}

function guardPromise(op: string, orig: AnyFn, spec: ArgSpec): AnyFn {
  return function guarded(this: unknown, ...args: unknown[]) {
    const err = refusal(op, spec, args);
    return err ? Promise.reject(err) : orig.apply(this, args);
  };
}

const WRAP: Record<Style, (op: string, orig: AnyFn, spec: ArgSpec) => AnyFn> = {
  sync: guardSync, callback: guardCallback, promise: guardPromise,
};

function patch(target: Record<string, unknown>, key: string, style: Style, spec: ArgSpec, op: string): void {
  const orig = target[key];
  if (typeof orig !== 'function') return;
  const wrapped = WRAP[style](op, orig as AnyFn, spec);
  // Keep sub-properties such as realpathSync.native / realpath.native.
  for (const prop of Object.keys(orig)) {
    const sub = (orig as unknown as Record<string, unknown>)[prop];
    (wrapped as unknown as Record<string, unknown>)[prop] = typeof sub === 'function'
      ? WRAP[style](`${op}.${prop}`, sub as AnyFn, spec)
      : sub;
  }
  saved.push({ target, key, fn: orig });
  target[key] = wrapped;
}

function patchExists(fsMod: Record<string, unknown>): void {
  const existsSync = fsMod.existsSync as AnyFn;
  const exists = fsMod.exists as AnyFn | undefined;
  saved.push({ target: fsMod, key: 'existsSync', fn: existsSync });
  fsMod.existsSync = (p: unknown) => (refusal('existsSync', R0, [p]) ? false : existsSync(p));
  if (typeof exists === 'function') {
    saved.push({ target: fsMod, key: 'exists', fn: exists });
    fsMod.exists = (p: unknown, cb: (ok: boolean) => void) => {
      if (refusal('exists', R0, [p])) { process.nextTick(() => cb(false)); return; }
      exists(p, cb);
    };
  }
}

/** Wrap node:fs + node:fs/promises. Idempotent. */
export function installFsGuard(): void {
  if (installed) return;
  installed = true;
  const fsMod = fs as unknown as Record<string, unknown>;
  const promises = fs.promises as unknown as Record<string, unknown>;
  for (const [base, spec] of Object.entries(FS_SPECS)) {
    patch(fsMod, `${base}Sync`, 'sync', spec, `${base}Sync`);
    patch(fsMod, base, 'callback', spec, base);
    patch(promises, base, 'promise', spec, `fs.promises.${base}`);
  }
  for (const [name, spec] of Object.entries(EXTRA_SYNC)) patch(fsMod, name, 'sync', spec, name);
  patch(promises, 'watch', 'sync', R0, 'fs.promises.watch');
  patchExists(fsMod);
  syncBuiltinESMExports();
}

/** Test-only: restore the original fs functions. */
export function uninstallFsGuard(): void {
  while (saved.length > 0) {
    const { target, key, fn } = saved.pop()!;
    target[key] = fn;
  }
  installed = false;
  syncBuiltinESMExports();
}

export function isFsGuardInstalled(): boolean {
  return installed;
}
