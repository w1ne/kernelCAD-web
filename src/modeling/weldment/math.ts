// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Vec3 } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import type { KernelCadApi } from '../api';
import type { Shape } from '../capture/proxy';
import type { TrimPlaneSpec } from './types';

export type MutableVec3 = [number, number, number];

export const VEC_EPS = 1e-6;

export interface Basis3D {
  u: MutableVec3;
  v: MutableVec3;
  w: MutableVec3;
}

export function vecSub(a: Vec3, b: Vec3): MutableVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vecAdd(a: Vec3, b: Vec3): MutableVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vecScale(v: Vec3, s: number): MutableVec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function vecDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vecCross(a: Vec3, b: Vec3): MutableVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vecLen(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function vecDist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function vecNormalize(v: Vec3): MutableVec3 {
  const len = vecLen(v);
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isFiniteVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value)
    && value.length === 3
    && isFiniteNumber(value[0])
    && isFiniteNumber(value[1])
    && isFiniteNumber(value[2])
  );
}

export function assertVec3(
  value: unknown,
  ctx: { api: string; path: string; example: string; featureId: string },
): MutableVec3 {
  if (!isFiniteVec3(value)) {
    invalidArgs({
      api: ctx.api,
      path: ctx.path,
      got: value,
      showType: true,
      requires: 'a 3D coordinate tuple [x, y, z] of finite numbers',
      example: ctx.example,
      featureId: ctx.featureId,
    });
  }
  return [value[0], value[1], value[2]];
}

export function assertNonZeroVec3(
  value: unknown,
  ctx: { api: string; path: string; example: string; featureId: string },
): MutableVec3 {
  const vec = assertVec3(value, ctx);
  if (!(vecLen(vec) > VEC_EPS)) {
    invalidArgs({
      api: ctx.api,
      path: ctx.path,
      got: vec,
      requires: 'a non-zero finite 3D direction vector',
      example: ctx.example,
      featureId: ctx.featureId,
    });
  }
  return vec;
}

export function assertAllowedKeys(
  obj: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  ctx: { api: string; prefix: string; example: string; featureId: string },
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      invalidArgs({
        api: ctx.api,
        path: ctx.prefix ? `${ctx.prefix}.${key}` : key,
        gotText: `an unknown option '${key}'`,
        requires: `only supported options (${[...allowed].join(', ')})`,
        example: ctx.example,
        featureId: ctx.featureId,
      });
    }
  }
}

export function frameTransform(origin: Vec3, basis: Basis3D): Transform {
  const { u, v, w } = basis;
  return Transform.fromColumnMajor([
    u[0], u[1], u[2], 0,
    v[0], v[1], v[2], 0,
    w[0], w[1], w[2], 0,
    origin[0], origin[1], origin[2], 1,
  ]);
}

/**
 * Compute right-handed orthonormal member frame `(u, v, w)` where `w` runs
 * along the member axis (`from -> to`), `v` aligns with `up` (height axis),
 * and `u = v × w` (width axis, so `u × v = w`).
 */
export function buildMemberBasis(
  axis: Vec3,
  up: Vec3 | undefined,
  ctx: { api: string; path: string; example: string; featureId: string },
): Basis3D {
  const w = vecNormalize(axis);
  let refUp: Vec3;
  if (up !== undefined) {
    const validUp = assertNonZeroVec3(up, ctx);
    const upUnit = vecNormalize(validUp);
    if (vecLen(vecCross(upUnit, w)) <= VEC_EPS) {
      invalidArgs({
        api: ctx.api,
        path: ctx.path,
        got: validUp,
        requires: 'an up direction that is not parallel to the member axis (to - from)',
        example: ctx.example,
        featureId: ctx.featureId,
      });
    }
    refUp = upUnit;
  } else {
    refUp = Math.abs(w[2]) < 1 - VEC_EPS ? [0, 0, 1] : [0, 1, 0];
  }
  const u = vecNormalize(vecCross(refUp, w));
  const v = vecCross(w, u);
  return { u, v, w };
}

/**
 * Intersect `shape` with the closed half-space `(p - plane.point) · normal <= 0`,
 * removing material on the `+normal` side. Uses a conservative cube sized from
 * the bounding sphere `(center, radius)` so the cut is exact and never emits a
 * spurious empty-half error when the plane misses the shape on the `+normal` side.
 */
export function applyHalfSpaceTrim(
  api: KernelCadApi,
  shape: Shape,
  plane: TrimPlaneSpec,
  center: Vec3,
  radius: number,
): Shape {
  const n = vecNormalize(plane.normal);
  const helper: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const u = vecNormalize(vecCross(helper, n));
  const v = vecCross(n, u);

  const signedDist = vecDot(vecSub(center, plane.point), n);
  const onPlane = vecSub(center, vecScale(n, signedDist));
  const half = Math.max(radius + Math.abs(signedDist) + 10, 10);
  const size = half * 2;
  const boxCenter = vecSub(onPlane, vecScale(n, half));
  const keepBox = api.box(size, size, size, true).transform(frameTransform(boxCenter, { u, v, w: n }));
  return shape.intersect(keepBox);
}
