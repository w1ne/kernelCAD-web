// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/capture/smoothSplineTangents.ts
//
// End tangents of a `smoothSpline` segment.
//
// A `smoothSpline` is one cubic Bézier. Its end tangent is the sketch +X
// direction unless the command states one. Its start tangent is the end
// tangent of the previous segment; when there is no previous pen edge (the
// segment follows `moveTo`, or a NURBS segment that ends the pen run) the
// start tangent is the sketch +X direction too.
//
// Those +X defaults are fixed to the sketch frame, so a transform that turns
// or mirrors the profile must write the mapped direction into the command.
// `mapSmoothSplineTangents` does that for every command-list transform
// (reflect, translate / rotate / scale, loft section rotation).

import type { Param } from '../intent/types';
import type { SketchCommand } from './sketchCommand';
import { toParam } from '../runtime/editableHelpers';

type SmoothSplineCommand = Extract<SketchCommand, { kind: 'smoothSpline' }>;
type ParamVec = { x: Param; y: Param };

/** Kinds that leave no pen edge for the next `smoothSpline` to continue from. */
const FREE_START_KINDS: ReadonlySet<SketchCommand['kind']> = new Set([
  'moveTo', 'close', 'spline', 'nurbsSegment', 'hermiteG2_2d',
]);

const plusX = (): ParamVec => ({ x: toParam(1, 'mm'), y: toParam(0, 'mm') });

/** True when a `smoothSpline` after `prev` takes the sketch +X direction as its
 *  start tangent, because `prev` gives the pen no edge to continue from. */
export function smoothSplineStartIsFree(prev: SketchCommand | undefined): boolean {
  return prev === undefined || FREE_START_KINDS.has(prev.kind);
}

/**
 * Tangent fields of `cmd` after a linear map of the sketch plane. `mapVec`
 * maps a direction vector (no translation part). The end tangent is always
 * written. The start tangent is written when the command states one or when
 * the start is free; an inherited start tangent follows the previous segment,
 * which the caller maps too.
 */
export function mapSmoothSplineTangents(
  cmd: SmoothSplineCommand,
  prev: SketchCommand | undefined,
  mapVec: (x: Param, y: Param) => [Param, Param],
): { startTangent?: ParamVec; endTangent: ParamVec } {
  const end = cmd.endTangent ?? plusX();
  const [ex, ey] = mapVec(end.x, end.y);
  const start = cmd.startTangent ?? (smoothSplineStartIsFree(prev) ? plusX() : undefined);
  if (start === undefined) return { endTangent: { x: ex, y: ey } };
  const [sx, sy] = mapVec(start.x, start.y);
  return { startTangent: { x: sx, y: sy }, endTangent: { x: ex, y: ey } };
}

function direction(label: string, t: ParamVec): [number, number] {
  const x = t.x.evaluated;
  const y = t.y.evaluated;
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 1e-9) {
    throw new Error(`smoothSpline: ${label} [${x}, ${y}] is not a direction — it needs a finite, non-zero [x, y] vector`);
  }
  return [x, y];
}

/**
 * Replicad `smoothSplineTo` config for `cmd`, or `undefined` when the command
 * states no tangent (replicad then applies the +X end tangent and the
 * inherited start tangent itself).
 */
export function smoothSplineConfig(
  cmd: SmoothSplineCommand,
): { endTangent: [number, number]; startTangent?: [number, number] } | undefined {
  if (cmd.startTangent === undefined && cmd.endTangent === undefined) return undefined;
  return {
    endTangent: cmd.endTangent ? direction('endTangent', cmd.endTangent) : [1, 0],
    ...(cmd.startTangent ? { startTangent: direction('startTangent', cmd.startTangent) } : {}),
  };
}
