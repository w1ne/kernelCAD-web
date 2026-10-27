// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Resolve a `hole-axis` topology query to the hole's entry-face mouth and
// the unit axis pointing into the body. Authored `.hole()` / `.holes()`
// records win: the query name is the feature name, `hole<ordinal>`,
// `holes<ordinal>[i]`, or `bolt-holes-N` (1-based). `bolt-holes-N` follows
// feature creation order, then current (u, v) inside each feature — the same
// order promotion assigns. A `bolt-holes-N` name with no authored hole falls
// back to the Nth detected cylindrical hole sorted by (x, y), using that
// detector's axisOrigin / axisDirection. Mouths replay post-cut transforms.
//
// Mouth + into-body axis matches the catalog synthesizeConnectors rule for
// a drilled hole. The historical auto-connector vec3 (face-local bottom
// face) is not used here.

import type { Face } from 'replicad';
import type { Param, Vec3 } from '../../../shared/intent/types';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ParamTable } from '../../../shared/runtime/paramTable';
import { resolveParams } from '../../../shared/runtime/resolveParams';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { faceFrameOrigin } from '../../../kernel/backends/occt/faceFrame';
import { detectCylindricalHoles } from '../../../kernel/backends/occt/holeDetection';
import {
  isPointPlacedHole,
  orientDominantCylinderDir,
  polarCylinderAxis,
  polarPointOnAxis,
} from '../../../kernel/backends/occt/holeAtPoint';
import { ancestorFeatureClosure, holeAxisQueryName } from '../../parts/holeAutoConnectors';
import {
  forwardPoint,
  forwardVector,
  inverseNormal,
  inversePoint,
  inverseVector,
  transformsAfterCut,
} from './holeAxisTransforms';

export interface HoleAxisContext {
  records?: readonly FeatureRecord[];
  consumerId?: string;
  paramTable?: ParamTable;
  /** Translation baked into `backend` that is not a feature transform.
   *  Assembly parts pass their `at`. Face-sampled mouths already include it;
   *  a point-placed mouth does not. */
  bakedTranslation?: Vec3;
}

const MISS =
  "Use a hole feature name, 'hole<ordinal>' (hole1), 'holes<ordinal>[i]' (holes1[0]), or 'bolt-holes-N'.";

interface HoleInstance {
  ref: string;
  u: number;
  v: number;
  feature: FeatureRecord;
}

export function resolveHoleAxis(
  backend: OcctBackend,
  name: string,
  ctx: HoleAxisContext,
): { origin: Vec3; axis: Vec3 } {
  const instances = authoredHoles(ctx);
  const hit = matchAuthoredHole(instances, name, ctx.records);
  // Authored holes own the name. A missed `bolt-holes-N` must not fall
  // through to seam-split detected bores on the same solid.
  if (hit || instances.length > 0) {
    if (!hit) throw notFound(backend, name);
    const frame = mouthFrame(backend, hit, ctx);
    if (!frame) {
      throw new Error(
        `assembly.connector.topology-not-resolvable: hole '${name}' is authored but its entry face is not on the shape. ${MISS}`,
      );
    }
    return frame;
  }
  const bolt = boltHolesIndex(name);
  if (bolt !== undefined) {
    const detected = detectedHole(backend, bolt);
    if (detected) return detected;
  }
  throw notFound(backend, name);
}

function notFound(backend: OcctBackend, name: string): Error {
  return new Error(
    `assembly.connector.topology-not-resolvable: hole '${name}' not found on shape (kind='${backend.kind ?? 'composite'}'). ${MISS}`,
  );
}

function matchAuthoredHole(
  instances: readonly HoleInstance[],
  name: string,
  records: readonly FeatureRecord[] | undefined,
): HoleInstance | null {
  const bolt = boltHolesIndex(name);
  if (bolt !== undefined) {
    const order = new Map((records ?? []).map((record, index) => [record.id, index]));
    const sorted = [...instances].sort((a, b) =>
      (order.get(a.feature.id) ?? 0) - (order.get(b.feature.id) ?? 0) || a.u - b.u || a.v - b.v);
    return sorted[bolt - 1] ?? null;
  }
  return instances.find((instance) => instance.ref === name) ?? null;
}

