// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared marker-delimited section rewriter for generated doc blocks.
//
// Extracted from scripts/buildCookbookIndex.ts when a second generator
// (buildOutOfScopeSection.ts) needed the same logic. One copy, two callers —
// a forked rewriter would let the two blocks drift in exactly the way the
// Out of Scope registry exists to prevent.
//
// Pure string -> string so it is unit-testable without touching disk; callers
// own their own IO.

export interface RewriteResult {
  changed: boolean;
  after: string;
}

/**
 * Replace the content between `startMarker` and `endMarker` with `generated`.
 *
 * Throws when the markers are missing or inverted — a generator that silently
 * no-ops on a malformed file is how a stale block survives a green CI run.
 *
 * `label` names the target file in error messages.
 */
export function rewriteMarkedSection(
  source: string,
  generated: string,
  startMarker: string,
  endMarker: string,
  label: string,
): RewriteResult {
  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `${label} is missing ${startMarker} / ${endMarker} markers. Insert them before running this generator.`,
    );
  }
  if (endIdx < startIdx) {
    throw new Error(`${label}: ${endMarker} appears before ${startMarker}`);
  }
  const head = source.slice(0, startIdx + startMarker.length);
  const tail = source.slice(endIdx);
  const after = `${head}\n${generated}\n${tail}`;
  return { changed: after !== source, after };
}
