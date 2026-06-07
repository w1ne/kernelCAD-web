// tests/unit/dfm/minWall.test.ts
//
// Min-wall thickness check (W3 Task 5): inward ray sampling over the
// export-grade mesh. Exercises:
//   - a uniformly thin plate (violation, one cluster) and a thick-enough
//     plate (clean),
//   - a shelled cube at both sides of its 1 mm wall thickness,
//   - parallel plates across a 1 mm AIR gap (clean — gap is not a wall),
//   - a synthetic inverted-winding mesh that forces a cast across the air
//     gap, proving the midpoint inside-test arm rejects it,
//   - cluster separation (two pockets at opposite corners → two clusters),
//   - the cap-at-10 / descending-severity contract on 12 distinct thin spots,
//   - deterministic stride subsampling above 150k triangles (also the
//     densest-mesh timing reference for the DFM budget).

import { describe, it, expect, beforeAll } from 'vitest';
import { checkMinWall } from '../../../src/modeling/runtime/dfm/minWall';
import type { DfmMesh } from '../../../src/modeling/runtime/dfm/meshBvh';
import {
  initOcct,
  OcctBackend,
  meshShapeForExport,
} from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

/** Build an inline script and return its export-grade mesh (the Task 3
 *  recipe: buildModel → root OcctBackend → meshShapeForExport). */
