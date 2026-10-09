// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Stress field -> infill bands, on known fields (no solver needed).

import { describe, it, expect } from 'vitest';
import {
  buildStressInfill,
  classifyStress,
  DEFAULT_INFILL_BANDS,
  estimateInfillSaving,
  makeWellComposed,
  validateInfillBands,
  voxelSurface,
  type InfillMesh,
} from '../../../src/kernel/fea/infillBands';
import { measureMeshDefects } from '../../../src/kernel/backends/occt/meshHeal';
import type { FeaFieldResult, FeaMesh, FeaTet10 } from '../../../src/kernel/fea/types';

/** A box [0,L]x[0,W]x[0,H] split into unit cubes of edge `h`, 6 tets each. */
function boxMesh(L: number, W: number, H: number, h: number): FeaMesh {
  const nx = Math.round(L / h), ny = Math.round(W / h), nz = Math.round(H / h);
  const nodes = new Map<number, readonly [number, number, number]>();
  const id = (i: number, j: number, k: number) => 1 + i + (nx + 1) * (j + (ny + 1) * k);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    nodes.set(id(i, j, k), [i * h, j * h, k * h]);
  }
  const elements: FeaTet10[] = [];
  // Kuhn split of a cube into 6 tets along the 000-111 diagonal.
  const paths = [[1, 2, 4], [1, 4, 2], [2, 1, 4], [2, 4, 1], [4, 1, 2], [4, 2, 1]];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    for (const p of paths) {
      let c = 0;
      const corners = [id(i, j, k)];
      for (const bit of p) {
        c |= bit;
        corners.push(id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)));
      }
      elements.push({ id: elements.length + 1, nodes: corners });
    }
  }
  // One skin surface: the 6 outer faces as triangles (for the area).
  const tris: Array<[number, number, number]> = [];
  const quad = (a: number, b: number, c: number, d: number) => { tris.push([a, b, c], [a, c, d]); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    quad(id(i, j, 0), id(i + 1, j, 0), id(i + 1, j + 1, 0), id(i, j + 1, 0));
    quad(id(i, j, nz), id(i + 1, j, nz), id(i + 1, j + 1, nz), id(i, j + 1, nz));
  }
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    quad(id(i, 0, k), id(i + 1, 0, k), id(i + 1, 0, k + 1), id(i, 0, k + 1));
    quad(id(i, ny, k), id(i + 1, ny, k), id(i + 1, ny, k + 1), id(i, ny, k + 1));
  }
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
    quad(id(0, j, k), id(0, j + 1, k), id(0, j + 1, k + 1), id(0, j, k + 1));
    quad(id(nx, j, k), id(nx, j + 1, k), id(nx, j + 1, k + 1), id(nx, j, k + 1));
  }
  return {
    nodes,
    elements,
    surfaces: [{ tag: 1, centroid: [L / 2, W / 2, H / 2], area: 0, nodes: [], tris }],
    quality: { minSICN: 1, meanSICN: 1, lowQualityCount: 0, lowQualityThreshold: 0.1 },
    meshSize: h,
  };
}

function field(mesh: FeaMesh, vm: (p: readonly number[]) => number): FeaFieldResult {
  const nodeIds = [...mesh.nodes.keys()];
  return {
    nodeIds,
    displacement: nodeIds.map(() => [0, 0, 0] as const),
    vonMises: nodeIds.map((n) => vm(mesh.nodes.get(n)!)),
    stressErrorPercent: [],
  };
}

