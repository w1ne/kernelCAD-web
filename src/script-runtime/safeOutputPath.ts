// src/script-runtime/safeOutputPath.ts
//
// Conservative-by-default validation for MCP tool output_path arguments.
// First file-write MCP tool (export_stl, rc.15) sets the precedent for
// future writers (thumbnail, STEP-export, etc).
//
// Rules:
// 1. Reject paths containing `..` segments (path traversal).
// 2. Reject absolute paths under /etc/, /proc/, /sys/, /dev/, /root/.
// 3. Reject user-config paths: ~/.bashrc, ~/.zshrc, ~/.ssh/, ~/.gnupg/, etc.
// 4. Allow: relative paths within cwd, /tmp/* paths, paths within $HOME
//    not matching the above patterns.

import { resolve as resolvePath, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

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
];

export function validateOutputPath(rawPath: string): ValidateOutputPathResult {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    return { ok: false, error: 'output_path must be a non-empty string.' };
  }

  // Reject path traversal (.. segments).
  // Splitting on '/' or '\\' to handle both posix and Windows paths.
  const segments = rawPath.split(/[/\\]/);
  if (segments.some((seg) => seg === '..')) {
    return {
      ok: false,
      error: `Refusing to write to ${rawPath}: contains path-traversal segments (..). Use an explicit safe path.`,
    };
  }

  // Resolve tilde to homedir if present.
  let expanded = rawPath;
  if (rawPath.startsWith('~/') || rawPath === '~') {
    expanded = rawPath === '~' ? homedir() : `${homedir()}/${rawPath.slice(2)}`;
  }

  // Resolve to absolute (relative paths get resolved against cwd).
  const resolved = isAbsolute(expanded) ? expanded : resolvePath(expanded);

  // Reject dangerous system prefixes.
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
