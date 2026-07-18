// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/script-runtime/safeOutputPath.ts
//
// Conservative-by-default validation for MCP tool output_path arguments.
// First file-write MCP tool (export_model, originally landed as export_stl
// in rc.15) sets the precedent for future writers (thumbnail, STEP-export,
// etc).
//
// Rules:
// 1. Reject paths containing `..` segments (path traversal).
// 2. Reject ~user/... (other-user home) — unsupported, reject explicitly.
// 3. Reject absolute paths under /etc/, /proc/, /sys/, /dev/, /root/.
// 4. Reject user-config paths: ~/.bashrc, ~/.zshrc, ~/.ssh/, ~/.gnupg/, etc.
// 5. Allow: relative paths within cwd, /tmp/* paths, paths within $HOME
//    not matching the above patterns.
// 6. Symlink resolution: canonicalize via parent-chain realpath before
//    deny-list checks, so symlinks pointing at dangerous targets are caught.

import { resolve as resolvePath, isAbsolute, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { realpathSync, existsSync } from 'node:fs';

export interface ValidateOutputPathResult {
  ok: boolean;
  resolved?: string;
  error?: string;
}

const DANGEROUS_SYSTEM_PREFIXES = [
  '/etc/',
  '/proc/',
  '/sys/',
  '/dev/',
  '/root/',
];

const DANGEROUS_USER_CONFIG_PATTERNS: RegExp[] = [
  /\/\.bashrc$/,
  /\/\.bash_profile$/,
  /\/\.zshrc$/,
  /\/\.profile$/,
  /\/\.ssh\//,
  /\/\.gnupg\//,
  /\/\.aws\//,
  /\/\.gcp\//,
  /\/\.kube\//,
  /\/\.docker\//,
  /\/\.npmrc$/,
  /\/\.netrc$/,
  /\/\.pypirc$/,
  /\/\.gitconfig$/,
  /\/\.git-credentials$/,
];

export function validateOutputPath(rawPath: string): ValidateOutputPathResult {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    return { ok: false, error: 'output_path must be a non-empty string.' };
  }

  // Reject path traversal (.. segments) on the LITERAL path.
  // Splitting on '/' or '\\' to handle both posix and Windows paths.
  const segments = rawPath.split(/[/\\]/);
  if (segments.some((seg) => seg === '..')) {
    return {
      ok: false,
      error: `Refusing to write to ${rawPath}: contains path-traversal segments (..). Use an explicit safe path.`,
    };
  }

  // Detect ~user/... (other-user home) — reject explicitly.
  // Resolving other-user homes is OS-specific and rarely needed.
  const userTildeMatch = /^~([^/]+)\//.exec(rawPath);
  if (userTildeMatch) {
    return {
      ok: false,
      error: `Refusing to write to ${rawPath}: ~user/ tilde expansion not supported. Use an absolute path or a path under your own home (~/).`,
    };
  }

  // Resolve tilde to homedir if present.
  let expanded = rawPath;
  if (rawPath.startsWith('~/') || rawPath === '~') {
    expanded = rawPath === '~' ? homedir() : `${homedir()}/${rawPath.slice(2)}`;
  }

  // Resolve to absolute path. This collapses any embedded . or encoded ..
  // segments (defense in depth — even though we rejected literal .. earlier).
  const resolvedAbsolute = isAbsolute(expanded) ? resolvePath(expanded) : resolvePath(expanded);

  // Symlink resolution: walk the parent chain to find the deepest existing
  // ancestor, realpath it, then append the remaining suffix. This catches
  // the case where ~/safe-link symlinks to /etc/passwd.
  const resolved = stripPrivatePrefix(canonicalize(resolvedAbsolute));

  // Check resolved path against deny-list patterns.
  for (const prefix of DANGEROUS_SYSTEM_PREFIXES) {
    if (resolved === prefix.slice(0, -1) || resolved.startsWith(prefix)) {
      return {
        ok: false,
        error: `Refusing to write to ${resolved}: matches dangerous system path (${prefix}). Use an explicit safe path (e.g. /tmp/<name>.stl or a path in the project directory).`,
      };
    }
  }

  // Reject user-config patterns.
  for (const pattern of DANGEROUS_USER_CONFIG_PATTERNS) {
    if (pattern.test(resolved)) {
      return {
        ok: false,
        error: `Refusing to write to ${resolved}: matches a protected user-config path (${pattern.source}). Use an explicit safe path.`,
      };
    }
  }

  return { ok: true, resolved };
}

/**
 * Undo macOS's `/private` indirection.
 *
 * On darwin, /etc, /tmp and /var are symlinks into /private. canonicalize()
 * therefore turns `/etc/passwd` into `/private/etc/passwd`, which matches
 * NONE of the DANGEROUS_SYSTEM_PREFIXES — so the deny-list silently failed
 * OPEN on every macOS host, and the symlink resolution added as defense in
 * depth was the very thing defeating it. Linux CI has no such symlinks, so
 * the whole class was invisible there.
 *
 * Mapping back to the canonical spelling is safe because the two paths name
 * the same inode: /private/etc/passwd IS /etc/passwd. Doing it here (rather
 * than widening the deny-list with /private/... twins) keeps ONE spelling
 * flowing into both the deny-list checks and the returned `resolved`.
 */
function stripPrivatePrefix(absolutePath: string): string {
  if (process.platform !== 'darwin') return absolutePath;
  for (const dir of ['etc', 'tmp', 'var']) {
    if (absolutePath === `/private/${dir}` || absolutePath.startsWith(`/private/${dir}/`)) {
      return absolutePath.slice('/private'.length);
    }
  }
  return absolutePath;
}

/**
 * Walk the parent chain to the deepest existing ancestor; realpath it;
 * append the remaining (not-yet-existing) suffix. Handles the legitimate
 * case where the agent specifies a path inside a tree that hasn't been
 * created yet (mkdir -p will create it later).
 */
function canonicalize(absolutePath: string): string {
  if (existsSync(absolutePath)) {
    return realpathSync(absolutePath);
  }
  // Walk UP until we find an existing ancestor.
  let current = absolutePath;
  const trailingParts: string[] = [];
  while (current !== '/' && current !== '.' && !existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) break; // reached root
    // basename(), NOT slice(parent.length + 1): when the parent IS root the
    // arithmetic is off by one ('/proc'.slice(2) === 'roc'), which mangled
    // every path whose top-level dir does not exist — so '/proc/self/environ'
    // canonicalized to '//roc/self/environ' and matched no deny-list prefix.
    // Invisible on Linux, where /proc, /sys and /root all exist.
    trailingParts.unshift(basename(current));
    current = parent;
  }
  if (existsSync(current)) {
    const realParent = realpathSync(current);
    // resolvePath(), NOT template interpolation: when the deepest existing
    // ancestor IS root, `${'/'}/${parts}` yields a DOUBLE leading slash
    // ('//proc/self/environ'), which startsWith('/proc/') rejects — the second
    // way this walk could hand the deny-list a path it could not recognise.
    return trailingParts.length > 0 ? resolvePath(realParent, ...trailingParts) : realParent;
  }
  // No existing ancestor found; fallback to the input (should not happen on a real FS).
  return absolutePath;
}