/** Closed, manifold, consistently oriented, outward, single fan per vertex. */
function expectSolidMesh(m: InfillMesh): number {
  const report = measureMeshDefects(m);
  expect(report.openEdges).toBe(0);
  expect(report.nonManifoldEdges).toBe(0);
  // Orientation: every directed edge used exactly once.
  const directed = new Set<string>();
  for (let t = 0; t < m.triangles.length; t += 3) {
    for (const [u, v] of [[0, 1], [1, 2], [2, 0]]) {
      const key = `${m.triangles[t + u]}>${m.triangles[t + v]}`;
      expect(directed.has(key)).toBe(false);
      directed.add(key);
    }
  }
  // Vertex manifoldness: the triangles around each vertex form ONE fan.
  const around = new Map<number, Array<[number, number]>>();
  for (let t = 0; t < m.triangles.length; t += 3) {
    const tri = [m.triangles[t], m.triangles[t + 1], m.triangles[t + 2]];
    for (let s = 0; s < 3; s++) {
      const list = around.get(tri[s]) ?? [];
      list.push([tri[(s + 1) % 3], tri[(s + 2) % 3]]);
      around.set(tri[s], list);
    }
  }
  for (const fan of around.values()) {
    const next = new Map(fan.map(([a, b]) => [a, b]));
    let cur = fan[0][0];
    let steps = 0;
    do { cur = next.get(cur)!; steps++; } while (cur !== fan[0][0] && steps <= fan.length);
    expect(steps).toBe(fan.length);
  }
  // Signed volume (divergence theorem) is positive: normals point out.
  let vol = 0;
  const V = m.vertices;
  for (let t = 0; t < m.triangles.length; t += 3) {
    const [a, b, c] = [m.triangles[t] * 3, m.triangles[t + 1] * 3, m.triangles[t + 2] * 3];
    vol += (V[a] * (V[b + 1] * V[c + 2] - V[b + 2] * V[c + 1])
      - V[a + 1] * (V[b] * V[c + 2] - V[b + 2] * V[c])
      + V[a + 2] * (V[b] * V[c + 1] - V[b + 1] * V[c])) / 6;
  }
  expect(vol).toBeGreaterThan(0);
  return vol;
}

describe('classifyStress', () => {
  it('bins by fraction of yield at the band edges', () => {
    const y = 60;
    expect(classifyStress(0, y, DEFAULT_INFILL_BANDS)).toBe(0);
    expect(classifyStress(0.149 * y, y, DEFAULT_INFILL_BANDS)).toBe(0);
    expect(classifyStress(0.15 * y, y, DEFAULT_INFILL_BANDS)).toBe(1);
    expect(classifyStress(0.399 * y, y, DEFAULT_INFILL_BANDS)).toBe(1);
    expect(classifyStress(0.4 * y, y, DEFAULT_INFILL_BANDS)).toBe(2);
    expect(classifyStress(5 * y, y, DEFAULT_INFILL_BANDS)).toBe(2);
  });

  it('rejects unusable band tables', () => {
    expect(validateInfillBands(DEFAULT_INFILL_BANDS)).toBeUndefined();
    expect(validateInfillBands([{ name: 'a', fromYield: 0, densityPercent: 10 }])).toMatch(/at least 2/);
    expect(validateInfillBands([
      { name: 'a', fromYield: 0.1, densityPercent: 10 },
      { name: 'b', fromYield: 0.2, densityPercent: 20 },
    ])).toMatch(/must be 0/);
    expect(validateInfillBands([
      { name: 'a', fromYield: 0, densityPercent: 10 },
      { name: 'b', fromYield: 0, densityPercent: 20 },
    ])).toMatch(/strictly increase/);
    expect(validateInfillBands([
      { name: 'a', fromYield: 0, densityPercent: 10 },
      { name: 'b', fromYield: 0.2, densityPercent: 120 },
    ])).toMatch(/0-100/);
  });
});