function authoredHoles(ctx: HoleAxisContext): HoleInstance[] {
  const records = ctx.records ?? [];
  const chain = ctx.consumerId === undefined
    ? null
    : new Set(ancestorFeatureClosure(records, ctx.consumerId));
  const out: HoleInstance[] = [];
  for (const record of records) {
    if (chain !== null && !chain.has(record.id)) continue;
    if (record.suppressed) continue;
    if (record.kind !== 'hole' && record.kind !== 'holes') continue;
    const resolved = ctx.paramTable
      ? resolveParams(record, ctx.paramTable) as FeatureRecord
      : record;
    out.push(...instancesOf(resolved));
  }
  return out;
}

function instancesOf(feature: FeatureRecord): HoleInstance[] {
  const metadata = feature.metadata as Record<string, unknown> | undefined;
  if (feature.kind === 'hole') {
    const uv = uvOf(feature);
    return [{ ref: holeAxisQueryName('hole', metadata), u: uv.u, v: uv.v, feature }];
  }
  const positions = (metadata?.positions as Array<{ u?: Param; v?: Param }> | undefined) ?? [];
  return positions.map((position, index) => ({
    ref: holeAxisQueryName('holes', metadata, index),
    u: position.u?.evaluated ?? 0,
    v: position.v?.evaluated ?? 0,
    feature,
  }));
}

function uvOf(feature: FeatureRecord): { u: number; v: number } {
  if (isPointPlacedHole(feature)) return { u: 0, v: 0 };
  return {
    u: feature.params.u?.evaluated ?? 0,
    v: feature.params.v?.evaluated ?? 0,
  };
}

function mouthFrame(
  backend: OcctBackend,
  hit: HoleInstance,
  ctx: HoleAxisContext,
): { origin: Vec3; axis: Vec3 } | null {
  const face = entryFace(backend, hit.feature, ctx.records);
  // A missed entry face is not a hole. Do not invent `[0, 0, -1]`.
  if (!face) return null;
  const outward = faceOutwardNormal(face);
  const into = neg(outward);
  const transforms = transformsAfterCut(ctx.records ?? [], hit.feature.id, ctx.consumerId, ctx.paramTable);
  if (featureIsPolar(hit.feature)) {
    const polar = polarAuthoredFrame(backend, hit.feature, ctx.records, transforms, ctx.bakedTranslation);
    if (!polar) return null;
    const outwardNow = normalize(forwardVector(polar.outward, transforms));
    return pointPlacedFrame(polar.point, hit.feature, transforms, neg(outwardNow), ctx.bakedTranslation);
  }
  const point = pointPlacedOrigin(hit.feature);
  if (point) return pointPlacedFrame(point, hit.feature, transforms, into, ctx.bakedTranslation);
  const normal0 = normalize(inverseNormal(outward, transforms));
  const { uBasis, vBasis } = buildUvBasis(normal0);
  const mouth0 = add(inversePoint(faceFrameOrigin(face), transforms), add(scale(uBasis, hit.u), scale(vBasis, hit.v)));
  return { origin: forwardPoint(mouth0, transforms), axis: into };
}

function pointPlacedFrame(
  point: Vec3,
  feature: FeatureRecord,
  transforms: ReturnType<typeof transformsAfterCut>,
  into: Vec3,
  bakedTranslation: Vec3 | undefined,
): { origin: Vec3; axis: Vec3 } {
  const moved = forwardPoint(point, transforms);
  const origin = bakedTranslation === undefined ? moved : add(moved, bakedTranslation);
  const authored = pointPlacedAxis(feature);
  const axis = authored === null ? into : normalize(forwardVector(authored, transforms));
  return { origin, axis };
}

function entryFace(
  backend: OcctBackend,
  feature: FeatureRecord,
  records: readonly FeatureRecord[] | undefined,
): Face | null {
  // A canonical name on a solid that lost its lineage resolves to the planar
  // face on the world bbox plane. After rotate or reflect that is a different
  // face, and the mate would silently fasten there. Miss instead.
  if (canonicalLineageLost(backend, feature)) return null;
  const picked = pickFace(feature, backend, records);
  return 'error' in picked ? null : picked;
}

function canonicalLineageLost(backend: OcctBackend, feature: FeatureRecord): boolean {
  if (backend.historyMap !== undefined || backend.kind !== undefined) return false;
  const face = feature.inputs.face;
  return face?.kind === 'face' && face.ref.kind === 'canonical';
}

function featureIsPolar(feature: FeatureRecord): boolean {
  return feature.params.atAngleDeg !== undefined && feature.params.atZ !== undefined;
}

/** Polar `at` stored only angle and axial z. Rebuild the cartesian mouth
 *  `placePolar` would have cut, in the pre-transform frame, so
 *  `pointPlacedFrame` can replay post-cut transforms and part `at`.
 *  Map the geometric axis back first, then flip its dominant component.
 *  Flipping in the post-transform frame and inverting that sign mirrors
 *  axial `z` when a later rotate or reflect negates the axis. */
