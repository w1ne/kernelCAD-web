// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/dynamics/spatial.ts
//
// Small vector helpers and a bounded wrench allocator.
// Thrusters are force arrows in the body frame. The allocator picks a
// throttle in [0, 1] for each so the set matches a requested force and
// torque. If the set cannot, the residual is returned and nothing is
// silently clipped into a success.

export type Vec3 = readonly [number, number, number];

export function vadd(a: Vec3, b: Vec3): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vscale(a: Vec3, s: number): [number, number, number] {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vdot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vcross(a: Vec3, b: Vec3): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vnorm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function vunit(a: Vec3): [number, number, number] {
  const n = vnorm(a);
  if (n === 0) return [0, 0, 0];
  return [a[0] / n, a[1] / n, a[2] / n];
}

/** Row-major 3x3. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export function matVec(m: Mat3, v: Vec3): [number, number, number] {
  return [
    vdot(m[0], v),
    vdot(m[1], v),
    vdot(m[2], v),
  ];
}

export function transpose(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

export function quatToMat(q: readonly [number, number, number, number]): Mat3 {
  const [w, x, y, z] = q;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

export function integrateQuat(
  q: readonly [number, number, number, number],
  omega: Vec3,
  dt: number,
): [number, number, number, number] {
  const [w, x, y, z] = q;
  const [wx, wy, wz] = omega;
  const next: [number, number, number, number] = [
    w + 0.5 * (-x * wx - y * wy - z * wz) * dt,
    x + 0.5 * (w * wx + y * wz - z * wy) * dt,
    y + 0.5 * (w * wy + z * wx - x * wz) * dt,
    z + 0.5 * (w * wz + x * wy - y * wx) * dt,
  ];
  const n = Math.hypot(next[0], next[1], next[2], next[3]) || 1;
  return [next[0] / n, next[1] / n, next[2] / n, next[3] / n];
}

export interface ThrusterColumn {
  readonly name: string;
  /** Position of the force relative to the centre of mass, metres, body frame. */
  readonly positionM: Vec3;
  /** Unit direction of the force on the body. */
  readonly direction: Vec3;
}

export interface Allocation {
  readonly throttle: Record<string, number>;
  /** RMS of (achieved - requested) over the 6-vector. Newtons and newton-metres share the norm. */
  readonly residual: number;
  readonly achieved: readonly [number, number, number, number, number, number];
}

function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] ?? 0]);
  let norm = 0;
  for (const row of m) {
    for (let c = 0; c < n; c++) norm = Math.max(norm, Math.abs(row[c] ?? 0));
  }
  // Absolute 1e-12 drops a newton-scale Gram matrix whose ridge is only
  // 1e-8 of the diagonal. Compare the pivot with the matrix itself.
  const floor = 1e-12 * Math.max(norm, 1);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r]?.[c] ?? 0) > Math.abs(m[pivot]?.[c] ?? 0)) pivot = r;
    }
    const pivotRow = m[pivot];
    const colRow = m[c];
    if (pivotRow === undefined || colRow === undefined || Math.abs(pivotRow[c] ?? 0) < floor) return null;
    m[c] = pivotRow;
    m[pivot] = colRow;
    const div = m[c]?.[c] ?? 1;
    for (let k = c; k <= n; k++) {
      const row = m[c];
      if (row) row[k] = (row[k] ?? 0) / div;
    }
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const row = m[r];
      const src = m[c];
      if (row === undefined || src === undefined) continue;
      const f = row[c] ?? 0;
      for (let k = c; k <= n; k++) row[k] = (row[k] ?? 0) - f * (src[k] ?? 0);
    }
  }
  return m.map(row => row[n] ?? 0);
}

/**
 * Least-squares throttles in [0, 1] for `wrench` = [Fx, Fy, Fz, Tx, Ty, Tz]
 * in the body frame. `maxThrustN[i]` is the thrust of thruster i at throttle 1
 * right now. Saturated thrusters are removed and the rest are resolved again.
 */
export function allocateWrench(
  thrusters: readonly ThrusterColumn[],
  maxThrustN: readonly number[],
  wrench: readonly [number, number, number, number, number, number],
): Allocation {
  const n = thrusters.length;
  const active = thrusters.map((_, i) => (maxThrustN[i] ?? 0) > 1e-9);
  const throttle = thrusters.map(() => 0);
  const columns = thrusters.map((t, i) => {
    const f = vscale(t.direction, maxThrustN[i] ?? 0);
    const tau = vcross(t.positionM, f);
    return [...f, ...tau];
  });

  for (let iter = 0; iter < n + 1; iter++) {
    const idx: number[] = [];
    for (let i = 0; i < n; i++) if (active[i]) idx.push(i);
    if (idx.length === 0) break;
    const k = idx.length;
    const ata = Array.from({ length: k }, () => Array<number>(k).fill(0));
    const atb = Array<number>(k).fill(0);
    for (let r = 0; r < 6; r++) {
      for (let a = 0; a < k; a++) {
        const ia = idx[a] ?? 0;
        atb[a] = (atb[a] ?? 0) + (columns[ia]?.[r] ?? 0) * wrench[r];
        for (let b = 0; b < k; b++) {
          const ib = idx[b] ?? 0;
          const row = ata[a];
          if (row) row[b] = (row[b] ?? 0) + (columns[ia]?.[r] ?? 0) * (columns[ib]?.[r] ?? 0);
        }
      }
    }
    let diag = 0;
    for (let d = 0; d < k; d++) diag = Math.max(diag, Math.abs(ata[d]?.[d] ?? 0));
    // Relative ridge. An absolute 1e-8 is lost in roundoff once a column
    // is thousands of newtons, and the solve then returns no throttle.
    const ridge = 1e-8 * Math.max(diag, 1);
    for (let d = 0; d < k; d++) {
      const row = ata[d];
      if (row) row[d] = (row[d] ?? 0) + ridge;
    }
    const sol = solveLinear(ata, atb);
    if (sol === null) break;
    let clipped = false;
    for (let a = 0; a < k; a++) {
      const i = idx[a] ?? 0;
      const value = sol[a] ?? 0;
      if (value < 0) {
        active[i] = false;
        throttle[i] = 0;
        clipped = true;
      } else if (value > 1) {
        active[i] = false;
        throttle[i] = 1;
        clipped = true;
      } else {
        throttle[i] = value;
      }
    }
    if (!clipped) break;
  }

  const achieved: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  const byName: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const name = thrusters[i]?.name ?? String(i);
    byName[name] = throttle[i] ?? 0;
    for (let r = 0; r < 6; r++) achieved[r] += (throttle[i] ?? 0) * (columns[i]?.[r] ?? 0);
  }
  let residualSq = 0;
  for (let r = 0; r < 6; r++) residualSq += (achieved[r] - wrench[r]) ** 2;
  return { throttle: byName, residual: Math.sqrt(residualSq), achieved };
}
