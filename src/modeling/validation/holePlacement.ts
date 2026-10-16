// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/validation/holePlacement.ts
//
// Point-placed holes: `hole(face, { at, axis?, diameter, depth, ... })`.
//
// `{ u, v }` places a bore in the entry face's flat 2-D frame, which only
// exists on planar faces. `at` places it by a world point instead, so a hole
// can start on ANY face — a set screw or cross pin on a cylinder, a hole on a
// cone or a fillet:
//
//   at: [x, y, z]          world point on (or within 0.5 mm of) the face;
//                          it is projected onto the face.
//   at: { angleDeg, z }    on a cylindrical face: the polar angle about the
//                          cylinder axis (0° = +X, 90° = +Y for a Z axis;
//                          generally from the world axis least aligned with
//                          the cylinder axis) and the axial world coordinate.
//   axis?: [dx, dy, dz]    drilling direction INTO the body; defaults to the
//                          inward face normal at the point (radial on a
//                          cylinder).
//
// Depth, `through` (to the first exit along the axis), counterbore,
// countersink, thread and the created refs (`wall`, `floor`, ...) work exactly
// as for `{ u, v }` holes.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId, Param, Vec3 } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import { currentValue, toParam } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';

export type EditableHoleAt =
  | readonly [Editable<number>, Editable<number>, Editable<number>]
  | { angleDeg: Editable<number>; z: Editable<number> };

export type HoleAt = [number, number, number] | { angleDeg: number; z: number };

const AT_EXAMPLE =
  "collar.hole({ ofSurfaceType: 'CYLINDER' }, { at: { angleDeg: 0, z: 5 }, diameter: 4, depth: 'through', thread: { pitch: 0.7 } })";
const API = 'hole(face, { at })';

function isPolar(at: unknown): at is { angleDeg: unknown; z: unknown } {
  return typeof at === 'object' && at !== null && !Array.isArray(at);
}

/** Resolve `at` to numbers (symbolic param refs read from the param table). */
export function resolveHoleAt(at: EditableHoleAt, table: ParamTable): HoleAt {
  if (isPolar(at)) {
    return { angleDeg: currentValue(at.angleDeg, table), z: currentValue(at.z, table) };
  }
  if (!Array.isArray(at)) return at as unknown as HoleAt;
  return at.map((c) => currentValue(c as Editable<number>, table)) as [number, number, number];
}

const finite = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n);

function badAt(path: string, got: unknown, requires: string, featureId: FeatureId | undefined): never {
  return invalidArgs({ api: API, path, got, showType: true, requires, unit: 'mm', example: AT_EXAMPLE, featureId });
}

function validateAt(at: unknown, featureId: FeatureId | undefined): void {
  if (isPolar(at)) {
    if (!finite(at.angleDeg)) badAt('opts.at.angleDeg', at.angleDeg, 'a finite angle in degrees about the cylinder axis (0 = +X, 90 = +Y for a Z-axis cylinder)', featureId);
    if (!finite(at.z)) badAt('opts.at.z', at.z, 'a finite axial world coordinate along the cylinder axis', featureId);
    return;
  }
  if (!Array.isArray(at) || at.length !== 3 || !at.every(finite)) {
    badAt('opts.at', at, 'a world point [x, y, z] on the entry face, or { angleDeg, z } on a cylindrical face', featureId);
  }
}

function validateAxis(axis: unknown, featureId: FeatureId | undefined): void {
  const ok = Array.isArray(axis) && axis.length === 3 && axis.every(finite)
    && Math.hypot(axis[0] as number, axis[1] as number, axis[2] as number) > 1e-9;
  if (!ok) {
    invalidArgs({
      api: 'hole(face, { at, axis })',
      path: 'opts.axis',
      got: axis,
      showType: true,
      requires: 'a non-zero direction [dx, dy, dz] pointing INTO the body; omit it to drill along the inward face normal',
      example: "part.hole({ ofSurfaceType: 'CYLINDER' }, { at: [10, 0, 5], axis: [-1, 0, 0], diameter: 3, depth: 4 })",
      featureId,
    });
  }
}

/**
 * Validate the placement fields of a single hole. Returns true when the hole
 * is point-placed (`at`), so the caller skips the `{ u, v }` checks.
 * `at` together with `u` / `v` is rejected: the two frames would disagree.
 */
export function validateHolePlacement(
  opts: { at?: unknown; axis?: unknown; u?: unknown; v?: unknown },
  featureId: FeatureId | undefined,
): boolean {
  if (opts.at === undefined) {
    if (opts.axis !== undefined) {
      badAt('opts.axis', opts.axis, '`axis` only together with `at` — a { u, v } hole drills along the face normal', featureId);
    }
    return false;
  }
  if (opts.u !== undefined || opts.v !== undefined) {
    badAt('opts.u / opts.v', { u: opts.u, v: opts.v }, 'either { u, v } (planar face frame) or `at` (world point), not both', featureId);
  }
  validateAt(opts.at, featureId);
  if (opts.axis !== undefined) validateAxis(opts.axis, featureId);
  return true;
}

/** Params for a point-placed hole: atX/atY/atZ or atAngleDeg/atZ, axisX/Y/Z. */
export function serializeHoleAt(at: EditableHoleAt, axis: Vec3 | undefined): Record<string, Param> {
  const params: Record<string, Param> = {};
  if (isPolar(at)) {
    params.atAngleDeg = toParam(at.angleDeg, 'deg');
    params.atZ = toParam(at.z, 'mm');
  } else {
    params.atX = toParam(at[0], 'mm');
    params.atY = toParam(at[1], 'mm');
    params.atZ = toParam(at[2], 'mm');
  }
  if (axis !== undefined) {
    const names = ['axisX', 'axisY', 'axisZ'] as const;
    names.forEach((n, i) => { params[n] = { expression: String(axis[i]), unit: 'unitless', evaluated: axis[i] }; });
  }
  return params;
}
