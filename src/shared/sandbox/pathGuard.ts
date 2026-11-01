// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox path guard — THE path decision.
//
// Every sandbox path check (MCP tool arguments, CLI arguments and the node:fs
// backstop in fsGuard.ts) ends here, so there is exactly one definition of
// "inside the workspace". A path is judged on its REAL location:
//
//   1. `~` / `~/x` expand to the home directory; `file://` URLs and Buffers
//      become paths; relative paths resolve against the process cwd.
//   2. `path.resolve` collapses `.` and `..`.
//   3. Every existing component is realpath'd (symlinks followed). A
//      non-existent tail is walked component by component with lstat, and a
//      dangling symlink is followed to its target — so a link inside the
//      workspace that points outside it is refused even before the target
//      exists (the write would create the file outside).
//   4. The real path must sit under the workspace root (read + write), under a
//      read-only runtime root (read only), or equal an allowed device path.
//
// The guard captures the ORIGINAL fs functions at import time, before
// fsGuard.ts patches the module, so its own probes are never recursive.

import fs from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSandboxConfig, type SandboxConfig } from './config';

const realpathNative = fs.realpathSync.native.bind(fs.realpathSync);
const lstatRaw = fs.lstatSync.bind(fs);
const readlinkRaw = fs.readlinkSync.bind(fs);

export type SandboxAccess = 'read' | 'write';

export interface SandboxPathVerdict {
  allowed: boolean;
  /** Absolute real path the decision was made on. */
  resolved: string;
  /** Which root admitted it, or why it was refused. */
  reason: 'workspace' | 'read-only-root' | 'device' | 'outside-workspace' | 'read-only-root-write' | 'unresolvable';
}

const MAX_LINK_HOPS = 40;

/** Turn a string / Buffer / file: URL into an absolute, `..`-collapsed path. */
export function toAbsolutePath(p: string | Buffer | URL): string {
  let s: string;
  if (p instanceof URL) s = fileURLToPath(p);
  else if (Buffer.isBuffer(p)) s = p.toString('utf8');
  else if (p.startsWith('file:')) s = fileURLToPath(p);
  else s = p;
  if (s === '~') s = homedir();
  else if (s.startsWith('~/')) s = join(homedir(), s.slice(2));
  return isAbsolute(s) ? resolve(s) : resolve(process.cwd(), s);
}

function lstatOrNull(p: string): fs.Stats | null {
  try {
    return lstatRaw(p);
  } catch {
    return null;
  }
}

/**
 * Real location of `abs`, following symlinks in every component that exists
 * (including a dangling final link). Throws only on a symlink loop.
 */
export function realLocation(abs: string, hops = 0): string {
  if (hops > MAX_LINK_HOPS) throw new Error(`symlink loop resolving ${abs}`);
  try {
    return realpathNative(abs);
  } catch {
    // Fall through: some component is missing or a link dangles.
  }
  const st = lstatOrNull(abs);
  if (st?.isSymbolicLink()) {
    const target = readlinkRaw(abs);
    return realLocation(resolve(dirname(abs), target), hops + 1);
  }
  const parent = dirname(abs);
  if (parent === abs) return abs;
  const tail = abs.slice(parent.length).replace(/^[/\\]+/, '');
  return join(realLocation(parent, hops), tail);
}

/** True when `child` equals `root` or sits underneath it. */
export function isWithin(child: string, root: string): boolean {
  if (child === root) return true;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return child.startsWith(prefix);
}

function decide(real: string, access: SandboxAccess, cfg: SandboxConfig): SandboxPathVerdict {
  if (isWithin(real, cfg.workspaceRoot)) return { allowed: true, resolved: real, reason: 'workspace' };
  if (cfg.devicePaths.includes(real)) return { allowed: true, resolved: real, reason: 'device' };
  const roRoot = cfg.readOnlyRoots.some(root => isWithin(real, root));
  if (roRoot) {
    return access === 'read'
      ? { allowed: true, resolved: real, reason: 'read-only-root' }
      : { allowed: false, resolved: real, reason: 'read-only-root-write' };
  }
  return { allowed: false, resolved: real, reason: 'outside-workspace' };
}

/**
 * Judge one path against the active sandbox. With the sandbox off every path
 * is allowed (the verdict still carries the resolved path).
 */
export function checkSandboxPath(
  p: string | Buffer | URL,
  access: SandboxAccess,
  cfg: SandboxConfig | null = getSandboxConfig(),
): SandboxPathVerdict {
  let abs: string;
  try {
    abs = toAbsolutePath(p);
  } catch {
    return { allowed: cfg === null, resolved: String(p), reason: 'unresolvable' };
  }
  if (cfg === null) return { allowed: true, resolved: abs, reason: 'workspace' };
  let real: string;
  try {
    real = realLocation(abs);
  } catch {
    return { allowed: false, resolved: abs, reason: 'unresolvable' };
  }
  return decide(real, access, cfg);
}

/** Short reason for an argument error (the workspace root is named separately). */
export function shortRefusal(verdict: SandboxPathVerdict): string {
  if (verdict.reason === 'read-only-root-write') return `${verdict.resolved} is in a read-only runtime root`;
  if (verdict.reason === 'unresolvable') return `${verdict.resolved} could not be resolved`;
  return `it resolves to ${verdict.resolved}`;
}

/** One-line human explanation of a refused verdict. */
export function describeRefusal(verdict: SandboxPathVerdict, cfg: SandboxConfig): string {
  switch (verdict.reason) {
    case 'read-only-root-write':
      return `${verdict.resolved} is inside a read-only runtime root; sandbox writes are allowed only under the workspace ${cfg.workspaceRoot}`;
    case 'unresolvable':
      return `${verdict.resolved} could not be resolved (symlink loop or invalid path)`;
    default:
      return `${verdict.resolved} resolves outside the sandbox workspace ${cfg.workspaceRoot}`;
  }
}
