// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/rigidBodyLoads.ts
//
// The one joint-load calculator. `checkStaticHold` (quasi-static, joint
// primitives) and `checkMotionLoad` (mates + animation tracks, inverse
// dynamics) both call `subtreeJointWrench`, so there is one torque formula.
//
// Units: SI throughout (m, kg, N, N·m, s). Callers convert from mm.
//
// Newton-Euler on rigid bodies. For the bodies downstream of a joint, the
// wrench the joint (through its supports and actuator) applies ON that
// subtree, reduced to the joint origin o, is
//
//   F = Σ m_i (a_i − g) − Σ F_ext
//   M = Σ [ (c_i − o) × m_i (a_i − g) + I_i α_i + ω_i × (I_i ω_i) ]
//       − Σ (p_k − o) × F_ext,k − Σ M_ext,k
//
// With a_i = α_i = ω_i = 0 this is the static hold load.

export type V3 = readonly [number, number, number];
/** Row-major 3x3. */
export type M3 = readonly [V3, V3, V3];

export interface BodyLoadState {
  readonly massKg: number;
  /** World centre of mass, m. */
  readonly comM: V3;
  /** World-frame inertia about the CoM, kg·m². Omit for a point mass. */
  readonly inertiaWorld?: M3;
  /** CoM linear acceleration, m/s². Default 0. */
  readonly accM?: V3;
  /** Angular velocity, rad/s. Default 0. */
  readonly omega?: V3;
  /** Angular acceleration, rad/s². Default 0. */
  readonly alpha?: V3;
}

export interface PointLoad {
  /** World application point, m. */
  readonly pointM: V3;
  /** Force applied ON the body, N. */
  readonly forceN: V3;
  /** Pure moment applied ON the body, N·m. */
  readonly momentNm?: V3;
}

export interface Wrench {
  readonly forceN: V3;
  readonly momentNm: V3;
}

export const ZERO: V3 = [0, 0, 0];

export function add(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a: V3, s: number): V3 { return [a[0] * s, a[1] * s, a[2] * s]; }
export function dot(a: V3, b: V3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function norm(a: V3): number { return Math.hypot(a[0], a[1], a[2]); }
export function unit(a: V3): V3 { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; }
export function mulMV(m: M3, v: V3): V3 { return [dot(m[0], v), dot(m[1], v), dot(m[2], v)]; }

/** R · I · Rᵀ, where R's columns are the body axes in world. */
export function rotateInertia(r: M3, inertia: M3): M3 {
  const ri: V3[] = [0, 1, 2].map((i) => [0, 1, 2].map((j) => dot(r[i], [inertia[0][j], inertia[1][j], inertia[2][j]])) as unknown as V3);
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => dot(ri[i], r[j]))) as unknown as M3;
}

/** Wrench the joint applies on the downstream subtree, reduced to `originM`. */
export function subtreeJointWrench(
  bodies: readonly BodyLoadState[],
  originM: V3,
  gravity: V3,
  loads: readonly PointLoad[] = [],
): Wrench {
  let force: V3 = ZERO;
  let moment: V3 = ZERO;
  for (const b of bodies) {
    if (!(b.massKg > 0)) continue;
    const inertial = scale(sub(b.accM ?? ZERO, gravity), b.massKg);
    force = add(force, inertial);
    moment = add(moment, cross(sub(b.comM, originM), inertial));
    if (b.inertiaWorld !== undefined) {
      const w = b.omega ?? ZERO;
      moment = add(moment, add(mulMV(b.inertiaWorld, b.alpha ?? ZERO), cross(w, mulMV(b.inertiaWorld, w))));
    }
  }
  for (const l of loads) {
    force = sub(force, l.forceN);
    moment = sub(moment, cross(sub(l.pointM, originM), l.forceN));
    if (l.momentNm !== undefined) moment = sub(moment, l.momentNm);
  }
  return { forceN: force, momentNm: moment };
}

export interface SupportStation {
  readonly name: string;
  /** Signed distance along the joint axis from the joint origin, m. */
  readonly stationM: number;
}

export interface SupportShare {
  readonly name: string;
  readonly stationM: number;
  /** Radial (perpendicular to the axis) force this support applies, N. */
  readonly radialN: number;
  /** Bending moment the support must react about its own station, N·m.
   *  Zero for each of two simple supports (the pair reacts it as a couple). */
  readonly bendingNm: number;
}

export interface JointLoadSplit {
  /** Actuator torque about the axis, N·m (signed, along `axis`). */
  readonly torqueNm: number;
  /** Axial force (along the axis), N, carried by the actuator support. */
  readonly axialN: number;
  /** Total radial force, N. */
  readonly radialN: number;
  /** Total bending moment about the joint origin, N·m. */
  readonly bendingAtOriginNm: number;
  /** Per-support shares; `undefined` when the split is indeterminate
   *  (three or more distinct stations, or two at the same station). */
  readonly supports?: readonly SupportShare[];
}

/**
 * Split a joint wrench over coaxial supports. One support carries the whole
 * radial force and the bending moment about its station. Two supports at
 * distinct stations react the bending moment as a radial couple (simple
 * supports, statically determinate). More stations are indeterminate in a
 * rigid model, so no split is returned.
 */
export function splitJointLoad(w: Wrench, axisIn: V3, stations: readonly SupportStation[]): JointLoadSplit {
  const axis = unit(axisIn);
  const torqueNm = dot(w.momentNm, axis);
  const axialN = dot(w.forceN, axis);
  const fr = sub(w.forceN, scale(axis, axialN));
  const mb = sub(w.momentNm, scale(axis, torqueNm));
  const base = { torqueNm, axialN, radialN: norm(fr), bendingAtOriginNm: norm(mb) };
  if (stations.length === 1) {
    const s = stations[0];
    const mAt = sub(mb, cross(scale(axis, s.stationM), fr));
    return { ...base, supports: [{ name: s.name, stationM: s.stationM, radialN: norm(fr), bendingNm: norm(mAt) }] };
  }
  if (stations.length === 2 && Math.abs(stations[0].stationM - stations[1].stationM) > 1e-6) {
    const [s1, s2] = stations;
    // s1·R1 + s2·R2 = mb × axis ; R1 + R2 = fr
    const wv = cross(mb, axis);
    const r2 = scale(sub(wv, scale(fr, s1.stationM)), 1 / (s2.stationM - s1.stationM));
    const r1 = sub(fr, r2);
    return {
      ...base,
      supports: [
        { name: s1.name, stationM: s1.stationM, radialN: norm(r1), bendingNm: 0 },
        { name: s2.name, stationM: s2.stationM, radialN: norm(r2), bendingNm: 0 },
      ],
    };
  }
  return base;
}
