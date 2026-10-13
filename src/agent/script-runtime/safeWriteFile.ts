// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/safeWriteFile.ts
//
// Symlink-safe file writes for MCP tools that write several files into a
// caller-chosen directory. Every destination is checked on its own, not just
// the directory: the protected-path policy (validateOutputPath) is applied to
// the file path, an existing symlink or non-regular file is refused, and the
// file is opened with O_NOFOLLOW so a symlink swapped in between the check
// and the open is still refused by the kernel.

import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { validateOutputPath } from './safeOutputPath';

/** Undefined when `path` may be written; otherwise the reason it may not. */
export async function checkWritableDestination(path: string): Promise<string | undefined> {
  const check = validateOutputPath(path);
  if (!check.ok) return check.error ?? `Refusing to write to ${path}.`;
  try {
    const st = await lstat(path);
    if (st.isSymbolicLink()) return `Refusing to write to ${path}: it is a symbolic link.`;
    if (!st.isFile()) return `Refusing to write to ${path}: it exists and is not a regular file.`;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') return `Cannot inspect ${path}: ${(e as Error).message}`;
  }
  return undefined;
}

/** Write `data` to `path` without following symlinks. Returns an error message, or undefined on success. */
export async function safeWriteFile(path: string, data: string | Uint8Array): Promise<string | undefined> {
  const bad = await checkWritableDestination(path);
  if (bad !== undefined) return bad;
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0);
  try {
    const fh = await open(path, flags, 0o644);
    try {
      await fh.writeFile(data);
    } finally {
      await fh.close();
    }
  } catch (e) {
    return `Cannot write to ${path}: ${e instanceof Error ? e.message : String(e)}`;
  }
  return undefined;
}
