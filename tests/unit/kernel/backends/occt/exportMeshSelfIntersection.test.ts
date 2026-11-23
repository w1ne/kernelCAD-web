// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/exportMeshSelfIntersection.test.ts
//
// Export meshes of correct solids must pass open3d's `is_watertight()`,
// which fails on any triangle pair its float triangle-triangle test reports.
// OCCT's tessellation of cones, cylinders split along their rulings, and
// loft faces holds coplanar triangle rows and caps that trip that test once
// the STL rounds vertices to float32 (cqe benchmark tasks 04, 12, 14, 15).
// meshShapeForExport removes them (meshCleanup.ts) without moving the
// surface.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, type OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';
import { meshShapeForExport } from '../../../../../src/kernel/backends/occt/backendMesh';
import { verifyWatertight } from '../../../../../src/kernel/backends/occt/meshHeal';
import { runScript } from '../../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../../src/modeling/backends/occt/occtLowerer';
import { open3dSelfIntersectingPairs } from './open3dSelfIntersection';

// Correct solutions of the cqe tasks whose export used to fail is_watertight.
const PARTS: Array<[string, string]> = [
  ['chamfered pin (cqe task04)', `
    const head = cylinder(20, 17.5);
    const shaft = cylinder(60.1, 10).translate(0, 0, 19.9);
    const pin = head.union(shaft);
    const bottomRim = await selectEdges(pin, { ofCurveType: 'CIRCLE', near: [17.5, 0, 0] });
    return pin.chamfer(2, bottomRim);`],
  ['t-handle (cqe task12)', `
    let shank = cylinder(60, 7.5);
    shank = shank.hole('bottom', { u: 0, v: 0, diameter: 8, depth: 25 });
    shank = shank.chamfer(1, { face: { byNormal: '-Z' } });
    return shank.union(cylinder(60, 2.5).rotateY(90).translate(-30, 0, 54.5));`],
  ['half-revolved triangle (cqe task14)', `
    const apex = 30 * Math.sin(Math.PI / 3);
    return path().moveTo(30, 0).lineTo(60, 0).lineTo(45, apex).close().revolve({ angleDeg: 180 });`],
  ['square-to-circle loft (cqe task15)', `
    const square = path().moveTo(-15, -15).lineTo(15, -15).lineTo(15, 15).lineTo(-15, 15).close();
    return square.loft(path().circle(0, 0, 20), { spacing: 40 });`],
];

async function solid(code: string): Promise<replicad.Shape3D> {
  const { records } = await runScript({ code, fileName: 'part.kcad.ts' });
  const result = await new RecomputeEngine(new OcctLowerer()).run(records);
  const shape = result.shapes.get(records[records.length - 1].id) as OcctBackend;
  return shape.getReplicadShape();
}

function volume(mesh: { vertices: number[]; triangles: number[] }): number {
  const V = mesh.vertices, T = mesh.triangles;
  let s = 0;
  for (let t = 0; t < T.length; t += 3) {
    const a = 3 * T[t], b = 3 * T[t + 1], c = 3 * T[t + 2];
    s += V[a] * (V[b + 1] * V[c + 2] - V[b + 2] * V[c + 1])
      - V[a + 1] * (V[b] * V[c + 2] - V[b + 2] * V[c])
      + V[a + 2] * (V[b] * V[c + 1] - V[b + 1] * V[c]);
  }
  return s / 6;
}

describe('export mesh passes open3d self-intersection check', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it.each(PARTS)('%s', async (_name, code) => {
    const shape = await solid(code);
    const mesh = meshShapeForExport(shape);
    expect(verifyWatertight(mesh).ok).toBe(true);
    // STL stores float32: check what a reader of the file sees.
    const stlVertices = mesh.vertices.map(Math.fround);
    expect(open3dSelfIntersectingPairs(stlVertices, mesh.triangles)).toEqual([]);
    // The cleanup must not move the surface: mesh volume still matches the solid.
    const solidVolume = replicad.measureVolume(shape);
    expect(Math.abs(volume(mesh) - solidVolume) / solidVolume).toBeLessThan(2e-3);
  }, 60_000);
});
