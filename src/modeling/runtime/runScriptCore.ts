// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The ISOMORPHIC body of `runScript`. Everything here is runtime-agnostic: it
// takes the two host-specific pieces — how to turn source into runnable
// JavaScript (`transpile`) and how to execute it (`runner`) — as REQUIRED
// arguments, so neither node nor the browser is the privileged default.
//
// Two thin facades sit on top and pick those pieces:
//   - `runScript.ts`    node: `transpileTs` (typescript) + `runIsolated` (vm)
//   - `browserRuntime.ts` browser: JS pass-through + `runInRealm` (new Function)
//
// Keeping the shared logic in one place is what makes the browser engine the
// SAME engine rather than a lookalike: normalization, the API construction, the
// `kc` alias and the async-return unwrapping all happen here exactly once.

import { CaptureSession } from '../capture/captureSession';
import type { ApiContext, KernelCadApi } from '../api';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { KernelError } from '../../shared/intent/kernelError';
import { findTopLevelImport, normalizeUserScript } from '../../shared/runtime/normalizeUserScript';
import { NO_WRAP_OFFSET, type IsolationOptions, type IsolationResult, type ScriptWrapOffset } from './isolationTypes';
import { ScriptLocationResolver } from './scriptLocationCapture';

/** Pluggable script runner. `runIsolated` (node `vm`) backs the node facade;
 *  `runInRealm` (new Function) backs the browser facade. */
export type ScriptRunner = (
  code: string,
  fileName: string,
  injected: Record<string, unknown>,
  opts?: IsolationOptions,
) => IsolationResult;

export interface TranspileOutput {
  code: string;
  sourceMap?: string;
}

/** Pluggable source-to-JavaScript step. Node uses the TypeScript compiler;
 *  the browser uses a pass-through that refuses TypeScript syntax loudly
 *  rather than shipping a 3.4 MB compiler. */
export type ScriptTranspiler = (source: string, fileName: string) => TranspileOutput;

/**
 * Builds the script-facing API for one evaluation. REQUIRED at the core so a
 * caller can never silently evaluate a script against a partial surface: the
 * composition layer owns the factory that attaches the cross-layer namespaces
 * (`kc.kinematic.*`) and their wiring. Modeling's own facade passes
 * `createModelingApi`; the composition facade passes `createScriptApi`.
 */
export type ScriptApiFactory = (ctx: ApiContext) => KernelCadApi;

export interface RunScriptCoreInput {
  code: string;
  fileName: string;
  /** Absolute directory the script lives in. Threaded into the API context
   *  so `lib.fromSTEP('parts/foo.step')` resolves paths relative to the
   *  caller, matching how user .kcad.ts files reference sibling assets. */
  scriptDir?: string;
  runner: ScriptRunner;
  transpile: ScriptTranspiler;
  /** Script-API construction — see `ScriptApiFactory`. Required. */
  apiFactory: ScriptApiFactory;
  /** Displacement the chosen runner's `wrapReturn` prologue applies to
   *  call-site positions. Supplied by the facade that picked the runner;
   *  defaults to identity so a bare core call still runs. */
  wrapOffset?: ScriptWrapOffset;
}

export interface RunScriptResult {
  records: readonly FeatureRecord[];
  /** Capture session that owns the records and ParamTable. MCP keeps this as
   *  the active session for post-build params.list / params.update. */
  session: CaptureSession;
  /** The session's param table, populated by `kcad.param()` / `kcad.params()`
   *  declarations during script execution. Threaded into RecomputeEngine so
   *  symbolic FeatureRecord params resolve at lower time. */
  paramTable: ParamTable;
  returnValue: unknown;
}

export async function runScriptCore(input: RunScriptCoreInput): Promise<RunScriptResult> {
  const { code, fileName, scriptDir, runner, transpile, apiFactory, wrapOffset = NO_WRAP_OFFSET } = input;

  // Refuse top-level imports BEFORE the normalizer strips them. A stripped
  // `import` leaves the imported binding undefined, so the script dies
  // mid-evaluation with a bare `ReferenceError: <name> is not defined`.
  // Bundling local modules is out of scope, but the failure must not be
  // silent: fail fast with the same structured `feature.invalid-args` code
  // every other capture-time API misuse uses.
  const importStatement = findTopLevelImport(code);
  if (importStatement !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `local imports are not supported in .kcad.ts — define helpers in the same file (imports are stripped before execution). Found: ${importStatement}`,
      undefined,
      'Move the imported helper into this .kcad.ts file. The kernelCAD API (box, path, assembly, …) and the lib.* loaders are injected as globals — no import needed.',
    );
  }

  const session = new CaptureSession();
  session.scriptDir = scriptDir;
  const api = apiFactory({ session, scriptDir });

  // Agent-authored scripts are idiomatic ES modules: they end with
  // `export default <model>`, use `export const`, or carry top-level `import`s.
  // The runtime wraps the body in an IIFE and captures the top-level `return`,
  // so module syntax is a SyntaxError ("Unexpected token 'export'"). Rewrite
  // module-isms into function-body statements first — `export default <expr>`
  // becomes the `return <expr>` the IIFE expects.
  const normalized = normalizeUserScript(code);

  const transpiled = transpile(normalized, fileName);

  // Bind every captured feature to the line that authored it. The resolver
  // owns both rewrites between the agent's file and the text V8 executes
  // (module-ism normalization, then transpile), so `FeatureRecord.scriptLocation`
  // comes out in original-file coordinates — the join key trace-guided repair
  // needs to turn "feature X failed" into "these lines may be edited".
  session.scriptLocationResolver = new ScriptLocationResolver(
    fileName,
    code,
    transpiled.sourceMap,
    wrapOffset,
  );

  // Two surface forms are supported inside `.kcad.ts` scripts:
  //   - Top-level globals (`box(...)`, `q.face(...)`) via the api spread.
  //   - The `kc` namespace alias (`kc.box(...)`, `kc.q.face(...)`) used by
  //     SKILL.md prose. Both reach the same underlying api object.
  const apiGlobals = {
    ...(api as unknown as Record<string, unknown>),
    kc: api,
  };

  const result = runner(transpiled.code, fileName, apiGlobals, { wrapReturn: true });

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