async function exportMesh(code: string): Promise<DfmMesh> {
  const model = await buildModel({ fileName: 'minwall.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const shape = (model.rootShape as OcctBackend).getReplicadShape();
  return meshShapeForExport(shape);
}

/** Hand-built axis-aligned box mesh with outward winding: 8 vertices,
 *  12 triangles. Appends into `vertices` / `triangles` so several boxes can
 *  share one DfmMesh (disjoint solids, single mesh). */
function appendBox(
  vertices: number[],
  triangles: number[],
  x0: number, y0: number, z0: number,
  w: number, h: number, t: number,
): void {
  const base = vertices.length / 3;
  const x1 = x0 + w, y1 = y0 + h, z1 = z0 + t;
  vertices.push(
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, // 0-3 bottom ring
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, // 4-7 top ring
  );
  // Outward winding throughout (verified by cross products):
  const local = [
    0, 2, 1, 0, 3, 2, // bottom (-z)
    4, 5, 6, 4, 6, 7, // top (+z)
    0, 1, 5, 0, 5, 4, // y = y0 (-y)
    3, 7, 6, 3, 6, 2, // y = y1 (+y)
    0, 4, 7, 0, 7, 3, // x = x0 (-x)
    1, 2, 6, 1, 6, 5, // x = x1 (+x)
  ];
  for (const i of local) triangles.push(base + i);
}

describe('checkMinWall — OCCT export meshes', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  it('flags a 1 mm plate against minWall 1.5 as ONE cluster at ~1.0 mm', async () => {
    const mesh = await exportMesh('return box(20, 20, 1);');
    const res = checkMinWall(mesh, 1.5);

    // The box meshes to 12 triangles; every triangle is sampled.
    expect(res.sampleCount).toBe(12);
    // 4 thin samples (2 top + 2 bottom) agree on one uniformly thin region.
    expect(res.violations).toHaveLength(1);
    const v = res.violations[0];
    expect(v.thicknessMm).toBeCloseTo(1.0, 3);
    expect(v.location[2]).toBeGreaterThanOrEqual(0);
    expect(v.location[2]).toBeLessThanOrEqual(1);
    expect(v.sampleCount).toBe(4);
    expect(res.thinnestMm).toBeCloseTo(1.0, 3);
  });

  it('passes a 2 mm plate against minWall 1.5', async () => {
    const mesh = await exportMesh('return box(20, 20, 2);');
    const res = checkMinWall(mesh, 1.5);
    expect(res.violations).toEqual([]);
    expect(res.thinnestMm).toBeCloseTo(2.0, 3);
  });

  it('flags a 10 mm cube shelled to 1 mm walls against minWall 1.5, passes at 0.8', async () => {
    const mesh = await exportMesh("return box(10, 10, 10).shell(1, { face: 'top' });");
    const fail = checkMinWall(mesh, 1.5);
    expect(fail.violations.length).toBeGreaterThanOrEqual(1);
    expect(fail.violations[0].thicknessMm).toBeCloseTo(1.0, 3);

    const pass = checkMinWall(mesh, 0.8);
    expect(pass.violations).toEqual([]);
    expect(pass.thinnestMm).toBeCloseTo(1.0, 3);
  });

  it('does NOT flag a 1 mm AIR gap between two 3 mm plates (single mesh)', async () => {
    // One part: union of two disjoint plates 1 mm apart. The thin segment
    // between them is air, not material — minWall must stay clean.
    const mesh = await exportMesh(
      'return box(20, 20, 3).union(box(20, 20, 3).translate(0, 0, 4));',
    );
    const res = checkMinWall(mesh, 1.5);
    expect(res.violations).toEqual([]);
    // Thinnest measured WALL is each plate's 3 mm, not the 1 mm gap.
    expect(res.thinnestMm).toBeCloseTo(3.0, 3);
  });

  it('reports a plate thin at two opposite corners as TWO clusters with their own worst spots', async () => {
    // 40×40×5 plate with a 4 mm deep 6×6 pocket near each of two opposite
    // corners → 1 mm floor under each pocket; everything else ≥ 2 mm.
    const mesh = await exportMesh(
      'return box(40, 40, 5).subtract(box(6, 6, 4).translate(2, 2, 1)).subtract(box(6, 6, 4).translate(32, 32, 1));',
    );
    const res = checkMinWall(mesh, 1.5);
    expect(res.violations).toHaveLength(2);
    const sorted = [...res.violations].sort((a, b) => a.location[0] - b.location[0]);
    // Each cluster sits on its pocket floor (z = 1) with ~1 mm walls.
    for (const v of sorted) {
      expect(v.thicknessMm).toBeCloseTo(1.0, 3);
      expect(v.location[2]).toBeCloseTo(1.0, 6);
      expect(v.sampleCount).toBe(2); // two floor triangles per pocket
    }
    // Worst spots are in their respective pockets, ~40 mm apart.
    expect(sorted[0].location[0]).toBeGreaterThan(2);
    expect(sorted[0].location[0]).toBeLessThan(8);
    expect(sorted[1].location[0]).toBeGreaterThan(32);
    expect(sorted[1].location[0]).toBeLessThan(38);
    expect(res.thinnestMm).toBeCloseTo(1.0, 3);
  });
});

describe('checkMinWall — synthetic meshes', () => {
  it('rejects an air-gap crossing via the midpoint inside-test (inverted winding)', () => {
    // Two 4 mm cubes, 1 mm apart, ONE mesh. The lower cube's gap-facing top
    // face is wound INWARD, so its "inward" cast actually launches across
    // the air gap and hits the upper cube at t ≈ 1 < 1.5. The midpoint of
    // that segment is in air — the inside test must reject the sample.
    const vertices: number[] = [];
    const triangles: number[] = [];
    appendBox(vertices, triangles, 0, 0, 0, 4, 4, 4); // lower: z 0..4
    appendBox(vertices, triangles, 0, 0, 5, 4, 4, 4); // upper: z 5..9
    // Flip the lower cube's top face (local tris 2 and 3 → indices 6..11).
    [triangles[7], triangles[8]] = [triangles[8], triangles[7]];
    [triangles[10], triangles[11]] = [triangles[11], triangles[10]];

    const res = checkMinWall({ vertices, triangles }, 1.5);
    expect(res.violations).toEqual([]);
    // The 1 mm air crossing is excluded from thinnest: real walls are 4 mm.
    expect(res.thinnestMm).toBeCloseTo(4.0, 3);
  });

  it('caps reported clusters at 10, ordered by descending severity', () => {
    // 12 disjoint 5×5 slabs with thicknesses 0.1 .. 1.2 mm — 12 distinct
    // thin regions, all violating minWall 1.5.
    const vertices: number[] = [];
    const triangles: number[] = [];
    for (let k = 0; k < 12; k++) {
      appendBox(vertices, triangles, 10 * k, 0, 0, 5, 5, 0.1 * (k + 1));
    }
    // Append a zero-area sliver: must be skipped, not cast.
    const b = vertices.length / 3;
    vertices.push(200, 0, 0, 201, 0, 0, 202, 0, 0);
    triangles.push(b, b + 1, b + 2);

    const res = checkMinWall({ vertices, triangles }, 1.5);
    expect(res.sampleCount).toBe(12 * 12); // sliver skipped
    expect(res.violations).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(res.violations[i].thicknessMm).toBeCloseTo(0.1 * (i + 1), 3);
      expect(res.violations[i].sampleCount).toBe(4); // 2 top + 2 bottom tris
    }
    for (let i = 1; i < 10; i++) {
      expect(res.violations[i].thicknessMm).toBeGreaterThan(res.violations[i - 1].thicknessMm);
    }
    expect(res.thinnestMm).toBeCloseTo(0.1, 3);
  });

  it('subsamples deterministically above 150k triangles (timing reference)', () => {
    // Watertight 274×274-cell slab, 1 mm thick: 2·274² top + bottom +
    // 4·274·2 side triangles = 302,496 → stride ceil(302496/150000) = 3.
    const n = 274;
    const vertices: number[] = [];
    const triangles: number[] = [];
    const top = (i: number, j: number): number => j * (n + 1) + i;
    const bot = (i: number, j: number): number => (n + 1) * (n + 1) + j * (n + 1) + i;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) vertices.push(i, j, 1);
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) vertices.push(i, j, 0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        // top (+z): CCW from above; bottom (−z): reversed.
        triangles.push(top(i, j), top(i + 1, j), top(i + 1, j + 1), top(i, j), top(i + 1, j + 1), top(i, j + 1));
        triangles.push(bot(i, j), bot(i + 1, j + 1), bot(i + 1, j), bot(i, j), bot(i, j + 1), bot(i + 1, j + 1));
      }
    }
    for (let i = 0; i < n; i++) {
      // y = 0 (−y) and y = n (+y)
      triangles.push(bot(i, 0), bot(i + 1, 0), top(i + 1, 0), bot(i, 0), top(i + 1, 0), top(i, 0));
      triangles.push(bot(i, n), top(i, n), top(i + 1, n), bot(i, n), top(i + 1, n), bot(i + 1, n));
    }
    for (let j = 0; j < n; j++) {
      // x = 0 (−x) and x = n (+x)
      triangles.push(bot(0, j), top(0, j), top(0, j + 1), bot(0, j), top(0, j + 1), bot(0, j + 1));
      triangles.push(bot(n, j), top(n, j + 1), top(n, j), bot(n, j), bot(n, j + 1), top(n, j + 1));
    }
    const numTris = triangles.length / 3;
    expect(numTris).toBe(302496);

    const t0 = performance.now();
    const res = checkMinWall({ vertices, triangles }, 1.5);
    const elapsed = performance.now() - t0;
    console.log(`checkMinWall on ${numTris} tris: ${elapsed.toFixed(0)} ms, ${res.sampleCount} rays`);

    // Fixed stride from index 0: ceil(302496 / 3) rays — reproducible.
    expect(res.sampleCount).toBe(Math.ceil(numTris / 3));
    expect(res.violations.length).toBeGreaterThanOrEqual(1);
    expect(res.violations.length).toBeLessThanOrEqual(10);
    expect(res.violations[0].thicknessMm).toBeCloseTo(1.0, 3);
    expect(res.thinnestMm).toBeCloseTo(1.0, 3);
    // Determinism: identical input ⇒ identical report.
    const again = checkMinWall({ vertices, triangles }, 1.5);
    expect(again).toEqual(res);
  }, 60000);

  it('returns the empty result on an empty mesh', () => {
    const res = checkMinWall({ vertices: [], triangles: [] }, 1.5);
    expect(res.violations).toEqual([]);
    expect(res.sampleCount).toBe(0);
    expect(res.thinnestMm).toBe(Infinity);
  });
});
