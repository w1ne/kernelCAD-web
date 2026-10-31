// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { importStlBytes } from './importStl';
import { makeDrawingCamera, prepareShapeForDrawing, projectShapeForDrawing } from './drawingProjection';
import { extractDrawingMesh, joinRuns, projectDrawingMesh } from './drawingMeshProjection';
import type { Polyline2 } from './drawingLayout';

beforeAll(async () => {
  await initOcct();
});

type P3 = [number, number, number];

/** Binary STL of the given triangles. */
function stl(triangles: Array<[P3, P3, P3]>): Uint8Array {
  const buf = new ArrayBuffer(84 + 50 * triangles.length);
  const view = new DataView(buf);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((tri, i) => {
    let o = 84 + 50 * i + 12;
    for (const p of tri) {
      for (const c of p) {
        view.setFloat32(o, c, true);
        o += 4;
      }
    }
  });
  return new Uint8Array(buf);
}

/** Closed faceted cylinder on the z axis, `n` sides, z in [0, h]. `phase`
 *  turns the vertices by that fraction of a side. */
function facetedCylinder(r: number, h: number, n: number, phase = 0): Array<[P3, P3, P3]> {
  const at = (k: number, z: number): P3 => {
    const a = ((k + phase) / n) * 2 * Math.PI;
    return [r * Math.cos(a), r * Math.sin(a), z];
  };
  const tris: Array<[P3, P3, P3]> = [];
  for (let k = 0; k < n; k += 1) {
    const a0 = at(k, 0);
    const a1 = at(k + 1, 0);
    const b0 = at(k, h);
    const b1 = at(k + 1, h);
    tris.push([a0, a1, b1], [a0, b1, b0]);
    tris.push([[0, 0, h], b0, b1], [[0, 0, 0], a1, a0]);
  }
  return tris;
}

const length = (lines: Polyline2[]): number =>
  lines.reduce((sum, l) => {
    for (let i = 1; i < l.length; i += 1) sum += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
    return sum;
  }, 0);

describe('mesh projection of a faceted cylinder', () => {
  // Front view looks along +y: a faceted cylinder of radius 10 and height 30
  // reads as a 20 x 30 rectangle. Its caps meet the sides at 90° (creases,
  // drawn sharp); the side seams are flatter than the crease angle, so only
  // the two silhouette seams are drawn, as outline.
  for (const phase of [0, 0.5]) {
    it(`draws only the outline (phase ${phase})`, () => {
      const imported = importStlBytes(stl(facetedCylinder(10, 30, 64, phase)));
      const mesh = extractDrawingMesh(imported.backend.getReplicadShape().wrapped);
      expect(mesh.facets).toBe(256);
      const view = projectDrawingMesh(mesh, makeDrawingCamera('front'));
      // Caps: the near half of each rim is visible, the far half hidden
      // behind the body; each projects onto a ~20 mm line.
      const sharp = length(view.visibleSharp);
      expect(sharp).toBeGreaterThan(2 * 19.9);
      expect(sharp).toBeLessThan(2 * 20.1);
      expect(length(view.visibleOutline)).toBeCloseTo(60, 1);
      expect(view.visibleSmooth).toEqual([]);
      expect(length(view.hiddenSharp)).toBeGreaterThan(2 * 19.9);
    });
  }

  it('hides one body behind another', () => {
    const front = facetedCylinder(10, 30, 64);
    const back = facetedCylinder(10, 30, 64).map(t => t.map(([x, y, z]) => [x + 5, y + 40, z]) as [P3, P3, P3]);
    const imported = importStlBytes(stl([...front, ...back]));
    const view = projectDrawingMesh(extractDrawingMesh(imported.backend.getReplicadShape().wrapped), makeDrawingCamera('front'));
    // The back body's left silhouette (x = -5) is behind the front body;
    // its right one (x = 15) is in the open.
    const at = (lines: Polyline2[], x: number) => length(lines.filter(l => l.every(p => Math.abs(p[0] - x) < 1e-6)));
    expect(at(view.hiddenOutline, -5)).toBeCloseTo(30, 1);
    expect(at(view.visibleOutline, -5)).toBe(0);
    expect(at(view.visibleOutline, 15)).toBeCloseTo(30, 1);
  });

  it('is chosen for mesh-derived shapes', () => {
    const imported = importStlBytes(stl(facetedCylinder(10, 30, 600)));
    const source = prepareShapeForDrawing(imported.backend.getReplicadShape() as never);
    try {
      expect(source.mode).toBe('mesh');
    } finally {
      source.dispose();
    }
  });
});

/** Share of points sampled every 0.1 mm along `a` that lie within `tol` of
 *  some segment of `b`. */
function coveredBy(a: Polyline2[], b: Polyline2[], tol: number): number {
  const segs: Array<[readonly [number, number], readonly [number, number]]> = [];
  for (const l of b) for (let i = 1; i < l.length; i += 1) segs.push([l[i - 1], l[i]]);
  const near = (x: number, y: number): boolean => segs.some(([p, q]) => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const t = Math.min(1, Math.max(0, ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] + t * dx - x, p[1] + t * dy - y) <= tol;
  });
  let total = 0;
  let hit = 0;
  for (const l of a) {
    for (let i = 1; i < l.length; i += 1) {
      const n = Math.max(1, Math.ceil(Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]) / 0.1));
      for (let k = 0; k < n; k += 1) {
        const t = (k + 0.5) / n;
        total += 1;
        if (near(l[i - 1][0] + t * (l[i][0] - l[i - 1][0]), l[i - 1][1] + t * (l[i][1] - l[i - 1][1]))) hit += 1;
      }
    }
  }
  return total === 0 ? 1 : hit / total;
}

describe('mesh projection of B-rep faces', () => {
  it('draws the same visible lines as exact HLR on a filleted, bored part', () => {
    let body = replicad.makeBaseBox(60, 40, 12).fillet(3);
    for (const [x, y] of [[-20, -10], [20, -10], [-20, 10], [20, 10]]) {
      body = body.cut(replicad.makeCylinder(3, 40).translate(x, y, -5));
    }
    body = body.fuse(replicad.makeCylinder(8, 20).translate(0, 0, 12));
    try {
      for (const v of ['front', 'top', 'iso'] as const) {
        const exact = projectShapeForDrawing(body, makeDrawingCamera(v));
        const source = prepareShapeForDrawing(body, { meshMinFaces: 1 });
        const mesh = source.project(makeDrawingCamera(v));
        source.dispose();
        expect(source.mode).toBe('mesh');
        const visible = (e: typeof exact) => [...e.visibleSharp, ...e.visibleOutline, ...e.visibleSmooth];
        // Within the triangulation's tolerance, each method's visible lines
        // lie on the other's.
        expect(coveredBy(visible(exact), visible(mesh), 0.1)).toBeGreaterThan(0.97);
        expect(coveredBy(visible(mesh), visible(exact), 0.1)).toBeGreaterThan(0.97);
      }
    } finally {
      body.delete();
    }
  });
});

describe('joinRuns', () => {
  it('joins runs that meet end to end, and only two at a time', () => {
    const joined = joinRuns([
      [[0, 0], [1, 0]],
      [[2, 0], [1, 0]],
      [[2, 0], [3, 0]],
      [[5, 5], [6, 6]],
    ]);
    expect(joined).toHaveLength(2);
    expect(joined[0]).toEqual([[3, 0], [2, 0], [1, 0], [0, 0]]);
    // A T junction stays three lines.
    expect(joinRuns([[[0, 0], [1, 0]], [[1, 0], [2, 0]], [[1, 0], [1, 1]]])).toHaveLength(3);
  });
});
