// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Vec3 } from '../../shared/intent/types';
import type { KernelCadApi } from '../api';
import { Assembly } from '../capture/assembly';
import type { Shape } from '../capture/proxy';
import type { CaptureSession } from '../capture/captureSession';
import {
  assertAllowedKeys,
  assertVec3,
  buildMemberBasis,
  VEC_EPS,
  vecAdd,
  vecCross,
  vecDist,
  vecDot,
  vecLen,
  vecNormalize,
  vecScale,
  vecSub,
  type Basis3D,
  type MutableVec3,
} from './math';
import { buildMemberGeometry } from './member';
import { profileMetrics, profileSupportDistance, validateProfile } from './profiles';
import type {
  StructuralProfile,
  TrimPlaneSpec,
  WeldmentCutItem,
  WeldmentFrameOptions,
  WeldmentFrameResult,
  WeldmentMemberSpec,
  WeldmentTrimMode,
} from './types';

const API_NAME = 'weldmentFrame';
const FEATURE_ID = 'weldment-frame';
const FRAME_EXAMPLE =
  "weldmentFrame([{ from: [0,0,0], to: [200,0,0], profile: { kind: 'square-tube', size: 30, wall: 3 } }], { cornerTrim: 'miter' })";

const JOINT_TOL = 1e-4;
const EXTEND_PAD = 2;
const FRAME_OPT_KEYS = new Set(['cornerTrim', 'fuse']);
const MEMBER_SPEC_KEYS = new Set(['from', 'to', 'profile', 'up', 'trim', 'label']);
const VALID_TRIMS = new Set<WeldmentTrimMode>(['miter', 'butt', 'none']);

interface PreparedMember {
  index: number;
  label: string;
  from: MutableVec3;
  to: MutableVec3;
  nominalLength: number;
  profile: StructuralProfile;
  basis: Basis3D;
  trimMode: WeldmentTrimMode;
  extendStart: number;
  extendEnd: number;
  startPlanes: TrimPlaneSpec[];
  endPlanes: TrimPlaneSpec[];
}

