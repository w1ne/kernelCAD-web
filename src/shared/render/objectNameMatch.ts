// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/render/objectNameMatch.ts
//
// Object-name matching shared by the render `--focus/--hide` filter and
// animation appearance-track targets: case-insensitive exact match, or a
// `*` / `?` wildcard pattern. Pure: no three.js.

export function wildcardMatches(pattern: string, text: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(text);
}

export function objectMatches(names: readonly string[], patterns: readonly string[]): boolean {
  return patterns.some((pattern) =>
    names.some((name) =>
      pattern.includes('*') || pattern.includes('?')
        ? wildcardMatches(pattern, name)
        : name.toLowerCase() === pattern.toLowerCase(),
    ),
  );
}
