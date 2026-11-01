// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/grade.ts
//
// Grading fields: the lattice parameter (sheet wall in mm, or network solid
// fraction) as a function of position.
//
//   - distance: `near` at a source, blending smoothly (smoothstep) to `far`
//     over `over` mm. Source 'surface' = depth below the skin's inner face
//     (distance transform of the body); a mesh source = unsigned distance to
//     those triangles (e.g. the walls of the part's holes).
//   - sampled: the caller supplies the value per point (stress-graded bands
//     from an FEA field, or any other field).

import { bandDistance, type BodyMesh } from './bodyDistance';
import type { GridFrame } from './grid';

export type LatticeGrade =
  | {
      kind: 'distance';
      source: 'surface' | BodyMesh;
      /** Value at the source. */
      near: number;
      /** Value `over` mm (or more) away. */
      far: number;
      over: number;
    }
  | {
      kind: 'sampled';
      /** Smallest value the sampler returns (sizes the grid for thin walls). */
      near: number;
      value: (x: number, y: number, z: number) => number;
    };

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
}

export function buildGradeField(
  grade: LatticeGrade, g: GridFrame, B: Float32Array, _body: BodyMesh, skin = 0,
): Float32Array {
  const out = new Float32Array(B.length);
  if (grade.kind === 'sampled') {
    let idx = 0;
    for (let k = 0; k < g.nz; k++) for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++, idx++) {
      out[idx] = grade.value(g.origin[0] + i * g.h, g.origin[1] + j * g.h, g.origin[2] + k * g.h);
    }
    return out;
  }
  const { near, far, over } = grade;
  if (grade.source === 'surface') {
    for (let i = 0; i < B.length; i++) out[i] = near + (far - near) * smoothstep((-B[i] - skin) / over);
    return out;
  }
  const d = bandDistance(grade.source, g, over);
  for (let i = 0; i < B.length; i++) out[i] = near + (far - near) * smoothstep(d[i] / over);
  return out;
}