function assertTrimMode(value: unknown, path: string): WeldmentTrimMode {
  if (typeof value !== 'string' || !VALID_TRIMS.has(value as WeldmentTrimMode)) {
    invalidArgs({
      api: API_NAME,
      path,
      got: value,
      showType: true,
      requires: "one of 'miter', 'butt', 'none'",
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return value as WeldmentTrimMode;
}

function parseFrameOptions(opts: WeldmentFrameOptions | undefined): {
  cornerTrim: WeldmentTrimMode;
  fuse: boolean;
} {
  if (opts === undefined) return { cornerTrim: 'miter', fuse: false };
  if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
    invalidArgs({
      api: API_NAME,
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { cornerTrim?, fuse? }',
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  assertAllowedKeys(opts as unknown as Record<string, unknown>, FRAME_OPT_KEYS, {
    api: API_NAME, prefix: 'opts', example: FRAME_EXAMPLE, featureId: FEATURE_ID,
  });
  const cornerTrim = opts.cornerTrim === undefined
    ? 'miter'
    : assertTrimMode(opts.cornerTrim, 'opts.cornerTrim');
  if (opts.fuse !== undefined && typeof opts.fuse !== 'boolean') {
    invalidArgs({
      api: API_NAME,
      path: 'opts.fuse',
      got: opts.fuse,
      showType: true,
      requires: 'a boolean',
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return { cornerTrim, fuse: opts.fuse ?? false };
}

function prepareMember(
  rawSpec: unknown,
  index: number,
  defaultTrim: WeldmentTrimMode,
): PreparedMember {
  const prefix = `members[${index}]`;
  if (typeof rawSpec !== 'object' || rawSpec === null || Array.isArray(rawSpec)) {
    invalidArgs({
      api: API_NAME,
      path: prefix,
      got: rawSpec,
      showType: true,
      requires: 'a member spec object { from, to, profile, up?, trim?, label? }',
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  const raw = rawSpec as Record<string, unknown>;
  assertAllowedKeys(raw, MEMBER_SPEC_KEYS, {
    api: API_NAME, prefix, example: FRAME_EXAMPLE, featureId: FEATURE_ID,
  });
  const from = assertVec3(raw.from, {
    api: API_NAME, path: `${prefix}.from`, example: FRAME_EXAMPLE, featureId: FEATURE_ID,
  });
  const to = assertVec3(raw.to, {
    api: API_NAME, path: `${prefix}.to`, example: FRAME_EXAMPLE, featureId: FEATURE_ID,
  });
  const axis = vecSub(to, from);
  const nominalLength = vecLen(axis);
  if (!(nominalLength > VEC_EPS)) {
    invalidArgs({
      api: API_NAME,
      path: `${prefix}.to`,
      got: to,
      requires: 'to to be distinct from from (member length > 0)',
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  const profile = validateProfile(raw.profile, `${prefix}.profile`, API_NAME, FEATURE_ID);
  const basis = buildMemberBasis(axis, raw.up as Vec3 | undefined, {
    api: API_NAME, path: `${prefix}.up`, example: FRAME_EXAMPLE, featureId: FEATURE_ID,
  });
  const trimMode = raw.trim === undefined
    ? defaultTrim
    : assertTrimMode(raw.trim, `${prefix}.trim`);
  if (raw.label !== undefined && (typeof raw.label !== 'string' || raw.label.trim().length === 0)) {
    invalidArgs({
      api: API_NAME,
      path: `${prefix}.label`,
      got: raw.label,
      showType: true,
      requires: 'a non-empty string',
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return {
    index,
    label: (raw.label as string | undefined) ?? `member-${index + 1}`,
    from,
    to,
    nominalLength,
    profile,
    basis,
    trimMode,
    extendStart: 0,
    extendEnd: 0,
    startPlanes: [],
    endPlanes: [],
  };
}

function recordEndTrim(
  member: PreparedMember,
  end: 'start' | 'end',
  plane: TrimPlaneSpec,
  extend: number,
): void {
  if (end === 'start') {
    member.startPlanes.push(plane);
    if (extend > member.extendStart) member.extendStart = extend;
  } else {
    member.endPlanes.push(plane);
    if (extend > member.extendEnd) member.extendEnd = extend;
  }
}

function awayVector(member: PreparedMember, end: 'start' | 'end'): MutableVec3 {
  return end === 'start' ? member.basis.w : vecScale(member.basis.w, -1);
}

function endpointCoord(member: PreparedMember, end: 'start' | 'end'): MutableVec3 {
  return end === 'start' ? member.from : member.to;
}

function applyButtTrim(
  primary: PreparedMember,
  secondary: PreparedMember,
  secEnd: 'start' | 'end',
  junction: Vec3,
): void {
  const awaySec = awayVector(secondary, secEnd);
  const wPri = primary.basis.w;
  const perp = vecSub(awaySec, vecScale(wPri, vecDot(awaySec, wPri)));
  if (vecLen(perp) <= VEC_EPS) return;

  const faceDir = vecNormalize(perp);
  const priSupport = profileSupportDistance(
    primary.profile, primary.basis.u, primary.basis.v, faceDir,
  );
  const facePoint = vecAdd(junction, vecScale(faceDir, priSupport));
  const cutNormal = vecScale(faceDir, -1);

  const cosInc = vecDot(awaySec, faceDir);
  const secSupport = profileSupportDistance(
    secondary.profile, secondary.basis.u, secondary.basis.v, faceDir,
  );
  const neededExtend = secSupport > priSupport && cosInc > VEC_EPS
    ? (secSupport - priSupport) / cosInc + EXTEND_PAD
    : 0;
  recordEndTrim(secondary, secEnd, { point: facePoint, normal: cutNormal }, neededExtend);
}

function applyMiterPair(
  a: PreparedMember,
  endA: 'start' | 'end',
  b: PreparedMember,
  endB: 'start' | 'end',
  junction: Vec3,
): void {
  const awayA = awayVector(a, endA);
  const awayB = awayVector(b, endB);
  if (vecLen(vecCross(awayA, awayB)) <= VEC_EPS) return;

  const n = vecNormalize(vecSub(awayB, awayA));
  const sinHalf = Math.abs(vecDot(awayA, n));
  if (sinHalf <= VEC_EPS) return;

  const extA = profileSupportDistance(a.profile, a.basis.u, a.basis.v, n) / sinHalf + EXTEND_PAD;
  const extB = profileSupportDistance(b.profile, b.basis.u, b.basis.v, n) / sinHalf + EXTEND_PAD;
  recordEndTrim(a, endA, { point: junction, normal: n }, extA);
  recordEndTrim(b, endB, { point: junction, normal: vecScale(n, -1) }, extB);
}

function findSharedVertex(
  a: PreparedMember,
  b: PreparedMember,
): { endA: 'start' | 'end'; endB: 'start' | 'end'; point: MutableVec3 } | null {
  const ends: readonly ('start' | 'end')[] = ['start', 'end'];
  for (const endA of ends) {
    const pA = endpointCoord(a, endA);
    for (const endB of ends) {
      const pB = endpointCoord(b, endB);
      if (vecDist(pA, pB) <= JOINT_TOL) {
        return {
          endA,
          endB,
          point: [(pA[0] + pB[0]) / 2, (pA[1] + pB[1]) / 2, (pA[2] + pB[2]) / 2],
        };
      }
    }
  }
  return null;
}

function projectOntoSegmentInterior(
  pt: Vec3,
  seg: PreparedMember,
): MutableVec3 | null {
  const t = vecDot(vecSub(pt, seg.from), seg.basis.w);
  if (!(t > JOINT_TOL && t < seg.nominalLength - JOINT_TOL)) return null;
  const proj = vecAdd(seg.from, vecScale(seg.basis.w, t));
  return vecDist(pt, proj) <= JOINT_TOL ? proj : null;
}

function resolveSharedCorner(
  a: PreparedMember,
  endA: 'start' | 'end',
  b: PreparedMember,
  endB: 'start' | 'end',
  junction: Vec3,
): void {
  if (a.trimMode === 'none' && b.trimMode === 'none') return;
  if (a.trimMode === 'miter' && b.trimMode === 'miter') {
    applyMiterPair(a, endA, b, endB, junction);
    return;
  }
  if (b.trimMode === 'none') {
    applyButtTrim(b, a, endA, junction);
    return;
  }
  applyButtTrim(a, b, endB, junction);
}

function resolveTJunctions(primary: PreparedMember, secondary: PreparedMember): void {
  if (secondary.trimMode === 'none') return;
  for (const end of ['start', 'end'] as const) {
    const proj = projectOntoSegmentInterior(endpointCoord(secondary, end), primary);
    if (proj !== null) {
      applyButtTrim(primary, secondary, end, proj);
    }
  }
}

function computeEndCutStats(
  member: PreparedMember,
  end: 'start' | 'end',
): { tipS: number; angleDeg: number } {
  const planes = end === 'start' ? member.startPlanes : member.endPlanes;
  const w = member.basis.w;
  const outward = end === 'start' ? vecScale(w, -1) : w;
  if (planes.length === 0) {
    return { tipS: end === 'start' ? 0 : member.nominalLength, angleDeg: 0 };
  }

  let tipS = end === 'start' ? -Infinity : Infinity;
  let maxAngle = 0;
  for (const plane of planes) {
    const n = vecNormalize(plane.normal);
    const wDotN = vecDot(w, n);
    if (Math.abs(wDotN) > VEC_EPS) {
      const support = profileSupportDistance(member.profile, member.basis.u, member.basis.v, n);
      const s = (vecDot(vecSub(plane.point, member.from), n) + support) / wDotN;
      tipS = end === 'start' ? Math.max(tipS, s) : Math.min(tipS, s);
    }
    const cosAngle = Math.min(1, Math.max(-1, vecDot(outward, n)));
    const deg = (Math.acos(cosAngle) * 180) / Math.PI;
    if (deg > maxAngle) maxAngle = deg;
  }
  if (!Number.isFinite(tipS)) {
    tipS = end === 'start' ? 0 : member.nominalLength;
  }
  return { tipS, angleDeg: Math.round(maxAngle * 1000) / 1000 };
}

function buildCutItem(member: PreparedMember): WeldmentCutItem {
  const startStats = computeEndCutStats(member, 'start');
  const endStats = computeEndCutStats(member, 'end');
  const cutLength = Math.max(0, endStats.tipS - startStats.tipS);
  return {
    index: member.index,
    label: member.label,
    profile: member.profile,
    nominalLength: member.nominalLength,
    cutLength,
    startCutAngleDeg: startStats.angleDeg,
    endCutAngleDeg: endStats.angleDeg,
    crossSectionArea: profileMetrics(member.profile).area,
  };
}

export function buildWeldmentFrame(
  session: CaptureSession,
  api: KernelCadApi,
  members: readonly WeldmentMemberSpec[],
  opts?: WeldmentFrameOptions,
): WeldmentFrameResult {
  if (!Array.isArray(members) || members.length === 0) {
    invalidArgs({
      api: API_NAME,
      path: 'members',
      got: members,
      showType: !Array.isArray(members),
      requires: 'a non-empty array of member specs ({ from, to, profile, up?, trim?, label? })',
      example: FRAME_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  const { cornerTrim, fuse } = parseFrameOptions(opts);
  const prepared = members.map((spec, idx) => prepareMember(spec, idx, cornerTrim));

  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const a = prepared[i]!;
      const b = prepared[j]!;
      const shared = findSharedVertex(a, b);
      if (shared !== null) {
        resolveSharedCorner(a, shared.endA, b, shared.endB, shared.point);
      } else {
        resolveTJunctions(a, b);
        resolveTJunctions(b, a);
      }
    }
  }

  const builtShapes = prepared.map((m) =>
    buildMemberGeometry(api, {
      from: m.from,
      nominalLength: m.nominalLength,
      profile: m.profile,
      basis: m.basis,
      extendStart: m.extendStart,
      extendEnd: m.extendEnd,
      trimPlanes: [...m.startPlanes, ...m.endPlanes],
    }),
  );
  const cutList = prepared.map(buildCutItem);

  let combined: Shape;
  if (builtShapes.length === 1) {
    combined = builtShapes[0]!;
  } else if (fuse) {
    combined = api.union(...builtShapes);
  } else {
    const asm = new Assembly('weldment-frame', session);
    builtShapes.forEach((shape, idx) => {
      asm.part(`member-${idx + 1}`, shape);
    });
    combined = asm.model().toCompound();
  }

  return { members: builtShapes, cutList, combined };
}
