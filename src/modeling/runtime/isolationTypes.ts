// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The runner CONTRACT, split out from `isolation.ts` so the isomorphic core
// can reference it without importing `node:vm`. `isolation.ts` (node) and
// `realmRunner.ts` (browser) both implement this shape.

export interface IsolationOptions {
  /** Wrap script in `(function() { ... })()` so a top-level `return` works. */
  wrapReturn?: boolean;
}

export interface IsolationResult {
  returnValue: unknown;
}

/**
 * How much a runner's `wrapReturn` prologue displaces the user's code inside
 * the text the engine actually executes.
 *
 * Both runners wrap the script body in an async IIFE, so a V8 call-site frame
 * reports positions in the WRAPPED text. Anything that maps a frame back to
 * the authored file — feature call sites, repair regions — has to undo that
 * displacement first, and only the runner knows its own prologue.
 */
export interface ScriptWrapOffset {
  /** Lines of prologue before the user's first line. */
  lineOffset: number;
  /** Columns of prologue before the user's first line, on that line only. */
  firstLineColumnOffset: number;
}

/** Identity offset — the shape to use when the body is not wrapped. */
export const NO_WRAP_OFFSET: ScriptWrapOffset = { lineOffset: 0, firstLineColumnOffset: 0 };

/** Derive the offset a literal prologue string produces. */
export function wrapOffsetOf(prologue: string): ScriptWrapOffset {
  const lastNewline = prologue.lastIndexOf('\n');
  return {
    lineOffset: lastNewline < 0 ? 0 : prologue.slice(0, lastNewline + 1).split('\n').length - 1,
    firstLineColumnOffset: prologue.length - (lastNewline + 1),
  };
}
