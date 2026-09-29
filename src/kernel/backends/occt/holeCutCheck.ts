// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/holeCutCheck.ts
//
// Fail-closed checks for face-local hole cutters (`.hole()` / `.holes()`).
//
// The whole-feature volume gate (subtractiveNoOp) only fires when NOTHING was
// removed. A batch where 2 of 4 bores land off the face, or a bore whose
// centre sits past the face edge (an open notch instead of a hole), still
// removes some material and used to lower as a success. These checks look at
// every requested bore on its own:
//
//   before the cut  - `zero-depth`   : the bore has no depth to cut.
//                   - `outside-face` : the bore centre (u, v) does not lie on
//                                      the entry face.
//   after the cut   - `not-cut`      : material is still present on the bore
//                                      axis at mid-depth.
//
// Any miss becomes one `feature.hole.cut-missing` error naming each failed
// position, its world point and the face's (u, v) frame, so the caller can
// fix the coordinates instead of shipping a part with missing holes.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { brepExtremaDistance } from './brepDistance';
import { PROBE_SPHERE_RADIUS_MM } from './holeDetection';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

/** A bore centre further than this from the entry face is off the face. */
export const ON_FACE_TOL_MM = 1e-3;

export type HoleMissReason = 'outside-face' | 'zero-depth' | 'not-cut';

/** One requested bore, in world space. */
export interface HoleCutRequest {
  /** 0-based position index in the feature's request. */
  index: number;
  u: number;
  v: number;
  entryPoint: Vec3;
  axisIntoBody: Vec3;
  /** Cut depth along the axis (mm); for `through` the derived depth. */
  depth: number;
  diameter: number;
}

export interface HoleMiss {
  request: HoleCutRequest;
  reason: HoleMissReason;
}

/** The face-local frame the positions were resolved in, for the message. */
export interface HoleFrameInfo {
  faceLabel: string;
  origin: Vec3;
  uBasis: Vec3;
  vBasis: Vec3;
  face: Face;
}

function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function pointAlong(p: Vec3, axis: Vec3, t: number): Vec3 {
  return [p[0] + axis[0] * t, p[1] + axis[1] * t, p[2] + axis[2] * t];
}

/** Distance (mm) from a world point to the face; undefined if OCCT fails. */
function distanceToFace(face: Face, p: Vec3): number | undefined {
  const vertex = replicad.makeVertex(p);
  try {
    return brepExtremaDistance(replicad.getOC(), vertex.wrapped, face.wrapped);
  } finally {
    vertex.delete();
  }
}

/** Pre-cut checks: every bore must have depth and start on the entry face. */
export function findEntryMisses(face: Face, requests: readonly HoleCutRequest[]): HoleMiss[] {
  const misses: HoleMiss[] = [];
  for (const request of requests) {
    if (!(request.depth > 1e-9)) {
      misses.push({ request, reason: 'zero-depth' });
      continue;
    }
    const d = distanceToFace(face, request.entryPoint);
    // An OCCT failure to measure is not evidence the bore is on the face.
    if (d === undefined || d > ON_FACE_TOL_MM) misses.push({ request, reason: 'outside-face' });
  }
  return misses;
}

/** Probe centre at mid-depth on the bore axis, or null when the bore is too
 *  thin for the probe sphere to sit clear of its wall. */
function probeCenter(request: HoleCutRequest): Vec3 | null {
  if (request.diameter / 2 <= 2 * PROBE_SPHERE_RADIUS_MM) return null;
  return pointAlong(request.entryPoint, request.axisIntoBody, request.depth / 2);
}

function probeSphere(c: Vec3): replicad.Shape3D {
  return replicad.makeSphere(PROBE_SPHERE_RADIUS_MM).translate(c) as replicad.Shape3D;
}

/**
 * Post-cut check: after a correct cut the bore axis is empty at mid-depth. A
 * probe that still overlaps material means that bore was not cut. The common
 * path is one boolean against all probes at once; per-bore probes run only
 * when that finds material, to name the failing positions.
 */
