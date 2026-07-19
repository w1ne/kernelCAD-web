// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// NODE facade over the isomorphic script engine (`runScriptCore.ts`).
//
// This module's public surface is unchanged: `runScript({ code, fileName,
// scriptDir, runner? })` still transpiles TypeScript with the real TypeScript
// compiler and still executes inside `node:vm` with its 30 s timeout and
// context isolation. CLI, MCP and every existing test keep the exact behaviour
// they had. Browser support added alongside is purely additive and lives in
// `browserRuntime.ts`.
//
// Importing this module also INSTALLS the node host capabilities — the
// filesystem port (`referenceImage` existence checks, `lib.fromSTEP`, fonts,
// parts catalog) and the package version stamped into exported meshes. Those
// used to be plain `node:fs` / `node:module` imports buried deep in the
// modeling graph; routing them through explicit installers is what let the
// browser bundle drop them. Every node entry point reaches user scripts through
// here, so there is exactly one node door and it is this one.
import './hostFsNode';
import '../../shared/runtime/kernelcadVersionNode';

import { transpileTs } from './transpile';
import { runIsolated } from './isolation';
import { runScriptCore, type ScriptRunner, type RunScriptResult } from './runScriptCore';

export type { ScriptRunner, RunScriptResult };

export interface RunScriptInput {
  code: string;
  fileName: string;
  /** Absolute directory the script lives in. Threaded into the API context
   *  so `lib.fromSTEP('parts/foo.step')` resolves paths relative to the
   *  caller, matching how user .kcad.ts files reference sibling assets. */
  scriptDir?: string;
  /** Runner backend. Defaults to the node `vm` runner. */
  runner?: ScriptRunner;
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
  return runScriptCore({ code, fileName, scriptDir, runner, transpile: transpileTs });
}
