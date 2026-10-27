// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Resolve a `hole-axis` topology query to the hole's entry-face mouth and
// the unit axis pointing into the body. Authored `.hole()` / `.holes()`
// records win: the query name is the feature name, `hole<ordinal>`,
// `holes<ordinal>[i]`, or `bolt-holes-N` (1-based, sorted by current u then
// v — the same order `bolt-holes-N` is emitted). A `bolt-holes-N` name with
// no authored hole falls back to the Nth detected cylindrical hole sorted
// by (x, y), using that detector's axisOrigin / axisDirection.
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
import { isPointPlacedHole } from '../../../kernel/backends/occt/holeAtPoint';
import { ancestorFeatureIds, holeAxisQueryName } from '../../parts/holeAutoConnectors';

export interface HoleAxisContext {
  records?: readonly FeatureRecord[];
  consumerId?: string;
  paramTable?: ParamTable;
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
  const hit = matchAuthoredHole(instances, name);
  // Authored holes own the name. A missed `bolt-holes-N` must not fall
  // through to seam-split detected bores on the same solid.
  if (hit || instances.length > 0) {
    if (!hit) throw notFound(backend, name);
    const frame = mouthFrame(backend, hit, ctx.records);
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

function matchAuthoredHole(instances: readonly HoleInstance[], name: string): HoleInstance | null {
  const bolt = boltHolesIndex(name);
  if (bolt !== undefined) {
    const sorted = [...instances].sort((a, b) => a.u - b.u || a.v - b.v);
    return sorted[bolt - 1] ?? null;
  }
  return instances.find((instance) => instance.ref === name) ?? null;
}

function authoredHoles(ctx: HoleAxisContext): HoleInstance[] {
  const records = ctx.records ?? [];
  const chain = ctx.consumerId === undefined
    ? null
    : new Set(ancestorFeatureIds(records, ctx.consumerId));
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
  records: readonly FeatureRecord[] | undefined,
): { origin: Vec3; axis: Vec3 } | null {
  const point = pointPlacedOrigin(hit.feature);
  const face = entryFace(backend, hit.feature, records);
  if (!face) return point ? { origin: point, axis: pointPlacedAxis(hit.feature) ?? [0, 0, -1] } : null;
  const outward = faceOutwardNormal(face);
  const into = neg(outward);
  if (point) return { origin: point, axis: pointPlacedAxis(hit.feature) ?? into };
  const { uBasis, vBasis } = buildUvBasis(outward);
  return {
    origin: add(faceFrameOrigin(face), add(scale(uBasis, hit.u), scale(vBasis, hit.v))),
    axis: into,
  };
}

function entryFace(
  backend: OcctBackend,
  feature: FeatureRecord,
  records: readonly FeatureRecord[] | undefined,
): Face | null {
  const picked = pickFace(feature, backend, records);
  return 'error' in picked ? null : picked;
}

function pointPlacedOrigin(feature: FeatureRecord): Vec3 | null {
  if (!isPointPlacedHole(feature)) return null;
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
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
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
