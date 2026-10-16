// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mechanismTruthShared.ts
//
// Types and the failure-diagnostic builder shared by the mechanism-truth
// sweep (mechanismTruth.ts) and its physics criteria (mechanismTruthPhysics.ts).

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { Transform } from '../../shared/runtime/se3';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { NumericPoses } from '../capture/forwardKinematics';

/**
 * A single-joint-at-a-time pose sample. `mateName` is `undefined` for the
 * rest-pose baseline.
 */
export interface PoseSample {
  readonly name: string;
  readonly mateName: string | undefined;
  readonly poses: NumericPoses;
}

/**
 * Per-pose solver output cache. Keeps the (sample, transforms, scene)
 * triple together so the individual criterion runs don't re-solve
 * `solvedModel` for the same pose.
 */
export interface SolvedSample {
  readonly sample: PoseSample;
  readonly transforms: ReadonlyMap<string, Transform>;
  /** Lazily computed — only loaded when criterion 2 needs the lowered
   *  scene. The solveMates pass that produces `transforms` does NOT lower
   *  BREP, so cheap criteria short-circuit before paying for the lower. */
  scene?: SceneBackend;
}

export function makeFailure(
  code:
    | 'mechanism.disconnect'
    | 'mechanism.interpenetration'
    | 'mechanism.dof-mismatch'
    | 'mechanism.orphan-part'
    | 'mechanism.unstable-under-gravity'
    | 'mechanism.drops-on-release'
    | 'mechanism.joint-mesh-gap'
    | 'mechanism.tendon-body-intersect'
    | 'mechanism.rest-interpenetration'
    | 'mechanism.mate-gap',
  message: string,
  severity: CompilerDiagnostic['severity'] = 'error',
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code,
    severity,
    message,
    hint: HINT_TEMPLATES[code].template,
    nextAction: HINT_TEMPLATES[code].nextAction,
  };
}