describe('buildStressInfill on a known field', () => {
  // 60 x 20 x 10 mm bar, stress rising linearly along X from 0 to yield.
  const L = 60;
  const mesh = boxMesh(L, 20, 10, 2);
  const yieldMPa = 60;
  const fields = field(mesh, (p) => (p[0] / L) * yieldMPa);
  const r = buildStressInfill(mesh, fields, yieldMPa, { cellMm: 2.5 });

  it('splits the volume in the analytic proportions', () => {
    const [low, mid, high] = r.bands;
    // x/L < 0.15 -> 15 %, 0.15..0.40 -> 25 %, > 0.40 -> 60 % (element-mean
    // binning on a 2 mm mesh moves each edge by under one element).
    expect(low.stressVolumePercent).toBeCloseTo(15, -1);
    expect(mid.stressVolumePercent).toBeCloseTo(25, -1);
    expect(high.stressVolumePercent).toBeCloseTo(60, -1);
    const sum = r.bands.reduce((a, b) => a + b.stressVolumePercent, 0);
    expect(sum).toBeCloseTo(100, 6);
    expect(r.bands.reduce((a, b) => a + b.printedVolumePercent, 0)).toBeCloseTo(100, 6);
  });

  it('errs toward more infill, never less', () => {
    const [, mid, high] = r.bands;
    expect(high.printedVolumePercent).toBeGreaterThanOrEqual(high.stressVolumePercent - 1e-9);
    expect(high.printedVolumePercent + mid.printedVolumePercent)
      .toBeGreaterThanOrEqual(high.stressVolumePercent + mid.stressVolumePercent - 1e-9);
  });

  it('has no modifier for the base band and watertight modifiers above it', () => {
    expect(r.bands[0].modifier).toBeUndefined();
    const midVol = expectSolidMesh(r.bands[1].modifier!);
    const highVol = expectSolidMesh(r.bands[2].modifier!);
    // Nested: the mid modifier contains the high one.
    expect(midVol).toBeGreaterThan(highVol);
    // The high modifier reaches the loaded end and stays out of the low end.
    const xs = r.bands[2].modifier!.vertices.filter((_, i) => i % 3 === 0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(L);
    expect(Math.min(...xs)).toBeGreaterThan(0.3 * L);
  });

  it('estimates a saving against uniform infill at the high density', () => {
    expect(r.saving.uniformDensityPercent).toBe(60);
    expect(r.saving.partVolumeMm3).toBeCloseTo(60 * 20 * 10, 3);
    expect(r.saving.surfaceAreaMm2).toBeCloseTo(2 * (60 * 20 + 60 * 10 + 20 * 10), 3);
    expect(r.saving.gradedMaterialMm3).toBeLessThan(r.saving.uniformMaterialMm3);
    expect(r.saving.materialSavingPercent).toBeGreaterThan(0);
    expect(r.saving.timeSavingPercent).toBeGreaterThan(0);
  });

  it('reports no saving when everything is in the high band', () => {
    const s = estimateInfillSaving(1000, 600, [0, 0, 1], DEFAULT_INFILL_BANDS, 0.9, 1.24);
    expect(s.materialSavingPercent).toBeCloseTo(0, 9);
    expect(s.uniformGrams).toBeCloseTo(s.gradedGrams!, 9);
  });
});

describe('well-composed growth', () => {
  const n: [number, number, number] = [8, 8, 8];
  const at = (i: number, j: number, k: number) => i + 8 * (j + 8 * k);

  it('closes an edge-only contact into a manifold solid', () => {
    const occ = new Uint8Array(512);
    occ[at(3, 3, 3)] = 1;
    occ[at(4, 4, 3)] = 1; // touches the first cell along one edge only
    expect(makeWellComposed(occ, n)).toBeGreaterThan(0);
    expectSolidMesh(voxelSurface(occ, n, [0, 0, 0], 1));
  });

  it('closes a corner-only contact into a manifold solid', () => {
    const occ = new Uint8Array(512);
    occ[at(3, 3, 3)] = 1;
    occ[at(4, 4, 4)] = 1;
    makeWellComposed(occ, n);
    expectSolidMesh(voxelSurface(occ, n, [0, 0, 0], 1));
  });

  it('leaves a well-composed set alone', () => {
    const occ = new Uint8Array(512);
    for (let i = 2; i < 5; i++) occ[at(i, 3, 3)] = 1;
    expect(makeWellComposed(occ, n)).toBe(0);
    const vol = expectSolidMesh(voxelSurface(occ, n, [0, 0, 0], 2));
    expect(vol).toBeCloseTo(3 * 8, 9);
  });

  it('always yields a solid on random noise', () => {
    let seed = 12345;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let trial = 0; trial < 20; trial++) {
      const occ = new Uint8Array(512);
      for (let k = 2; k < 6; k++) for (let j = 2; j < 6; j++) for (let i = 2; i < 6; i++) {
        if (rand() < 0.35) occ[at(i, j, k)] = 1;
      }
      makeWellComposed(occ, n);
      const m = voxelSurface(occ, n, [0, 0, 0], 1);
      if (m.triangles.length === 0) continue;
      // A well-composed set may still be several disjoint solids; each one
      // is closed and manifold, which the checks below cover.
      const report = measureMeshDefects(m);
      expect(report.openEdges).toBe(0);
      expect(report.nonManifoldEdges).toBe(0);
    }
  });
});

describe('support zone in the infill bands', () => {
  it('prints every element touching a support-zone node in the top band', () => {
    const mesh = boxMesh(20, 10, 10, 2);
    // A uniformly low field: everything would be the base band.
    const fields = field(mesh, () => 1);
    const plain = buildStressInfill(mesh, fields, 50);
    expect(plain.bands[2].stressVolumePercent).toBe(0);
    // The clamped x = 0 end: its nodes are the support zone.
    const zone = new Set([...mesh.nodes].filter(([, p]) => p[0] === 0).map(([id]) => id));
    const graded = buildStressInfill(mesh, fields, 50, { supportAdjacent: zone });
    // One 2 mm cell layer of a 20 mm bar: 10 % of the volume.
    expect(graded.bands[2].stressVolumePercent).toBeCloseTo(10, 6);
    expect(graded.bands[2].modifier).toBeDefined();
  });
});

