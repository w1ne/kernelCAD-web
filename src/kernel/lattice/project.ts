// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/project.ts
//
// Vertex refinement: marching tetrahedra places each vertex by linear
// interpolation of grid samples, which on a cell/8 grid leaves the walls
// thinner than designed where the TPMS level set curves. One Newton step
// on the ANALYTIC lattice field (its value is a first-order distance, so the
// step is value x unit gradient), clamped to a quarter grid step so no
// triangle can fold, moves every lattice-dominated vertex back onto the
// exact level set. Vertices held by the body / skin term stay put.

/** Fills out[0] = value (mm, first-order distance), out[1..3] = unit
 *  gradient direction; returns false when this point is not governed by
 *  the lattice term (leave the vertex alone). */
export type LatticeTerm = (x: number, y: number, z: number, out: Float64Array) => boolean;

export function projectVertices(positions: Float32Array, term: LatticeTerm, maxStep: number): void {
  const out = new Float64Array(4);
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v], y = positions[v + 1], z = positions[v + 2];
    if (!term(x, y, z, out)) continue;
    const s = Math.max(-maxStep, Math.min(maxStep, out[0]));
    positions[v] = x - s * out[1];
    positions[v + 1] = y - s * out[2];
    positions[v + 2] = z - s * out[3];
  }
}
