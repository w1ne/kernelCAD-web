// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Pure math for the viewer's Measure tool: vectors, number formatting and the
// circle fit that turns a closed circular edge into a diameter reading.

export type Vec3 = readonly [number, number, number];

export const vsub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vadd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vscale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vcross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vlen = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const vdist = (a: Vec3, b: Vec3): number => vlen(vsub(a, b));
export const vlerp = (a: Vec3, b: Vec3, t: number): Vec3 => vadd(a, vscale(vsub(b, a), t));

export function vnormalize(a: Vec3): Vec3 | null {
  const l = vlen(a);
  return l < 1e-12 ? null : vscale(a, 1 / l);
}

/** Model units are millimetres; one decimal place everywhere. */
export const formatMm = (v: number): string => v.toFixed(1);
export const formatLength = (d: number): string => `${formatMm(d)} mm`;
export const formatDiameter = (d: number): string => `Ø ${formatMm(d)} mm`;
export const formatRadius = (r: number): string => `R ${formatMm(r)} mm`;

/** "ΔX 10.0 ΔY 20.0 ΔZ 120.0" — absolute axis deltas between two points. */
export function formatDeltas(a: Vec3, b: Vec3): string {
  const d = vsub(b, a);
  return `ΔX ${formatMm(Math.abs(d[0]))} ΔY ${formatMm(Math.abs(d[1]))} ΔZ ${formatMm(Math.abs(d[2]))}`;
}

export interface CircleFit {
  center: Vec3;
  radius: number;
  normal: Vec3;
  /** RMS of |distance to centre - radius| over all input points. */
  rms: number;
}

/** A circle must fit within this fraction of its radius (RMS). */
export const CIRCLE_RMS_TOLERANCE = 0.01;
/** Fewer distinct points than this is a polygon, not a circle (a square's four corners are concyclic). */
export const MIN_CIRCLE_POINTS = 12;

function circumcircle(a: Vec3, b: Vec3, c: Vec3): { center: Vec3; radius: number; normal: Vec3 } | null {
  const u = vsub(b, a);
  const v = vsub(c, a);
  const w = vcross(u, v);
  const w2 = vdot(w, w);
  if (w2 < 1e-12) return null;
  const t = vsub(vscale(v, vdot(u, u)), vscale(u, vdot(v, v)));
  const center = vadd(a, vscale(vcross(t, w), 1 / (2 * w2)));
  const normal = vnormalize(w);
  return normal ? { center, radius: vdist(center, a), normal } : null;
}

/** Fit a circle to flat xyz points; null unless it fits within 1% RMS. */
export function fitCircle(xyz: ArrayLike<number>): CircleFit | null {
  const n = Math.floor(xyz.length / 3);
  if (n < MIN_CIRCLE_POINTS) return null;
  const at = (i: number): Vec3 => [xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]];
  const base = circumcircle(at(0), at(Math.floor(n / 3)), at(Math.floor((2 * n) / 3)));
  if (!base || base.radius < 1e-6) return null;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (vdist(at(i), base.center) - base.radius) ** 2;
  const rms = Math.sqrt(sum / n);
  return rms <= CIRCLE_RMS_TOLERANCE * base.radius ? { ...base, rms } : null;
}