export function findUncutBores(result: OcctBackend, requests: readonly HoleCutRequest[]): HoleMiss[] {
  const probes: Array<{ request: HoleCutRequest; center: Vec3 }> = [];
  for (const request of requests) {
    const center = probeCenter(request);
    if (center) probes.push({ request, center });
  }
  if (probes.length === 0) return [];
  const probeVolume = (4 / 3) * Math.PI * PROBE_SPHERE_RADIUS_MM ** 3;
  const tol = probeVolume * 1e-3;
  // makeCompound consumes its inputs, so the per-bore pass builds fresh spheres.
  const all = new OcctBackend(
    replicad.makeCompound(probes.map((p) => probeSphere(p.center))) as unknown as replicad.Shape3D,
  );
  if (result.intersectionVolume(all) <= tol) return [];
  return probes
    .filter((p) => result.intersectionVolume(new OcctBackend(probeSphere(p.center))) > tol)
    .map((p) => ({ request: p.request, reason: 'not-cut' as const }));
}

const fmt = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};
const fmtVec = (p: Vec3): string => `(${p.map(fmt).join(', ')})`;

function axisName(b: Vec3): string {
  const names = ['X', 'Y', 'Z'];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(Math.abs(b[i]) - 1) < 1e-9) return `${b[i] > 0 ? '+' : '-'}${names[i]}`;
  }
  return fmtVec(b);
}

/** (u, v) extent of the face in its own frame, from the face's bounding box. */
function faceExtent(frame: HoleFrameInfo): { u: [number, number]; v: [number, number] } {
  const [[x0, y0, z0], [x1, y1, z1]] = frame.face.boundingBox.bounds;
  const u: [number, number] = [Infinity, -Infinity];
  const v: [number, number] = [Infinity, -Infinity];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
    const d: Vec3 = [x - frame.origin[0], y - frame.origin[1], z - frame.origin[2]];
    const du = dot(d, frame.uBasis), dv = dot(d, frame.vBasis);
    u[0] = Math.min(u[0], du); u[1] = Math.max(u[1], du);
    v[0] = Math.min(v[0], dv); v[1] = Math.max(v[1], dv);
  }
  return { u, v };
}

const REASON_TEXT: Record<HoleMissReason, string> = {
  'outside-face': 'centre is not on the face',
  'zero-depth': 'bore has zero depth',
  'not-cut': 'material is still present on the bore axis after the cut',
};

/** One error naming every failed bore and the (u, v) frame it was placed in. */
export function holeCutMissingDiagnostic(args: {
  featureId: string;
  opLabel: 'hole' | 'holes';
  frame: HoleFrameInfo;
  misses: readonly HoleMiss[];
  total: number;
}): CompilerDiagnostic {
  const { featureId, opLabel, frame, misses, total } = args;
  const ext = faceExtent(frame);
  const lines = misses.map(({ request: r, reason }) =>
    `#${r.index} (u=${fmt(r.u)}, v=${fmt(r.v)}) -> world ${fmtVec(r.entryPoint)}: ${REASON_TEXT[reason]} [${reason}]`,
  );
  const frameText =
    `On '${frame.faceLabel}', (u, v) are mm offsets from the face centre ${fmtVec(frame.origin)}, ` +
    `u = ${axisName(frame.uBasis)}, v = ${axisName(frame.vBasis)}; ` +
    `the face spans u in [${fmt(ext.u[0])}, ${fmt(ext.u[1])}], v in [${fmt(ext.v[0])}, ${fmt(ext.v[1])}].`;
  return {
    target: 'export-occt',
    code: 'feature.hole.cut-missing',
    featureId,
    severity: 'error',
    message:
      `${opLabel}: ${misses.length} of ${total} requested bore(s) would not be cut where requested: ` +
      `${lines.join('; ')}. ${frameText}`,
    hint: HINT_TEMPLATES['feature.hole.cut-missing'].template,
  };
}
