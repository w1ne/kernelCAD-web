// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// TPMS lattice kernel: field correctness, watertight/oriented output, volume
// vs analytic expectation, skin thickness, grading monotonicity, decimation
// topology, and a performance guard.

import { describe, expect, it } from 'vitest';
import {
  networkFractionForLevel,
  networkLevelForFraction,
  sheetFractionForWall,
  sheetWallForFraction,
  TPMS_AREA_PER_CELL,
  tpmsDistance,
  tpmsValue,
  TPMS_TYPES,
} from '../../../src/kernel/lattice/tpms';
import { buildLatticeSolid, type LatticeBuildSpec } from '../../../src/kernel/lattice/buildLattice';
import { WORLD_FRAME, levelAt } from '../../../src/kernel/lattice/latticeField';
import { meshIsosurface } from '../../../src/kernel/lattice/marchingTets';
import { meshMass, meshTopology } from '../../../src/kernel/lattice/meshMetrics';
import { decimateMesh } from '../../../src/kernel/lattice/decimate';
import { gridAround } from '../../../src/kernel/lattice/grid';
import { bodySignedDistance } from '../../../src/kernel/lattice/bodyDistance';

/** Axis-aligned box mesh centred on the origin, outward wound. */
function boxMesh(sx: number, sy = sx, sz = sx): { vertices: number[]; triangles: number[] } {
  const [x, y, z] = [sx / 2, sy / 2, sz / 2];
  return {
    vertices: [-x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z, -x, -y, z, x, -y, z, x, y, z, -x, y, z],
    triangles: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7],
  };
}

function spec(over: Partial<LatticeBuildSpec>): LatticeBuildSpec {
  return { type: 'gyroid', variant: 'sheet', cell: 6, value: 0.8, skin: 1.2, frame: WORLD_FRAME, ...over };
}

describe('TPMS fields', () => {
  it('gyroid / Schwarz-P / diamond have their known zero sets and signs', () => {
    // Gyroid: sin x cos y + sin y cos z + sin z cos x — zero at the origin,
    // +1 at (a/4, 0, 0) (sin(pi/2) cos 0), -1 at (-a/4, 0, 0).
    expect(tpmsValue('gyroid', 6, [0, 0, 0])).toBeCloseTo(0, 12);
    expect(tpmsValue('gyroid', 6, [1.5, 0, 0])).toBeCloseTo(1, 12);
    expect(tpmsValue('gyroid', 6, [-1.5, 0, 0])).toBeCloseTo(-1, 12);
    // Schwarz-P: cos x + cos y + cos z — 3 at the origin, -3 at the cell centre,
    // zero on the plane x + y + z symmetric point (a/4, a/4, a/4) (cos(pi/2) = 0).
    expect(tpmsValue('schwarzP', 6, [0, 0, 0])).toBeCloseTo(3, 12);
    expect(tpmsValue('schwarzP', 6, [3, 3, 3])).toBeCloseTo(-3, 12);
    expect(tpmsValue('schwarzP', 6, [1.5, 1.5, 1.5])).toBeCloseTo(0, 12);
    // Diamond: zero at the origin, sign flips across it along (1, 1, 1).
    expect(tpmsValue('diamond', 6, [0, 0, 0])).toBeCloseTo(0, 12);
    expect(Math.sign(tpmsValue('diamond', 6, [0.3, 0.3, 0.3]))).toBe(-Math.sign(tpmsValue('diamond', 6, [-0.3, -0.3, -0.3])));
  });

  it('every type is periodic with the cell', () => {
    for (const t of TPMS_TYPES) {
      const p: [number, number, number] = [0.7, 1.9, -2.3];
      expect(tpmsValue(t, 5, [p[0] + 5, p[1] - 10, p[2] + 15])).toBeCloseTo(tpmsValue(t, 5, p), 9);
    }
  });

  it('first-order distance matches the true distance near the surface', () => {
    // Walk from the gyroid zero at the origin along the gradient: d ~ s.
    const out = new Float64Array(5), scratch = new Float64Array(4);
    levelAt('gyroid', 6, WORLD_FRAME, 0, 0, 0, 0, scratch, out);
    const n = [out[2], out[3], out[4]];
    for (const s of [0.05, 0.1, 0.2, 0.4]) {
      // First order: within 10 % of the travelled distance up to a wall-scale offset.
      expect(Math.abs(tpmsDistance('gyroid', 6, [n[0] * s, n[1] * s, n[2] * s]) - s)).toBeLessThan(0.1 * s);
    }
  });

  it('solid-fraction maps are monotone and invert each other', () => {
    expect(networkFractionForLevel('gyroid', 0)).toBeCloseTo(0.5, 2);
    for (const phi of [0.15, 0.3, 0.5, 0.7]) {
      expect(networkFractionForLevel('schwarzP', networkLevelForFraction('schwarzP', phi))).toBeCloseTo(phi, 2);
      expect(sheetFractionForWall('diamond', 6, sheetWallForFraction('diamond', 6, phi))).toBeCloseTo(phi, 2);
    }
    // Thin-sheet limit: fraction ~ area per cell * wall / cell.
    const w = 0.3;
    expect(sheetFractionForWall('gyroid', 6, w)).toBeCloseTo(TPMS_AREA_PER_CELL.gyroid * w / 6, 1);
  });
});