function polarAuthoredFrame(
  backend: OcctBackend,
  feature: FeatureRecord,
  records: readonly FeatureRecord[] | undefined,
  transforms: ReturnType<typeof transformsAfterCut>,
  baked: Vec3 | undefined,
): { point: Vec3; outward: Vec3 } | null {
  if (!featureIsPolar(feature)) return null;
  const axis = polarCylinderAxis(feature, backend, records);
  if (!axis) return null;
  const unbake = (p: Vec3): Vec3 => baked === undefined
    ? p
    : [p[0] - baked[0], p[1] - baked[1], p[2] - baked[2]];
  const origin = inversePoint(unbake(axis.origin), transforms);
  const mappedDir = normalize(inverseVector(axis.dir, transforms));
  const ref = perpendicular(axis.dir);
  const sample = inversePoint(unbake(add(axis.origin, scale(ref, axis.radius))), transforms);
  const dir = orientDominantCylinderDir(mappedDir);
  const radius = distToAxis(sample, origin, dir);
  if (!(radius > 1e-9)) return null;
  const angle = feature.params.atAngleDeg.evaluated;
  const z = feature.params.atZ.evaluated;
  const point = polarPointOnAxis({ origin, dir, radius }, angle, z);
  const onAxis = add(origin, scale(dir, z - dot(origin, dir)));
  return { point, outward: normalize(sub(point, onAxis)) };
}

function pointPlacedOrigin(feature: FeatureRecord): Vec3 | null {
  if (!isPointPlacedHole(feature) || featureIsPolar(feature)) return null;
  const { atX, atY, atZ } = feature.params;
  if (!atX || !atY || !atZ) return null;
  return [atX.evaluated, atY.evaluated, atZ.evaluated];
}

function pointPlacedAxis(feature: FeatureRecord): Vec3 | null {
  const { axisX, axisY, axisZ } = feature.params;
  if (!axisX || !axisY || !axisZ) return null;
  return normalize([axisX.evaluated, axisY.evaluated, axisZ.evaluated]);
}

/** Nth detected bore, 1-based, sorted by mouth (x, y). Null when N is out of range. */
function detectedHole(backend: OcctBackend, index: number): { origin: Vec3; axis: Vec3 } | null {
  if (index < 1) return null;
  const holes = [...detectCylindricalHoles(backend)].sort(
    (a, b) => a.axisOrigin[0] - b.axisOrigin[0] || a.axisOrigin[1] - b.axisOrigin[1],
  );
  const hole = holes[index - 1];
  if (!hole) return null;
  return { origin: hole.axisOrigin, axis: normalize(hole.axisDirection) };
}

function boltHolesIndex(name: string): number | undefined {
  const match = /^bolt-holes-(\d+)$/.exec(name);
  if (!match) return undefined;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 1 ? index : undefined;
}

/** Same (u, v) basis as the hole lowerer: world axes on cardinal faces. */
function buildUvBasis(normalOutward: Vec3): { uBasis: Vec3; vBasis: Vec3 } {
  const n = normalize(normalOutward);
  const card = 0.999;
  if (Math.abs(n[2]) > card) return { uBasis: [1, 0, 0], vBasis: [0, 1, 0] };
  if (Math.abs(n[0]) > card) return { uBasis: [0, 1, 0], vBasis: [0, 0, 1] };
  if (Math.abs(n[1]) > card) return { uBasis: [1, 0, 0], vBasis: [0, 0, 1] };
  const ref: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normalize(cross(ref, n));
  return { uBasis: u, vBasis: cross(n, u) };
}

function faceOutwardNormal(face: Face): Vec3 {
  const raw = (face as unknown as { normalAt?: () => { x: number; y: number; z: number } }).normalAt?.()
    ?? { x: 0, y: 0, z: 1 };
  return normalize([raw.x, raw.y, raw.z]);
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length < 1e-12 ? v : scale(v, 1 / length);
}

function perpendicular(dir: Vec3): Vec3 {
  const ref0: Vec3 = Math.abs(dir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const along = scale(dir, dot(dir, ref0));
  return normalize(sub(ref0, along));
}

function distToAxis(point: Vec3, origin: Vec3, dir: Vec3): number {
  return Math.hypot(...sub(sub(point, origin), scale(dir, dot(dir, sub(point, origin)))));
}
