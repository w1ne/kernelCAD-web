// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Vec3 } from '../../shared/intent/types';
import type { KernelCadApi } from '../api';
import type { Shape } from '../capture/proxy';
import {
  applyHalfSpaceTrim,
  assertAllowedKeys,
  assertNonZeroVec3,
  assertVec3,
  buildMemberBasis,
  frameTransform,
  isFiniteNumber,
  VEC_EPS,
  vecAdd,
  vecLen,
  vecScale,
  vecSub,
  type Basis3D,
} from './math';
import { buildProfileSolid, profileMetrics, validateProfile } from './profiles';
import type {
  StructuralMemberOptions,
  StructuralProfile,
  TrimPlaneSpec,
} from './types';

const API_NAME = 'structuralMember';
const FEATURE_ID = 'structural-member';
const MEMBER_EXAMPLE =
  "structuralMember([0, 0, 0], [200, 0, 0], { profile: { kind: 'square-tube', size: 40, wall: 3 } })";

const MEMBER_OPT_KEYS = new Set([
  'profile',
  'up',
  'startTrimPlane',
  'endTrimPlane',
  'extendStart',
  'extendEnd',
]);

const TRIM_PLANE_KEYS = new Set(['point', 'normal']);

function assertNonNegative(value: unknown, path: string): number {
  if (!isFiniteNumber(value) || value < 0) {
    invalidArgs({
      api: API_NAME,
      path,
      got: value,
      showType: typeof value !== 'number',
      requires: 'a finite non-negative number (>= 0)',
      unit: 'mm',
      example: MEMBER_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return value;
}

export function validateTrimPlane(
  plane: unknown,
  path: string,
  apiName = API_NAME,
  featureId = FEATURE_ID,
): TrimPlaneSpec {
  if (typeof plane !== 'object' || plane === null || Array.isArray(plane)) {
    invalidArgs({
      api: apiName,
      path,
      got: plane,
      showType: true,
      requires: 'a trim plane object { point: [x, y, z], normal: [nx, ny, nz] }',
      example: MEMBER_EXAMPLE,
      featureId,
    });
  }
  const raw = plane as Record<string, unknown>;
  assertAllowedKeys(raw, TRIM_PLANE_KEYS, {
    api: apiName,
    prefix: path,
    example: MEMBER_EXAMPLE,
    featureId,
  });
  const point = assertVec3(raw.point, {
    api: apiName, path: `${path}.point`, example: MEMBER_EXAMPLE, featureId,
  });
  const normal = assertNonZeroVec3(raw.normal, {
    api: apiName, path: `${path}.normal`, example: MEMBER_EXAMPLE, featureId,
  });
  return { point, normal };
}

export interface InternalMemberBuild {
  from: Vec3;
  nominalLength: number;
  profile: StructuralProfile;
  basis: Basis3D;
  extendStart: number;
  extendEnd: number;
  trimPlanes: readonly TrimPlaneSpec[];
}

export function buildMemberGeometry(
  api: KernelCadApi,
  spec: InternalMemberBuild,
): Shape {
  const totalLength = spec.nominalLength + spec.extendStart + spec.extendEnd;
  const startOrigin = vecSub(spec.from, vecScale(spec.basis.w, spec.extendStart));
  let solid = buildProfileSolid(api, spec.profile, totalLength).transform(
    frameTransform(startOrigin, spec.basis),
  );
  if (spec.trimPlanes.length === 0) return solid;

  const metrics = profileMetrics(spec.profile);
  const center = vecAdd(startOrigin, vecScale(spec.basis.w, totalLength / 2));
  const radius = Math.hypot(totalLength / 2, metrics.boundingRadius);
  for (const plane of spec.trimPlanes) {
    solid = applyHalfSpaceTrim(api, solid, plane, center, radius);
  }
  return solid;
}

export function buildStructuralMember(
  api: KernelCadApi,
  from: Vec3,
  to: Vec3,
  opts: StructuralMemberOptions,
): Shape {
  const pFrom = assertVec3(from, {
    api: API_NAME, path: 'from', example: MEMBER_EXAMPLE, featureId: FEATURE_ID,
  });
  const pTo = assertVec3(to, {
    api: API_NAME, path: 'to', example: MEMBER_EXAMPLE, featureId: FEATURE_ID,
  });
  const axis = vecSub(pTo, pFrom);
  const nominalLength = vecLen(axis);
  if (!(nominalLength > VEC_EPS)) {
    invalidArgs({
      api: API_NAME,
      path: 'to',
      got: pTo,
      requires: 'to to be distinct from from (member length > 0)',
      example: MEMBER_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
    invalidArgs({
      api: API_NAME,
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object with at least { profile }',
      example: MEMBER_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  assertAllowedKeys(opts as unknown as Record<string, unknown>, MEMBER_OPT_KEYS, {
    api: API_NAME, prefix: 'opts', example: MEMBER_EXAMPLE, featureId: FEATURE_ID,
  });

  const profile = validateProfile(opts.profile, 'opts.profile', API_NAME, FEATURE_ID);
  const basis = buildMemberBasis(axis, opts.up, {
    api: API_NAME, path: 'opts.up', example: MEMBER_EXAMPLE, featureId: FEATURE_ID,
  });
  const extendStart = opts.extendStart === undefined ? 0 : assertNonNegative(opts.extendStart, 'opts.extendStart');
  const extendEnd = opts.extendEnd === undefined ? 0 : assertNonNegative(opts.extendEnd, 'opts.extendEnd');
  const trimPlanes: TrimPlaneSpec[] = [];
  if (opts.startTrimPlane !== undefined) {
    trimPlanes.push(validateTrimPlane(opts.startTrimPlane, 'opts.startTrimPlane'));
  }
  if (opts.endTrimPlane !== undefined) {
    trimPlanes.push(validateTrimPlane(opts.endTrimPlane, 'opts.endTrimPlane'));
  }
  return buildMemberGeometry(api, {
    from: pFrom,
    nominalLength,
    profile,
    basis,
    extendStart,
    extendEnd,
    trimPlanes,
  });
}
