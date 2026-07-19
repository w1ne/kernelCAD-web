// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure, dependency-free path helpers.
//
// These exist so browser-reachable modules can do trivial path inspection
// (what extension is this?) without importing `node:path`. They are NOT a
// general path library — anything that has to resolve against a real
// filesystem goes through the host-fs port (`hostFs.ts`) instead.

/**
 * Extension of a path INCLUDING the leading dot, or `''` when there is none.
 * Matches `node:path`'s `extname` for the cases we care about: a dot that is
 * the first character of the basename is not an extension (`.gitignore`), and
 * only the last dot counts (`a.tar.gz` -> `.gz`).
 */
export function extname(p: string): string {
  const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  const base = lastSlash >= 0 ? p.slice(lastSlash + 1) : p;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot);
}
