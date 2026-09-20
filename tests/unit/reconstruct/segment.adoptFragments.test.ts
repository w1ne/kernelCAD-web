// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/segment.adoptFragments.test.ts
//
// Characterisation tests for adoptFragments (via segmentMesh): a cylinder tube
// whose facet strips are soft planes, plus a floating small plane lying exactly
// on the cylinder surface. Pins the adoption result before the phase split.

import { describe, expect, it } from 'vitest';
import { segmentMesh } from '../../../src/agent/reconstruct/segment';
import type { IndexedMesh } from '../../../src/agent/reconstruct/meshClean';

type Triplet = [number, number, number];

function buildMesh(positions: number[], tris: number[]): IndexedMesh {
  const triCount = tris.length / 3;
  const normals = new Float64Array(triCount * 3);
  const areas = new Float64Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const a = tris[t * 3] * 3;
    const b = tris[t * 3 + 1] * 3;
    const c = tris[t * 3 + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    areas[t] = len / 2;
    normals[t * 3] = nx / len;
    normals[t * 3 + 1] = ny / len;
    normals[t * 3 + 2] = nz / len;
  }
  const neighbors = new Int32Array(triCount * 3).fill(-1);
  const edgeMap = new Map<string, number[]>();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const u = tris[t * 3 + k];
      const v = tris[t * 3 + ((k + 1) % 3)];
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      const arr = edgeMap.get(key) ?? [];
      arr.push(t * 3 + k);
      edgeMap.set(key, arr);
    }
  }
  for (const arr of edgeMap.values()) {
    if (arr.length !== 2) continue;
    const [a, b] = arr;
    neighbors[a] = (b - (b % 3)) / 3;
    neighbors[b] = (a - (a % 3)) / 3;
  }
  const min: Triplet = [Infinity, Infinity, Infinity];
  const max: Triplet = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }
  return {
    positions: Float64Array.from(positions),
    triangles: Uint32Array.from(tris),
    normals,
    areas,
    neighbors,
    bbox: { min, max },
  };
}

function tube(R: number, H: number, N: number): { positions: number[]; tris: number[] } {
  const positions: number[] = [];
  const tris: number[] = [];
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < N; i++) {
      const th = (i / N) * 2 * Math.PI;
      positions.push(R * Math.cos(th), R * Math.sin(th), j * H);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = i;
    const b = (i + 1) % N;
    const c = N + ((i + 1) % N);
    const d = N + i;
    tris.push(a, b, c, a, c, d);
  }
  return { positions, tris };
}

/** A 2-triangle chord patch whose 4 corners lie exactly on the R cylinder. */
function onSurfacePatch(R: number, z: number, startDeg: number, spanDeg: number): { positions: number[]; tris: number[] } {
  const positions: number[] = [];
  const a0 = (startDeg * Math.PI) / 180;
  const a1 = ((startDeg + spanDeg) * Math.PI) / 180;
  const p0: Triplet = [R * Math.cos(a0), R * Math.sin(a0), z];
  const p1: Triplet = [R * Math.cos(a1), R * Math.sin(a1), z];
  const p2: Triplet = [R * Math.cos(a0), R * Math.sin(a0), z - 0.5];
  const p3: Triplet = [R * Math.cos(a1), R * Math.sin(a1), z - 0.5];
  positions.push(...p0, ...p1, ...p2, ...p3);
  return { positions, tris: [0, 1, 2, 1, 3, 2] };
}

function merge(parts: Array<{ positions: number[]; tris: number[] }>): { positions: number[]; tris: number[] } {
  const positions: number[] = [];
  const tris: number[] = [];
  let base = 0;
  for (const p of parts) {
    positions.push(...p.positions);
    tris.push(...p.tris.map((t) => t + base));
    base += p.positions.length / 3;
  }
  return { positions, tris };
}

describe('adoptFragments characterisation', () => {
  it('fits a bare tube as one full-coverage cylinder', () => {
    const soup = tube(100, 4, 52);
    const seg = segmentMesh(buildMesh(soup.positions, soup.tris));
    expect(seg.planes).toHaveLength(0);
    expect(seg.cylinders).toHaveLength(1);
    expect(seg.freeform).toHaveLength(0);
    expect(seg.toleranceMm).toBeCloseTo(0.07071774883294857, 9);
    expect(seg.noiseMm).toBe(0);
    expect(seg.totalArea).toBeCloseTo(2511.7454927671, 9);
    const c = seg.cylinders[0];
    expect(c.radius).toBeCloseTo(100, 9);
    expect(c.coverageRad).toBeCloseTo(6.1623548205030545, 9);
    expect(c.tris).toHaveLength(104);
    expect(c.tMin).toBe(0);
    expect(c.tMax).toBe(4);
    expect(c.concave).toBe(false);
  });

  it('adopts a small plane lying on the cylinder surface', () => {
    const soup = merge([tube(100, 4, 52), onSurfacePatch(100, 2, 2, 8)]);
    const seg = segmentMesh(buildMesh(soup.positions, soup.tris));
    expect(seg.planes).toHaveLength(0);
    expect(seg.cylinders).toHaveLength(1);
    expect(seg.freeform).toHaveLength(0);
    expect(seg.totalArea).toBeCloseTo(2518.721140141513, 9);
    const c = seg.cylinders[0];
    expect(c.radius).toBeCloseTo(100, 9);
    expect(c.coverageRad).toBeCloseTo(6.1623548205030545, 9);
    expect(c.area).toBeCloseTo(2518.7211401415097, 9);
    expect(c.tris).toHaveLength(106);
    expect(c.tMin).toBe(0);
    expect(c.tMax).toBe(4);
    expect(c.concave).toBe(false);
    expect(seg.planeOf.filter((x) => x >= 0)).toHaveLength(0);
    expect(seg.cylinderOf.filter((x) => x >= 0)).toHaveLength(106);
  });
});
