// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { Scene } from '../validation/scene';
import { buildMateMetadata, makeScene } from './assemblySolve';
import type { AssemblyState } from './assemblyTypes';

/**
 * Records an `assemblyModel` FeatureRecord that captures the parts and
 * (when the assembly declares any `arm.mate(...)` records) the v0.6 mate
 * graph + connectors those mates reference, then returns the capture-time
 * `Scene` view — see `makeScene` in `assemblySolve.ts` for the per-part
 * data and precedence rules.
 */
export function recordModel(state: AssemblyState): Scene {
  if (state.parts.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'assembly.model requires at least one part.',
      undefined,
      'Call assembly.part(name, shape, opts?) before assembly.model().',
    );
  }
  const mateMetadata = state.mates.length > 0 ? buildMateMetadata(state) : undefined;
  const sceneShape = state.session.assemblyModel(state.name, state.parts, mateMetadata);
  return makeScene(state, sceneShape);
}