describe('meshing', () => {
  it('marching tetrahedra closes a sphere with consistent winding and the right volume', () => {
    const g = gridAround([-10, -10, -10], [10, 10, 10], 0.5);
    const v = new Float32Array(g.nx * g.ny * g.nz);
    let i = 0;
    for (let k = 0; k < g.nz; k++) for (let j = 0; j < g.ny; j++) for (let q = 0; q < g.nx; q++, i++) {
      v[i] = Math.hypot(g.origin[0] + q * g.h, g.origin[1] + j * g.h, g.origin[2] + k * g.h) - 10;
    }
    const m = meshIsosurface({ ...g, values: v });
    const topo = meshTopology(m.positions.length / 3, m.indices);
    expect(topo.consistentOrientation).toBe(true);
    expect(topo.euler).toBe(2);
    expect(Math.abs(meshMass(m.positions, m.indices).volumeMm3 / ((4 / 3) * Math.PI * 1000) - 1)).toBeLessThan(0.003);
    const d = decimateMesh(m.positions, m.indices, { tolerance: 0.05 });
    expect(d.indices.length).toBeLessThan(m.indices.length * 0.8);
    const dt = meshTopology(d.positions.length / 3, d.indices);
    expect(dt.consistentOrientation).toBe(true);
    expect(dt.euler).toBe(2);
    expect(Math.abs(meshMass(d.positions, d.indices).volumeMm3 / meshMass(m.positions, m.indices).volumeMm3 - 1)).toBeLessThan(0.003);
  });

  it('body distance is exact near the surface and signed by parity', () => {
    const g = gridAround([-10, -10, -10], [10, 10, 10], 0.5);
    const B = bodySignedDistance(boxMesh(20), g, { band: 3, far: true });
    const at = (x: number, y: number, z: number): number => {
      const i = Math.round((x - g.origin[0]) / g.h), j = Math.round((y - g.origin[1]) / g.h), k = Math.round((z - g.origin[2]) / g.h);
      return B[i + g.nx * (j + g.ny * k)];
    };
    expect(at(9, 0, 0)).toBeCloseTo(-1, 5);
    expect(at(10.5, 0, 0)).toBeCloseTo(0.5, 5);
    expect(at(0, 0, 0)).toBeLessThan(-8.5);
  });
});

