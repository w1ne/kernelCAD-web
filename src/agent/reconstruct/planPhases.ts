// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/planPhases.ts
//
// Phase implementations for buildPlan (src/agent/reconstruct/plan.ts): fitted-loop
// geometry helpers, the axisymmetric/extruded body builder, the face book, the
// axis-hole and cross-bore run decomposers, the cutout-run grouping and emission,
// and the drill grouping and emission. Split out of plan.ts purely to keep that
// file under the file-length ratchet; behaviour is unchanged.

export {
  DEG,
  type BandLoops,
  type BodyPlan,
  type EntrySideAssumption,
  type FaceRef,
  type FeaturePlan,
  type LoopOut,
  type Op,
  type OutlineKind,
  type ParamDecl,
  type PassParams,
  type ProfileOut,
  type RoundsKind,
} from './planPhases/shared';

export {
  buildBody,
  buildFaceBook,
  cloneLoop,
  loopGuide,
  loopPolygon,
  nestingDepth,
  sharpenFilletArcs,
  shiftLoop,
} from './planPhases/body';

export {
  buildAxisHoleRuns,
  buildCrossBores,
  buildCutoutRuns,
  decomposeRun,
} from './planPhases/runs';

export {
  emitCutoutOps,
  emitDrillOps,
} from './planPhases/ops';

export type { Drill } from './decomposeRunPhases';
