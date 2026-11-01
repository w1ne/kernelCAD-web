// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/grid.ts
//
// Regular sample grid shared by the body distance field, the lattice field
// and the isosurface mesher.

export interface GridFrame {
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly origin: readonly [number, number, number];
  /** Spacing, mm (same on every axis). */
  readonly h: number;
}

/** Grid covering [min, max] padded by `pad` grid steps on every side, so the
 *  outermost samples lie strictly outside the body. */
export function gridAround(
  min: readonly [number, number, number],
  max: readonly [number, number, number],
  h: number,
  pad = 2,
): GridFrame {
  const n = (a: number): number => Math.max(2, Math.ceil((max[a] - min[a]) / h) + 1 + 2 * pad);
  const nx = n(0), ny = n(1), nz = n(2);
  // Centre the padded grid on the box so the padding is symmetric.
  const o = (a: number, count: number): number => (min[a] + max[a]) / 2 - ((count - 1) * h) / 2;
  return { nx, ny, nz, origin: [o(0, nx), o(1, ny), o(2, nz)], h };
}

export function gridPoint(g: GridFrame, index: number): [number, number, number] {
  const i = index % g.nx;
  const j = Math.floor(index / g.nx) % g.ny;
  const k = Math.floor(index / (g.nx * g.ny));
  return [g.origin[0] + i * g.h, g.origin[1] + j * g.h, g.origin[2] + k * g.h];
}
