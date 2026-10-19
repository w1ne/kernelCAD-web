// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/runtime/lazyTypescript.ts
//
// The `typescript` package costs ~64 MB of heap the moment it is imported.
// Node-side code (script transpile, intent lint, repair) reaches it through
// this proxy, so a process loads it on first use instead of at startup: an
// idle evaluator child that has not transpiled a script does not carry it.

import { createRequire } from 'node:module';
import type * as TS from 'typescript';

let loaded: typeof TS | undefined;

function load(): typeof TS {
  loaded ??= createRequire(import.meta.url)('typescript') as typeof TS;
  return loaded;
}

/** The `typescript` module, loaded on the first property access. */
export const lazyTs: typeof TS = new Proxy({} as typeof TS, {
  get: (_target, key) => (load() as unknown as Record<PropertyKey, unknown>)[key],
});
