// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/scriptApi.ts
//
// The script-API composition root: modeling's API surface plus the kinematic
// namespace, with `kc.kinematic.sweepTolerance` bound to the injected
// script evaluator.
//
// Why this exists: `sweepTolerance` must re-evaluate a script per swept combo,
// and the only implementation of that lives above modeling (it builds a full
// model and runs the DFM/FEA gates). Kinematic cannot import that layer
// (layering + module cycles), so kinematic declares a `SweepEvaluator` seam and
// composition — which sits above both — supplies the implementation at
// API-construction time. A script can only run through a facade that passes a
// factory, so it can never silently observe a partial `kc.*` surface.
import type { ApiContext, KernelCadApi } from '../modeling/api';
import { createApi } from '../modeling/api';
import * as kinematic from '../kinematic';
import type {
  KinematicFacade,
  SweepToleranceResult,
  SweepEvaluator,
} from '../kinematic/types';
import type { SweepToleranceInput } from '../kinematic/sweepTolerance';

/** `kc.kinematic` as user scripts see it: the kinematic facade plus the
 *  tolerance sweep (the facade interface itself predates the sweep). */
export interface ScriptKinematicFacade extends KinematicFacade {
  sweepTolerance(input: SweepToleranceInput): Promise<SweepToleranceResult>;
}

/** The full script-facing API: modeling's surface with the composed
 *  kinematic namespace attached. */
export type ScriptApi = Omit<KernelCadApi, 'kinematic'> & {
  kinematic: ScriptKinematicFacade;
};

/**
 * Build the script-facing API. With no evaluator, `sweepTolerance` resolves
 * the seam at call time and fails loudly (`no script evaluator is available`)
 * — the browser facade's behavior, unchanged. The node facades pass
 * `defaultSweepEvaluator`, so every script they run can sweep.
 */
export function createScriptApi(ctx: ApiContext, evaluator?: SweepEvaluator): ScriptApi {
  const api = createApi(ctx);
  const facade: ScriptKinematicFacade = {
    ...api.kinematic,
    sweepTolerance: (input) => kinematic.sweepTolerance(input, evaluator),
  };
  return { ...api, kinematic: facade };
}
