// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { IsolationOptions, IsolationResult } from './isolation';

/**
 * Browser-safe sibling of `runIsolated` (isolation.ts) that runs a user script
 * with `new Function` instead of node `vm`, so the modern `.kcad.ts` engine can
 * execute inside the Web Worker (and node) from one code path. This is Phase 1
 * of the script-engine unification — see kernelCAD-private
 * docs/plans/2026-06-12-unify-script-engine-in-worker.md.
 *
 * Isolation note: `new Function` shares the host realm, so it is a weaker
 * sandbox than `vm.createContext`. That is acceptable on the CLIENT, where the
 * script is the user's OWN code running in their OWN tab — there is no
 * privilege boundary to defend. We still SHADOW the dangerous host globals
 * (binding them to `undefined` as function parameters) so a careless script
 * can't reach `process`/`require`/`fetch` by accident, mirroring the vm
 * runner's `STRIPPED_GLOBALS`. The multi-tenant SERVER keeps the vm runner.
 */

/** Globals shadowed to `undefined` inside the script (cannot be injected, and
 *  cannot be reached from the host realm by name). Mirrors isolation.ts. */
const SHADOWED_GLOBALS = [
  'process', 'require', 'global', 'globalThis',
  'fetch', 'XMLHttpRequest', 'WebSocket',
  'setImmediate', 'queueMicrotask',
  '__filename', '__dirname',
] as const;

/** Stateless/inert builtins copied from the host realm, matching the vm
 *  runner's exposed set so scripts behave identically under both runners. */
const SAFE_BUILTINS = [
  'Math', 'JSON', 'Date', 'Number', 'String', 'Boolean', 'Array',
  'Object', 'Map', 'Set', 'Symbol', 'console',
  'Error', 'TypeError', 'RangeError', 'Promise',
] as const;

export function runInRealm(
  code: string,
  fileName: string,
  injected: Record<string, unknown>,
  opts: IsolationOptions = {},
): IsolationResult {
  const argNames: string[] = [];
  const argValues: unknown[] = [];

  // Safe builtins first — reference the host's copies.
  const host = globalThis as unknown as Record<string, unknown>;
  for (const k of SAFE_BUILTINS) {
    argNames.push(k);
    argValues.push(host[k]);
  }

  // Injected API. Reserved names are refused exactly like the vm runner.
  const shadowed = new Set<string>(SHADOWED_GLOBALS);
  for (const [k, v] of Object.entries(injected)) {
    if (shadowed.has(k)) {
      throw new Error(`Cannot inject reserved global: ${k}`);
    }
    argNames.push(k);
    argValues.push(v);
  }

  // Shadow dangerous host globals: declare them as params bound to undefined so
  // `process`, `require`, `fetch`, … resolve to undefined inside the script.
  for (const k of SHADOWED_GLOBALS) {
    argNames.push(k);
    argValues.push(undefined);
  }

  // `//# sourceURL` gives the script a stable name in stack traces/devtools,
  // the realm equivalent of vm.Script's `filename`.
  const body = opts.wrapReturn
    ? `"use strict";\nreturn (async function() { ${code}\n})();\n//# sourceURL=${fileName}`
    : `"use strict";\n${code}\n//# sourceURL=${fileName}`;

  // eslint-disable-next-line no-new-func -- the one sanctioned realm runner.
  const fn = new Function(...argNames, body) as (...args: unknown[]) => unknown;
  const returnValue = fn(...argValues);

  return { returnValue: opts.wrapReturn ? returnValue : undefined };
}
