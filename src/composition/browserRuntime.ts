// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/browserRuntime.ts
//
// Browser script-runtime entry point. Thin composition facade over modeling's
// `runScriptInBrowser` that supplies a composed API factory. No sweep
// evaluator is bound in the browser (the implementation builds a model and
// would pull node-only modules), so `kinematic.sweepTolerance` fails at call
// time with the seam's named error — unchanged from before composition.
import {
  runScriptInBrowser as runModelingScriptInBrowser,
  type RunScriptInBrowserInput,
  type RunScriptResult,
} from '../modeling/runtime/browserRuntime';
import { createScriptApi } from './scriptApi';

export type { RunScriptInBrowserInput, RunScriptResult } from '../modeling/runtime/browserRuntime';
export { BROWSER_SCRIPT_TIMEOUT_MS } from '../modeling/runtime/browserRuntime';

export async function runScriptInBrowser(
  input: RunScriptInBrowserInput,
): Promise<RunScriptResult> {
  return runModelingScriptInBrowser({
    ...input,
    apiFactory: input.apiFactory ?? ((ctx) => createScriptApi(ctx)),
  });
}
