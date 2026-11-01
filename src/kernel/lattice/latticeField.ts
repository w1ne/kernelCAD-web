// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/latticeField.ts
//
// TPMS level samples on the grid, in the lattice's own frame.
//
// `cartesian`: cells are aligned with the frame axes (world axes, or the
// part's local frame when the host is a transformed primitive).
// `cylindrical`: cells wrap around the frame's Z axis — radial, around, and
// along the axis — with a whole number of cells around the circumference
// at the reference radius, so the pattern closes on itself with no seam.
// The around-direction gradient is scaled by the true arc length, so the
// first-order distance (and therefore the wall thickness) stays honest
// away from the reference radius.

import type { GridFrame } from './grid';
import { TPMS_KERNELS, type TpmsType } from './tpms';

type V3 = readonly [number, number, number];

export interface LatticeFrame {
  origin: V3;
  /** Orthonormal frame axes (rows): local x, y, z in world coordinates. */
  axes: readonly [V3, V3, V3];
  map: 'cartesian' | 'cylindrical';
  /** cylindrical: radius at which cells are exactly `cell` around, mm. */
  referenceRadius?: number;
}

export const WORLD_FRAME: LatticeFrame = {
  origin: [0, 0, 0],
  axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  map: 'cartesian',
};

export interface LevelSamples {
  /** Raw level value f at every grid point. */
  f: Float32Array;
  /** 1 / |grad f| (mm) at every grid point. */
  invGrad: Float32Array;
  /** cylindrical: cells around the circumference. */
  cellsAround?: number;
}

const TWO_PI = 2 * Math.PI;

export function cellsAroundFor(frame: LatticeFrame, cell: number): number {
  const r = frame.referenceRadius ?? cell;
  return Math.max(3, Math.round((TWO_PI * r) / cell));
}

/** Level value + gradient at one world point. `out` receives
 *  [f, |grad f| (mm^-1), and, when `out` has room, the world-frame unit
 *  gradient direction nx, ny, nz]. */
export function levelAt(
  type: TpmsType, cell: number, frame: LatticeFrame, around: number,
  x: number, y: number, z: number, scratch: Float64Array, out: Float64Array,
): void {
  const k = TWO_PI / cell;
  const [ax, ay, az] = frame.axes;
  const dx = x - frame.origin[0], dy = y - frame.origin[1], dz = z - frame.origin[2];
  const qx = dx * ax[0] + dy * ax[1] + dz * ax[2];
  const qy = dx * ay[0] + dy * ay[1] + dz * ay[2];
  const qz = dx * az[0] + dy * az[1] + dz * az[2];
  if (frame.map === 'cylindrical') {
    const r = Math.hypot(qx, qy);
    const theta = Math.atan2(qy, qx);
    TPMS_KERNELS[type](r * k, theta * around, qz * k, scratch);
    // d(theta * around)/d(arc) = around / r, against k for the other axes.
    const s = around / (k * Math.max(r, cell / 4));
    out[0] = scratch[0];
    out[1] = k * Math.hypot(scratch[1], scratch[2] * s, scratch[3]);
    if (out.length >= 5) {
      // Local gradient: radial, tangential, axial -> local xyz -> world.
      const c = r > 0 ? qx / r : 1, sn = r > 0 ? qy / r : 0;
      const gr = scratch[1], gt = scratch[2] * s;
      toWorld(frame, gr * c - gt * sn, gr * sn + gt * c, scratch[3], out);
    }
    return;
  }
  TPMS_KERNELS[type](qx * k, qy * k, qz * k, scratch);
  out[0] = scratch[0];
  out[1] = k * Math.hypot(scratch[1], scratch[2], scratch[3]);
  if (out.length >= 5) toWorld(frame, scratch[1], scratch[2], scratch[3], out);
}

function toWorld(frame: LatticeFrame, lx: number, ly: number, lz: number, out: Float64Array): void {
  const [ax, ay, az] = frame.axes;
  const wx = lx * ax[0] + ly * ay[0] + lz * az[0];
  const wy = lx * ax[1] + ly * ay[1] + lz * az[1];
  const wz = lx * ax[2] + ly * ay[2] + lz * az[2];
  const len = Math.hypot(wx, wy, wz) || 1;
  out[2] = wx / len; out[3] = wy / len; out[4] = wz / len;
}

/** Sample f and 1/|grad f| over the whole grid. */
export function sampleLevels(type: TpmsType, cell: number, frame: LatticeFrame, g: GridFrame): LevelSamples {
  const n = g.nx * g.ny * g.nz;
  const f = new Float32Array(n);
  const invGrad = new Float32Array(n);
  const around = frame.map === 'cylindrical' ? cellsAroundFor(frame, cell) : 0;
  const scratch = new Float64Array(4);
  const out = new Float64Array(2);
  const minGrad = (TWO_PI / cell) * 1e-3;
  let idx = 0;
  for (let kk = 0; kk < g.nz; kk++) {
    const z = g.origin[2] + kk * g.h;
    for (let j = 0; j < g.ny; j++) {
      const y = g.origin[1] + j * g.h;
      for (let i = 0; i < g.nx; i++, idx++) {
        levelAt(type, cell, frame, around, g.origin[0] + i * g.h, y, z, scratch, out);
        f[idx] = out[0];
        invGrad[idx] = 1 / Math.max(out[1], minGrad);
      }
    }
  }
  return frame.map === 'cylindrical' ? { f, invGrad, cellsAround: around } : { f, invGrad };
}
