// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/geometry.ts
//
// Reads the rocket's aerodynamic dimensions off its tessellated geometry:
// every vertex is mapped to (a, r) = (distance aft of the nose tip along the
// rocket axis, radial distance from the axis). Tessellation vertices lie on
// the true surface, so
//
//   - the body radius R is the largest r of the nose part;
//   - the nose length is the smallest a at which a vertex reaches R (the
//     shoulder starts there; a shoulder of smaller radius is ignored);
//   - fin planform: the mesh is cut at two radii just outside the body and
//     just inside the tip; the leading / trailing edges found on each cut are
//     extrapolated linearly to r = R (root) and r = rMax (tip).
//
// Works on a whole-vehicle mesh too (the body tube sits at r <= R, so only
// fins cross the cuts), which is how a single-solid `shape.flightStudy`
// gets its fins.

import type { FlightAxis } from '../../shared/intent/flightStudyRecord';

export type V3 = readonly [number, number, number];

/** A body in world coordinates, mm. */
export interface FlightBody {
  name: string;
  /** xyz triples, world mm. */
  positions: ArrayLike<number>;
  indices: ArrayLike<number>;
  massKg: number;
  comMm: V3;
  massSource: 'massKg' | 'density' | 'material' | 'default' | 'declared';
}

export function axisVector(axis: FlightAxis): V3 {
  const s = axis[0] === '-' ? -1 : 1;
  const i = 'XYZ'.indexOf(axis[1]);
  return [i === 0 ? s : 0, i === 1 ? s : 0, i === 2 ? s : 0];
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Rocket frame: nose tip position along the axis and the axis line's centre. */
export interface RocketFrame {
  axis: V3;
  /** dot(p, axis) of the nose tip. */
  tipS: number;
  /** A point on the axis line (only its perpendicular part matters). */
  centre: V3;
}

function bboxCentre(bodies: readonly FlightBody[]): V3 {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const b of bodies) {
    for (let i = 0; i < b.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = b.positions[i + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
  }
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

export function rocketFrame(all: readonly FlightBody[], axisBodies: readonly FlightBody[], axis: FlightAxis): RocketFrame {
  const ax = axisVector(axis);
  let tipS = -Infinity;
  for (const b of all) {
    for (let i = 0; i < b.positions.length; i += 3) {
      const s = b.positions[i] * ax[0] + b.positions[i + 1] * ax[1] + b.positions[i + 2] * ax[2];
      if (s > tipS) tipS = s;
    }
  }
  return { axis: ax, tipS, centre: bboxCentre(axisBodies.length > 0 ? axisBodies : all) };
}

/** Distance aft of the nose tip, mm. */
export function aftOfTip(f: RocketFrame, p: V3): number {
  return f.tipS - dot(p, f.axis);
}

function radial(f: RocketFrame, x: number, y: number, z: number): number {
  const d: V3 = [x - f.centre[0], y - f.centre[1], z - f.centre[2]];
  const along = dot(d, f.axis);
  return Math.hypot(d[0] - along * f.axis[0], d[1] - along * f.axis[1], d[2] - along * f.axis[2]);
}

interface Ar { a: Float64Array; r: Float64Array }

function toAr(f: RocketFrame, b: FlightBody): Ar {
  const n = b.positions.length / 3;
  const a = new Float64Array(n);
  const r = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = b.positions[3 * i];
    const y = b.positions[3 * i + 1];
    const z = b.positions[3 * i + 2];
    a[i] = f.tipS - (x * f.axis[0] + y * f.axis[1] + z * f.axis[2]);
    r[i] = radial(f, x, y, z);
  }
  return { a, r };
}

export function maxRadius(f: RocketFrame, bodies: readonly FlightBody[]): number {
  let m = 0;
  for (const b of bodies) for (const r of toAr(f, b).r) if (r > m) m = r;
  return m;
}

export function overallLength(f: RocketFrame, bodies: readonly FlightBody[]): number {
  let m = 0;
  for (const b of bodies) for (const a of toAr(f, b).a) if (a > m) m = a;
  return m;
}

/** Nose length: the first station (from the tip) where the surface reaches radius R. */
export function noseLength(f: RocketFrame, bodies: readonly FlightBody[], R: number): number | undefined {
  const tol = Math.max(0.02, 1e-3 * R);
  let best = Infinity;
  for (const b of bodies) {
    const { a, r } = toAr(f, b);
    for (let i = 0; i < a.length; i++) if (r[i] >= R - tol && a[i] < best) best = a[i];
  }
  return Number.isFinite(best) && best > 0 ? best : undefined;
}

/** Axial extent [min a, max a] where the surface crosses radius r0. */
function sectionAt(f: RocketFrame, bodies: readonly FlightBody[], r0: number): [number, number] | undefined {
  let lo = Infinity;
  let hi = -Infinity;
  for (const b of bodies) {
    const { a, r } = toAr(f, b);
    const idx = b.indices;
    for (let t = 0; t < idx.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const i = idx[t + e];
        const j = idx[t + ((e + 1) % 3)];
        const ri = r[i] - r0;
        const rj = r[j] - r0;
        if ((ri < 0 && rj < 0) || (ri > 0 && rj > 0)) continue;
        const s = ri === rj ? 0 : ri / (ri - rj);
        const av = a[i] + s * (a[j] - a[i]);
        if (av < lo) lo = av;
        if (av > hi) hi = av;
      }
    }
  }
  return Number.isFinite(lo) && hi > lo ? [lo, hi] : undefined;
}

export interface DerivedFins {
  rootChordMm: number;
  tipChordMm: number;
  spanMm: number;
  sweepMm: number;
  leadingEdgeFromNoseMm: number;
}

/** Trapezoidal fin planform from the geometry, or undefined when nothing protrudes past R. */
export function deriveFins(f: RocketFrame, bodies: readonly FlightBody[], R: number): DerivedFins | undefined {
  const rMax = maxRadius(f, bodies);
  const span = rMax - R;
  if (span < Math.max(1, 0.05 * R)) return undefined;
  const d = Math.max(0.3, 0.05 * span);
  const r1 = R + d;
  const r2 = rMax - d;
  const s1 = sectionAt(f, bodies, r1);
  const s2 = sectionAt(f, bodies, r2);
  if (s1 === undefined || s2 === undefined) return undefined;
  const lerp = (v1: number, v2: number, r: number) => v1 + ((v2 - v1) * (r - r1)) / (r2 - r1);
  const rootLe = lerp(s1[0], s2[0], R);
  const rootTe = lerp(s1[1], s2[1], R);
  const tipLe = lerp(s1[0], s2[0], rMax);
  const tipTe = lerp(s1[1], s2[1], rMax);
  return {
    rootChordMm: rootTe - rootLe,
    tipChordMm: Math.max(0, tipTe - tipLe),
    spanMm: span,
    sweepMm: tipLe - rootLe,
    leadingEdgeFromNoseMm: rootLe,
  };
}
