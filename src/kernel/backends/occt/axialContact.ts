// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/axialContact.ts
//
// Where along a shaft axis does a body touch the shaft? The material of the
// body nearest the axis: the smallest cylinder around the axis that cuts
// the body, and the axial span(s) of that cut. A bushing gives one span (its
// bore); a body with two bearing points at the same radius gives two.

import * as replicad from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';
import { Transform } from '../../../shared/runtime/se3';
import { OcctBackend } from './occtBackend';

/** Axial interval, mm along the axis from the axis origin. */
export interface AxialSpan {
  readonly fromMm: number;
  readonly toMm: number;
}

export interface AxialContact {
  /** Radius of the first cylinder that cut the body, mm. */
  readonly radiusMm: number;
  /** Disjoint axial spans of the cut, sorted. */
  readonly spans: readonly AxialSpan[];
}

export interface AxialContactOptions {
  /** First probe radius, mm (default 0.25). Each next probe is 1.5x. */
  readonly startRadiusMm?: number;
  /** Largest probe radius, mm (default: the body's farthest bounding-box
   *  corner from the axis). */
  readonly maxRadiusMm?: number;
  /** Spans closer than this merge into one, mm (default 0.5). */
  readonly gapMm?: number;
  /** Search only this axial window, mm along the axis from the origin
   *  (default: the body's whole extent). */
  readonly within?: AxialSpan;
}

const sub = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Readonly<Vec3>, b: Readonly<Vec3>): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Readonly<Vec3>): number => Math.hypot(a[0], a[1], a[2]);

/** Rigid transform that sends `origin` to 0 and `axis` (unit) to +Z. */
function toAxisFrame(origin: Readonly<Vec3>, axis: Readonly<Vec3>): Transform {
  const c = cross(axis, [0, 0, 1]);
  const s = norm(c);
  const angleDeg = (Math.atan2(s, axis[2]) * 180) / Math.PI;
  const rot = s < 1e-12
    ? (axis[2] > 0 ? Transform.identity() : Transform.rotationAxisAngleDeg([1, 0, 0], 180))
    : Transform.rotationAxisAngleDeg([c[0] / s, c[1] / s, c[2] / s], angleDeg);
  return rot.compose(Transform.translation(-origin[0], -origin[1], -origin[2]));
}

function corners(b: { min: Vec3; max: Vec3 }): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) out.push([x, y, z]);
  return out;
}

/** Axial span of `part` in the axis frame `frame` (z = axial). */
function axialRange(part: OcctBackend, frame: Transform): AxialSpan {
  const posed = part.located(frame);
  try {
    const b = posed.boundingBox();
    return { fromMm: b.min[2], toMm: b.max[2] };
  } finally {
    posed.dispose();
  }
}

function mergeSpans(spans: AxialSpan[], gapMm: number): AxialSpan[] {
  const sorted = [...spans].sort((a, b) => a.fromMm - b.fromMm);
  const out: AxialSpan[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && s.fromMm <= last.toMm + gapMm) {
      out[out.length - 1] = { fromMm: last.fromMm, toMm: Math.max(last.toMm, s.toMm) };
    } else {
      out.push(s);
    }
  }
  return out;
}

/** Axial range of box `b` on the line `origin + t·u` (clipped to
 *  `within`) and its farthest corner from the line. */
function axialExtent(
  b: { min: Vec3; max: Vec3 }, origin: Readonly<Vec3>, u: Readonly<Vec3>, within: AxialSpan | undefined,
): { tMin: number; tMax: number; farthest: number } | undefined {
  let tMin = Infinity;
  let tMax = -Infinity;
  let farthest = 0;
  for (const p of corners(b)) {
    const d = sub(p, origin);
    const t = dot(d, u);
    tMin = Math.min(tMin, t);
    tMax = Math.max(tMax, t);
    farthest = Math.max(farthest, norm(sub(d, [u[0] * t, u[1] * t, u[2] * t])));
  }
  if (within !== undefined) {
    tMin = Math.max(tMin, within.fromMm);
    tMax = Math.min(tMax, within.toMm);
  }
  return Number.isFinite(tMin) && Number.isFinite(tMax) && tMax > tMin ? { tMin, tMax, farthest } : undefined;
}

/** Distance from the line `origin + t·u` (u unit) to the nearest point of
 *  box `b`, a lower bound for any material in the box. */
export function boxDistanceToAxis(b: { min: Vec3; max: Vec3 }, origin: Readonly<Vec3>, axis: Readonly<Vec3>): number {
  // Conservative: the box's inscribed-sphere-free bound is the distance to
  // its centre minus its half-diagonal.
  const c: Vec3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  const half = norm(sub(b.max, c));
  const len = norm(axis);
  const u: Vec3 = [axis[0] / len, axis[1] / len, axis[2] / len];
  const d = sub(c, origin);
  const t = dot(d, u);
  return Math.max(0, norm(sub(d, [u[0] * t, u[1] * t, u[2] * t])) - half);
}

/**
 * The material of `shape` (world frame) nearest the line `origin + t·axis`:
 * probe cylinders of growing radius around the line, stop at the first one
 * that cuts the body, and return the axial spans of that cut. Undefined when
 * no probe up to `maxRadiusMm` cuts it. `axis` need not be unit length.
 */
export function nearestAxialContact(
  shape: OcctBackend,
  origin: Readonly<Vec3>,
  axis: Readonly<Vec3>,
  opts: AxialContactOptions = {},
): AxialContact | undefined {
  const len = norm(axis);
  if (!(len > 0)) return undefined;
  const u: Vec3 = [axis[0] / len, axis[1] / len, axis[2] / len];
  const extent = axialExtent(shape.boundingBox(), origin, u, opts.within);
  if (extent === undefined) return undefined;
  const { tMin, tMax, farthest } = extent;
  const maxR = opts.maxRadiusMm ?? farthest;
  const frame = toAxisFrame(origin, u);
  const pad = opts.within === undefined ? 1 : 0;
  const t0 = tMin - pad;
  const height = tMax - tMin + 2 * pad;
  const base: Vec3 = [origin[0] + u[0] * t0, origin[1] + u[1] * t0, origin[2] + u[2] * t0];

  const radii: number[] = [];
  for (let r = opts.startRadiusMm ?? 0.25; r < maxR; r *= 1.5) radii.push(r);
  radii.push(maxR);
  for (const r of radii) {
    const probe = new OcctBackend(replicad.makeCylinder(r, height, base, u));
    let cut: OcctBackend | undefined;
    try {
      cut = shape.intersect(probe);
      const solids = cut.solidComponents().filter((s) => s.volume() > 1e-9);
      if (solids.length === 0) continue;
      const spans = solids.map((s) => axialRange(s, frame));
      for (const s of solids) s.dispose();
      return { radiusMm: r, spans: mergeSpans(spans, opts.gapMm ?? 0.5) };
    } finally {
      probe.dispose();
      cut?.dispose();
    }
  }
  return undefined;
}
