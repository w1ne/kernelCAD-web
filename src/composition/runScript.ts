// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/runScript.ts
//
// Node script-runtime entry point. Thin composition facade over modeling's
// `runScript` that supplies the composed API factory, so the script sees the
// full `kc.*` surface (`kinematic.sweepTolerance` included) with no
// registration step and no per-caller wiring.
//
// Importing this module also installs the node host capabilities through
// modeling's facade (`hostFsNode` + `kernelcadVersionNode`).
import {
  runScript as runModelingScript,
  type RunScriptInput,
  type RunScriptResult,
} from '../modeling/runtime/runScript';
import { composedApiFactory } from './scriptEvaluation';

export type { RunScriptInput, RunScriptResult } from '../modeling/runtime/runScript';
export type { ScriptRunner } from '../modeling/runtime/runScriptCore';

export async function runScript(input: RunScriptInput): Promise<RunScriptResult> {
  return runModelingScript(input, { apiFactory: composedApiFactory });
}
