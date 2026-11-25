// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time option for `Sketch.sweep(rail, { bendRadius })`: replaces each
// polyline corner with a tangent arc before the sweep. Kept out of sketch.ts
// so the optional branch and its validation do not grow the sweep method.
import type { CaptureSession } from './captureSession';
import type { FeatureId, Param, Vec3 } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { paramValue, toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import { buildTubePath, isTubePathError } from '../../shared/tube/tubePath';

const API = 'Sketch.sweep(rail, { bendRadius })';
const EXAMPLE = "path().circle(0, 0, 4).sweep([[0, 0, 0], [30, 0, 0], [30, 30, 0]], { bendRadius: 6 })";

/** Validate and box `opts.bendRadius`; `undefined` when the option is absent. */
export function sweepBendRadiusParam(
  session: CaptureSession,
  featureId: FeatureId,
  value: Editable<number> | undefined,
  rail: Vec3[],
  spine: 'polyline' | 'smooth' | 'helix',
  transitionMode: 'right' | 'transformed' | 'round',
): Param | undefined {
  if (value === undefined) return undefined;
  if (spine !== 'polyline') {
    invalidArgs({
      api: API,
      path: 'opts.spine',
      gotText: `'${spine}' with bendRadius`,
      requires: "spine: 'polyline' (the default); a smooth or helix spine has no polyline corner to replace",
      example: EXAMPLE,
      featureId,
    });
  }
  if (transitionMode !== 'right') {
    invalidArgs({
      api: API,
      path: 'opts.transitionMode',
      gotText: `'${transitionMode}' with bendRadius`,
      requires: "the default transitionMode 'right'; bendRadius already makes every corner a tangent arc",
      example: EXAMPLE,
      featureId,
    });
  }
  const bendRadius = toParam(value, 'mm');
  const resolved = paramValue(bendRadius, session.paramTable);
  if (!Number.isFinite(resolved) || resolved <= 0) {
    invalidArgs({
      api: API,
      path: 'opts.bendRadius',
      got: resolved,
      requires: 'a positive finite centreline radius in mm',
      unit: 'mm',
      example: EXAMPLE,
      featureId,
    });
  }
  const path = buildTubePath(rail.map((p) => [...p] as [number, number, number]), resolved);
  if (isTubePathError(path)) {
    if (path.kind === 'unreachable') {
      invalidArgs({
        api: API,
        path: `rail leg ${path.leg}`,
        gotText: `a leg ${path.missingMm.toFixed(2)} mm too short for the bends at its ends`,
        requires: `the leg at least ${path.missingMm.toFixed(2)} mm longer, or a smaller bendRadius`,
        unit: 'mm',
        example: EXAMPLE,
        featureId,
      });
    }
    invalidArgs({
      api: API,
      path: path.kind === 'reversal' ? `rail corner ${path.corner}` : 'rail',
      gotText: path.kind === 'reversal'
        ? 'a rail that folds straight back on itself'
        : 'fewer than two distinct rail points',
      requires: path.kind === 'reversal'
        ? 'the next corner offset sideways'
        : 'at least two distinct [x, y, z] points',
      example: EXAMPLE,
      featureId,
    });
  }
  return bendRadius;
}

/** Params contribution for the sweep record; an absent option adds no key. */
export function bendRadiusParams(bendRadius: Param | undefined): { bendRadius?: Param } {
  if (bendRadius === undefined) return {};
  return { bendRadius };
}
