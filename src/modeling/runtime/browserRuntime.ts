// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// BROWSER facade over the isomorphic script engine (`runScriptCore.ts`).
//
// This is the entry point that makes kernelCAD's MODERN script API — `path()`,
// `assembly()`, `q`/`select*`, `nurbsCurve`, patterns, `param()` returning a
// real ParamRef — evaluate client-side with no network round-trip. Before this,
// the in-browser worker injected 11 hand-picked v0.1 globals and everything
// else had to go to a node backend.
//
// It is the SAME engine as node: same `createApi`, same capture session, same
// normalization, same FeatureRecords out. Only two pieces differ, and both are
// injected rather than branched on:
//
//   transpile  JS pass-through instead of the TypeScript compiler.
//              See browserTranspile.ts — the compiler measures 3.40 MB raw /
//              0.97 MB gzipped, so TS syntax is refused by name instead.
//
//   runner     `runInRealm` (new Function) instead of `runIsolated` (node:vm).
//
// ------------------------------------------------------------------------
// WHAT THE REALM RUNNER LOSES vs node:vm — read before assuming parity
// ------------------------------------------------------------------------
// 1. NO EXECUTION TIMEOUT. `vm.Script.runInContext` takes `{ timeout: 30_000 }`
//    and the node runner uses it. `new Function` has no equivalent: there is no
//    way to interrupt synchronous JavaScript from inside the same realm. A
//    script containing `while (true) {}` WILL hang whatever thread runs it.
//    This is not mitigated here and cannot be. It is mitigated by the HOST:
//    run this inside a dedicated Web Worker and have the page enforce the
//    deadline with `worker.terminate()`, which is the only real interrupt the
//    platform offers. `BROWSER_SCRIPT_TIMEOUT_MS` below is exported as the
//    recommended budget so the host and the node runner agree on 30 s.
//    Calling `runScriptInBrowser` on the main thread means a runaway script
//    freezes the tab.
//
// 2. NO REALM ISOLATION. `vm.createContext` gives the script a fresh global
//    object; `new Function` shares the page's realm, so host intrinsics are
//    reachable by prototype walking regardless of what we shadow. The realm
//    runner shadows the dangerous names (`process`, `require`, `fetch`, …) so
//    accidents are caught, but a script that WANTS out can get out.
//    This is acceptable exactly where it is used and nowhere else: in the
//    browser the script is the user's own code running in the user's own tab
//    against their own session — there is no privilege boundary to defend.
//    The multi-tenant server path keeps `node:vm`, and must continue to:
//    do not swap `runIsolated` for `runInRealm` on any server.

import { runInRealm } from './realmRunner';
import { transpileBrowser } from './browserTranspile';
import {
  runScriptCore,
  type ScriptRunner,
  type ScriptTranspiler,
  type RunScriptResult,
} from './runScriptCore';

export type { ScriptRunner, ScriptTranspiler, RunScriptResult };

/**
 * Recommended wall-clock budget for a browser script run, matching the node
 * runner's `vm` timeout. The runtime cannot enforce this itself (see note 1
 * above) — the host must, by terminating the worker.
 */
export const BROWSER_SCRIPT_TIMEOUT_MS = 30_000;

export interface RunScriptInBrowserInput {
  code: string;
  fileName?: string;
  /** Nominal directory for script-relative asset paths. Filesystem-backed
   *  features are unavailable in the browser regardless (they throw a named
   *  diagnostic), but the value is still threaded through for parity. */
  scriptDir?: string;
  /** Override the runner. Defaults to `runInRealm`. */
  runner?: ScriptRunner;
  /** Override the transpiler. Pass `transpileTs` from './transpile' to opt into
   *  full TypeScript support at a measured 3.40 MB / 0.97 MB gzipped. */
  transpile?: ScriptTranspiler;
}

/**
 * Evaluate a kernelCAD script in a browser (or any runtime without node
 * builtins) and return the captured FeatureRecords, ParamTable and return
 * value — the same `RunScriptResult` the node `runScript` produces.
 *
 * Features that need a filesystem (`lib.fromSTEP`, `lib.fromSTL`,
 * `lib.fetchPart`, `lib.standard.*`, `referenceImage`, custom TTF fonts) are
 * NOT silently skipped: each throws or reports a `cli.host-fs-unavailable`
 * diagnostic naming the call and why it cannot run here.
 */
export async function runScriptInBrowser(
  input: RunScriptInBrowserInput,
): Promise<RunScriptResult> {
  const {
    code,
    fileName = 'script.kcad.js',
    scriptDir,
    runner = runInRealm,
    transpile = transpileBrowser,
  } = input;
  return runScriptCore({ code, fileName, scriptDir, runner, transpile });
}
