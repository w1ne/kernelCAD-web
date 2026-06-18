// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/checkInterference.ts
//
// Script-aware wrapper around the pure detection routine. Runs a script
// to resolve a SceneBackend, then defers to `detectInterferences` in
// modeling/runtime/. Lives in agent/ because it imports authoring/
// (Scene) to recognize a Scene return value; modeling/ may not import
// authoring/, so the wrapper sits one tier up while the pure routine
// stays in modeling/.

import { runScript } from '../../modeling/runtime/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { Shape } from '../../modeling/capture/proxy';
import { Scene } from '../../modeling/validation/scene';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import {
  detectInterferences,
  pairKey,
  type CheckInterferenceResult,
  type InterferencePair,
} from '../../modeling/runtime/detectInterferences';

// Re-export the pure-detection surface so existing
// `agent/script-runtime/checkInterference` consumers keep their
// `detectInterferences`, `pairKey`, and `InterferencePair` imports.
export { detectInterferences, pairKey };
export type { CheckInterferenceResult, InterferencePair };

export interface CheckInterferenceInput {
  readonly code: string;
  readonly fileName: string;
  /** Absolute directory of the source script. Threaded so `lib.fromSTEP`
   *  resolves relative paths. */
  readonly scriptDir?: string;
  /** Volume threshold below which an intersection is treated as "touching"
   *  rather than "interfering". Default 0.01 mm³ — small enough to surface
   *  any meaningful overlap, large enough to ignore numerical artifacts on
   *  faces that share a plane. */
  readonly epsilonMm3?: number;
  /** Optional ignore-list of `${a}\t${b}` (sorted lexicographically) strings.
   *  Pairs in this set are skipped — useful for parts that touch by design. */
  readonly ignorePairs?: ReadonlySet<string>;
}

const DEFAULT_EPSILON_MM3 = 0.01;

/** Resolve the script to a SceneBackend, then detect interferences. Returns
 *  an empty `pairs` array when the script doesn't produce a Scene. */
export async function checkInterference(
  input: CheckInterferenceInput,
): Promise<CheckInterferenceResult> {
  const epsilon = input.epsilonMm3 ?? DEFAULT_EPSILON_MM3;
  const ignored = input.ignorePairs ?? new Set<string>();

  const run = await runScript({
    code: input.code,
    fileName: input.fileName,
    scriptDir: input.scriptDir,
  });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const fatal = r.diagnostics.filter((d: CompilerDiagnostic) => d.severity === 'error');
  if (fatal.length > 0) {
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics };
  }

  // Resolve the target feature id the same way runAndExport does for STEP.
  let targetId: string | undefined;
  const ret = run.returnValue;
  if (ret instanceof Shape) targetId = ret.id;
  else if (ret instanceof Scene) targetId = ret.__sourceFeatureId();
  else if (run.records.length > 0) targetId = run.records[run.records.length - 1].id;

  if (!targetId) {
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics };
  }

  const lowered = r.shapes.get(targetId);
  if (!lowered || !isSceneBackend(lowered)) {
    // Not an assembly — nothing to clash. Caller decides whether this is an
    // error or a no-op via the empty `pairs` array + `partCount: 0`.
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics };
  }
  return detectInterferences(lowered, epsilon, ignored, r.diagnostics);
}
