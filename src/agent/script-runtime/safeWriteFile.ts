// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/safeWriteFile.ts
//
// Symlink- and swap-safe file writes for MCP tools that write several files
// into a caller-chosen directory.
//
// - The protected-path policy (validateOutputPath) is applied to the file path
//   AND to the real path of its parent folder, so a parent that is (or is
//   swapped for) a symlink into a protected location is refused.
// - An existing symlink or non-regular file at the destination is refused.
// - Data goes to a fresh temp file created with O_CREAT | O_EXCL | O_NOFOLLOW
//   inside the verified real parent folder, so an existing file, hardlink or
//   planted symlink is never opened or truncated. The temp file is then renamed
//   over the destination by its real-folder path: rename replaces the directory
//   entry, so other hardlinks to the old file keep their contents.
// - Before the rename the parent's real path and the temp file's identity are
//   re-checked; a folder swapped mid-write aborts the write and the temp file
//   is removed.

import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath, rename, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
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

/** Resolve and verify the real parent folder of `path`. */
async function verifiedParent(path: string): Promise<{ dir: string } | string> {
  let dir: string;
  try {
    dir = await realpath(dirname(path));
  } catch (e) {
    return `Cannot resolve ${dirname(path)}: ${(e as Error).message}`;
  }
  const check = validateOutputPath(join(dir, basename(path)));
  if (!check.ok) return check.error ?? `Refusing to write to ${path}.`;
  try {
    const st = await lstat(dir);
    if (!st.isDirectory()) return `Refusing to write to ${path}: its folder is not a directory.`;
  } catch (e) {
    return `Cannot inspect ${dir}: ${(e as Error).message}`;
  }
  return { dir };
}

export interface SafeWriteResult {
  /** Set when the write failed or was refused. */
  error?: string;
  /** True when no file existed at the destination before this write. */
  created?: boolean;
  /** Identity of the file this write put in place (for safe cleanup). */
  dev?: number;
  ino?: number;
  /** Real path of the written file. */
  realPath?: string;
}

/** Write `data` to `path` atomically without following or truncating anything. */
export async function safeWriteFileDetailed(path: string, data: string | Uint8Array): Promise<SafeWriteResult> {
  const bad = await checkWritableDestination(path);
  if (bad !== undefined) return { error: bad };
  const parent = await verifiedParent(path);
  if (typeof parent === 'string') return { error: parent };
  const finalReal = join(parent.dir, basename(path));
  let existed = true;
  try {
    const st = await lstat(finalReal);
    if (!st.isFile()) return { error: `Refusing to write to ${path}: it exists and is not a regular file.` };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') return { error: `Cannot inspect ${path}: ${(e as Error).message}` };
    existed = false;
  }
  const tmp = join(parent.dir, `.${basename(path)}.${randomBytes(6).toString('hex')}.tmp`);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  let ident: { dev: number; ino: number };
  try {
    const fh = await open(tmp, flags, 0o644);
    try {
      await fh.writeFile(data);
      const st = await fh.stat();
      ident = { dev: st.dev, ino: st.ino };
    } finally {
      await fh.close();
    }
  } catch (e) {
    await unlink(tmp).catch(() => undefined);
    return { error: `Cannot write to ${path}: ${e instanceof Error ? e.message : String(e)}` };
  }
  try {
    const again = await realpath(dirname(path));
    const tst = await lstat(tmp);
    if (again !== parent.dir || tst.dev !== ident.dev || tst.ino !== ident.ino) {
      await unlink(tmp).catch(() => undefined);
      return { error: `Refusing to write to ${path}: its folder changed during the write.` };
    }
    await rename(tmp, finalReal);
  } catch (e) {
    await unlink(tmp).catch(() => undefined);
    return { error: `Cannot write to ${path}: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { created: !existed, ...ident, realPath: finalReal };
}

/** Write `data` to `path` safely. Returns an error message, or undefined on success. */
export async function safeWriteFile(path: string, data: string | Uint8Array): Promise<string | undefined> {
  return (await safeWriteFileDetailed(path, data)).error;
}

/** Remove a file only if it is still the exact file a successful safe write created. */
export async function removeIfCreated(result: SafeWriteResult): Promise<void> {
  if (result.error !== undefined || result.created !== true || result.realPath === undefined) return;
  try {
    const st = await lstat(result.realPath);
    if (st.isFile() && st.dev === result.dev && st.ino === result.ino) await unlink(result.realPath);
  } catch {
    // already gone
  }
}