describe('lattice solid', () => {
  it('is watertight, consistently oriented, and keeps the skin', () => {
    const r = buildLatticeSolid(boxMesh(24), spec({}));
    expect(r.report.watertight).toBe(true);
    expect(r.report.consistentOrientation).toBe(true);
    const topo = meshTopology(r.positions.length / 3, r.indices);
    expect(topo.openEdges + topo.nonManifoldEdges + topo.flippedEdges).toBe(0);
    expect(r.report.measuredSkinMm!.p5Mm).toBeGreaterThan(1.2 - r.report.gridStepMm / 2);
    expect(r.report.measuredSkinMm!.medianMm).toBeCloseTo(1.2, 1);
    // Measured sheet wall within ~10 % of the 0.8 mm design.
    expect(r.report.measuredWallMm!.medianMm).toBeGreaterThan(0.72);
    expect(r.report.measuredWallMm!.medianMm).toBeLessThan(0.88);
    expect(r.report.volumeMm3).toBeCloseTo(meshMass(r.positions, r.indices).volumeMm3, 3);
  });

  it('solid fraction matches the analytic expectation (open cells, no skin)', () => {
    // Integer number of periods: network at fraction 0.5 fills half the box.
    const net = buildLatticeSolid(boxMesh(24), spec({ variant: 'network', value: 0.5, skin: 0 }));
    expect(net.report.watertight).toBe(true);
    expect(net.report.solidFraction).toBeGreaterThan(0.47);
    expect(net.report.solidFraction).toBeLessThan(0.53);
    // Sheet: the sampled-cell fraction for the wall, within 4 points.
    const sheet = buildLatticeSolid(boxMesh(24), spec({ type: 'schwarzP', skin: 0 }));
    expect(sheet.report.consistentOrientation).toBe(true);
    expect(Math.abs(sheet.report.solidFraction - sheetFractionForWall('schwarzP', 6, 0.8))).toBeLessThan(0.04);
  });

  it('every TPMS type builds a closed solid', () => {
    for (const type of TPMS_TYPES) {
      for (const variant of ['sheet', 'network'] as const) {
        const r = buildLatticeSolid(boxMesh(14), spec({ type, variant, value: variant === 'sheet' ? 0.8 : 0.35, skin: 1 }));
        expect(r.report.consistentOrientation, `${type} ${variant}`).toBe(true);
        expect(r.report.solidFraction, `${type} ${variant}`).toBeGreaterThan(0.2);
      }
    }
  });

  it('distance-from-surface grading thickens walls monotonically toward the surface', () => {
    const graded = buildLatticeSolid(boxMesh(30), spec({ grade: { kind: 'distance', source: 'surface', near: 2, far: 0.8, over: 10 } }));
    const plain = buildLatticeSolid(boxMesh(30), spec({}));
    expect(graded.report.consistentOrientation).toBe(true);
    expect(graded.report.designWallMm!.max).toBeGreaterThan(1.8);
    expect(graded.report.designWallMm!.min).toBeCloseTo(0.8, 1);
    expect(graded.report.volumeMm3).toBeGreaterThan(plain.report.volumeMm3);
    // Solid fraction per depth shell decreases from the surface inward.
    const shells = shellFractions(graded.positions, graded.indices, 15, [2, 6, 10, 14]);
    for (let s = 1; s < shells.length; s++) expect(shells[s]).toBeLessThan(shells[s - 1] + 0.02);
    expect(shells[0] - shells[shells.length - 1]).toBeGreaterThan(0.1);
  });

  it('follows a rotated part frame', () => {
    const c = Math.SQRT1_2;
    const rotated = { ...WORLD_FRAME, axes: [[c, c, 0], [-c, c, 0], [0, 0, 1]] as const };
    const r = buildLatticeSolid(boxMesh(14), spec({ frame: rotated }));
    expect(r.report.consistentOrientation).toBe(true);
  });

  it('cylindrical frame wraps a whole number of cells around', () => {
    const r = buildLatticeSolid(boxMesh(30, 30, 12), spec({
      frame: { ...WORLD_FRAME, map: 'cylindrical', referenceRadius: 10 }, skin: 1,
    }));
    expect(r.report.cellsAround).toBe(Math.round((2 * Math.PI * 10) / 6));
    expect(r.report.consistentOrientation).toBe(true);
  });

  it('performance guard: 30 mm gyroid cube under budget', () => {
    const t0 = performance.now();
    const r = buildLatticeSolid(boxMesh(30), spec({}));
    const ms = performance.now() - t0;
    expect(r.report.watertight).toBe(true);
    // ~1 s on a dev box (60 mm: ~1.6 s field + mesh, ~5 s decimation).
    expect(ms).toBeLessThan(20_000);
    expect(r.report.triangles).toBeLessThan(600_000);
  });
});

/** Solid fraction in depth shells below the surface of a cube of half-size
 *  `half`, by sampling points inside the mesh (ray parity). */
function shellFractions(P: Float32Array, I: Uint32Array, half: number, depths: number[]): number[] {
  const g = gridAround([-half, -half, -half], [half, half, half], 0.37, 0);
  const inside = bodySignedDistance({ vertices: P, triangles: I }, g, { band: 0.01 });
  const counts = depths.map(() => [0, 0]);
  for (let idx = 0; idx < inside.length; idx++) {
    const i = idx % g.nx, j = Math.floor(idx / g.nx) % g.ny, k = Math.floor(idx / (g.nx * g.ny));
    const p = [g.origin[0] + i * g.h, g.origin[1] + j * g.h, g.origin[2] + k * g.h];
    const depth = half - Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
    const s = depths.findIndex((d) => Math.abs(depth - d) < 1);
    if (s < 0) continue;
    counts[s][1]++;
    if (inside[idx] < 0) counts[s][0]++;
  }
  return counts.map(([a, b]) => a / Math.max(b, 1));
}
