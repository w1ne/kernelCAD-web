// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { normalizeUserScript } from '../../shared/runtime/normalizeUserScript';
import { transpileTs } from './transpile';
import { runIsolated, type IsolationOptions, type IsolationResult } from './isolation';

/** Pluggable script runner. `runIsolated` (node `vm`) is the default; the
 *  browser worker passes `runInRealm` (new Function) so the SAME engine runs
 *  client-side. See kernelCAD-private docs/plans/2026-06-12-unify-script-engine-in-worker.md. */
export type ScriptRunner = (
  code: string,
  fileName: string,
  injected: Record<string, unknown>,
  opts?: IsolationOptions,
) => IsolationResult;

export interface RunScriptInput {
  code: string;
  fileName: string;
  /** Absolute directory the script lives in. Threaded into the API context
   *  so `lib.fromSTEP('parts/foo.step')` resolves paths relative to the
   *  caller, matching how user .kcad.ts files reference sibling assets. */
  scriptDir?: string;
  /** Runner backend. Defaults to the node `vm` runner; the browser worker
   *  injects the `new Function` realm runner so one engine serves both. */
  runner?: ScriptRunner;
}

export interface RunScriptResult {
  records: readonly FeatureRecord[];
  /** Capture session that owns the records and ParamTable. MCP keeps this as
   *  the active session for post-build params.list / params.update. */
  session: CaptureSession;
  /** Slice-3: the session's param table, populated by `kcad.param()` /
   *  `kcad.params()` declarations during script execution. Threaded into
   *  RecomputeEngine so symbolic FeatureRecord params resolve at lower time. */
  paramTable: ParamTable;
  returnValue: unknown;
}

/**
 * Execute a `.kcad.ts` user script end-to-end:
 *   1. transpile TypeScript → ES2022 JavaScript,
 *   2. run inside an isolated `vm` context with the kernelCAD API injected
 *      as the only mutable globals, and
 *   3. return the captured `FeatureRecord`s, the session's `ParamTable`,
 *      and whatever the script `return`ed (typically the root `Shape`).
 *
 * The script's top-level `return` is captured via `wrapReturn` — the script
 * body is wrapped in an IIFE inside the sandbox.
 */
export async function runScript(input: RunScriptInput): Promise<RunScriptResult> {
  const { code, fileName, scriptDir, runner = runIsolated } = input;
  const session = new CaptureSession();
  session.scriptDir = scriptDir;
  const api = createApi({ session, scriptDir });

  // Agent-authored scripts are idiomatic ES modules: they end with
  // `export default <model>`, use `export const`, or carry top-level `import`s.
  // The runtime wraps the body in an IIFE (`wrapReturn`) and captures the
  // top-level `return`, so module syntax is a SyntaxError ("Unexpected token
  // 'export'"). Rewrite module-isms into function-body statements first —
  // `export default <expr>` becomes the `return <expr>` the IIFE expects.
  const normalized = normalizeUserScript(code);

  const transpiled = transpileTs(normalized, fileName);

  // Two surface forms are supported inside `.kcad.ts` scripts:
  //   - Top-level globals (`box(...)`, `q.face(...)`) via the api spread.
  //   - The `kc` namespace alias (`kc.box(...)`, `kc.q.face(...)`) used by
  //     SKILL.md prose. Both reach the same underlying api object.
  // Q6 wires the Query DSL constructors (`q`) onto the api so agents can
  // call `q.face(...)` from a model script without an explicit import.
  const apiGlobals = {
    ...(api as unknown as Record<string, unknown>),
    kc: api,
  };

  const result = runner(
    transpiled.code,
    fileName,
    apiGlobals,
    { wrapReturn: true },
  );

  // The script body is wrapped in an async IIFE — returnValue may be a Promise.
  let returnValue = result.returnValue;
  if (returnValue && typeof (returnValue as { then?: unknown }).then === 'function') {
    returnValue = await (returnValue as Promise<unknown>);
  }
  return {
    records: session.getRecords(),
    session,
    paramTable: session.paramTable,
    returnValue,
  };
}
