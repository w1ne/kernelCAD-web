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
