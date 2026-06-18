// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/canonicalFaceGeometry.ts
//
// Geometry-based canonical face resolution for solids that carry NO primitive
// `kind` tag and NO lineage `historyMap` — i.e. solids produced by
// variableSweep / loft / revolve. Such solids previously rejected every
// canonical face name ('top' / 'bottom' / ...) with a misleading
// "requires an un-transformed primitive — apply transforms after the feature"
// error, even though the agent never applied a transform.
//
// The common case the agent hits is a wheel: a cylinder built by sweeping or
// lofting a circle, or by revolving a rectangle. Geometrically this is a
// "cylinder-topology" solid: exactly two parallel PLANE end-caps plus one or
// more curved (non-planar) lateral faces. For that topology we can resolve
// 'top' / 'bottom' purely from geometry — the planar cap at max / min along the
// cap axis — without any stored primitive kind.
//
// This module is intentionally narrow and conservative: it only claims a match
// when the solid is unambiguously cylinder-topology and the requested name is
// the cap along that axis. Anything else returns a structured outcome so the
// caller can emit an actionable diagnostic instead of a silent / misleading
// failure.

import type { Face, Shape3D } from 'replicad';
import type { CanonicalFace } from '../../../shared/intent/types';

/** Tolerance (mm) for treating two cap centroids as distinct. */
const TOL = 1e-4;
/** Slack on the |normal·axis| ≈ 1 test (≈0.8°). */
const AXIS_SLACK = 1e-4;
/** Off-axis component bound for treating a normal as axis-aligned. */
const OFF_AXIS = 0.01;

type Axis = 0 | 1 | 2;

export type CanonicalGeometryResult =
  | { kind: 'resolved'; face: Face }
  /** Solid is cylinder-topology but the requested name is not a cap. */
  | { kind: 'not-a-cap'; capAxisLabel: 'top/bottom' | 'left/right' | 'front/back' }
  /** Solid is not cylinder-topology — no canonical names derivable. */
  | { kind: 'no-canonical-faces'; faceCount: number };

/** Read the OCCT surface type string off a replicad Face (e.g. 'PLANE'). */
function geomTypeOf(face: Face): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gt = (face as any).geomType;
  const raw = typeof gt === 'function' ? gt.call(face) : gt;
  return typeof raw === 'string' ? raw.toUpperCase() : 'OTHER';
}

/** Unit normal at the face centre, as a [x,y,z] tuple, or null if unavailable. */
function normalOf(face: Face): [number, number, number] | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = face as any;
  // replicad exposes `normalAt(point?)`; fall back gracefully if absent.
  let n: { x: number; y: number; z: number } | undefined;
  try {
    n = typeof f.normalAt === 'function' ? f.normalAt(f.center) : undefined;
  } catch {
    n = undefined;
  }
  if (!n) return null;
  const len = Math.hypot(n.x, n.y, n.z);
  if (len < 1e-9) return null;
  return [n.x / len, n.y / len, n.z / len];
}

/** The axis (0=X,1=Y,2=Z) a unit normal is parallel to, or null if oblique. */
function axisOfNormal(n: [number, number, number]): Axis | null {
  for (const axis of [0, 1, 2] as Axis[]) {
    const aligned = Math.abs(Math.abs(n[axis]) - 1) < AXIS_SLACK;
    const off = (axis === 0 ? 0 : Math.abs(n[0])) +
      (axis === 1 ? 0 : Math.abs(n[1])) +
      (axis === 2 ? 0 : Math.abs(n[2]));
    if (aligned && off < OFF_AXIS) return axis;
  }
  return null;
}

function centerComponent(face: Face, axis: Axis): number {
  const c = face.center;
  return axis === 0 ? c.x : axis === 1 ? c.y : c.z;
}

/**
 * Resolve a canonical face name on a `kind`-less, lineage-less solid by
 * geometry. Succeeds only for cylinder-topology solids (exactly two parallel
 * planar caps + ≥1 curved lateral face) when asking for the cap along that
 * axis ('top'/'bottom' for Z caps, etc.).
 */
export function resolveCanonicalByGeometry(
  shape: Shape3D,
  face: CanonicalFace,
): CanonicalGeometryResult {
  const faces = shape.faces;
  const planar: Face[] = [];
  let curvedCount = 0;
  for (const f of faces) {
    if (geomTypeOf(f) === 'PLANE') planar.push(f);
    else curvedCount += 1;
  }

  // Cylinder-topology requires exactly two planar caps and at least one curved
  // lateral face.
  if (planar.length !== 2 || curvedCount < 1) {
    return { kind: 'no-canonical-faces', faceCount: faces.length };
  }

  const n0 = normalOf(planar[0]);
  const n1 = normalOf(planar[1]);
  if (!n0 || !n1) return { kind: 'no-canonical-faces', faceCount: faces.length };

  const axis0 = axisOfNormal(n0);
  const axis1 = axisOfNormal(n1);
  // Both caps must be axis-aligned to the SAME axis (parallel, opposed faces).
  if (axis0 === null || axis1 === null || axis0 !== axis1) {
    return { kind: 'no-canonical-faces', faceCount: faces.length };
  }
  const capAxis = axis0;

  // Map the requested canonical name to (axis, which end).
  // top/back/right = max along Z/Y/X ; bottom/front/left = min.
  const spec = canonicalToAxisEnd(face);
  if (spec.axis !== capAxis) {
    return { kind: 'not-a-cap', capAxisLabel: axisLabel(capAxis) };
  }

  const v0 = centerComponent(planar[0], capAxis);
  const v1 = centerComponent(planar[1], capAxis);
  if (Math.abs(v0 - v1) < TOL) {
    // Degenerate: both caps at the same coordinate — cannot disambiguate.
    return { kind: 'no-canonical-faces', faceCount: faces.length };
  }
  const wantMax = spec.end === 'max';
  const firstWins = wantMax ? v0 > v1 : v0 < v1;
  return { kind: 'resolved', face: firstWins ? planar[0] : planar[1] };
}

function canonicalToAxisEnd(face: CanonicalFace): { axis: Axis; end: 'min' | 'max' } {
  switch (face) {
    case 'top':
      return { axis: 2, end: 'max' };
    case 'bottom':
      return { axis: 2, end: 'min' };
    case 'right':
      return { axis: 0, end: 'max' };
    case 'left':
      return { axis: 0, end: 'min' };
    case 'back':
      return { axis: 1, end: 'max' };
    case 'front':
      return { axis: 1, end: 'min' };
  }
}

function axisLabel(axis: Axis): 'top/bottom' | 'left/right' | 'front/back' {
  return axis === 2 ? 'top/bottom' : axis === 0 ? 'left/right' : 'front/back';
}
