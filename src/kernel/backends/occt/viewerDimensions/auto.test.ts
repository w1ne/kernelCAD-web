// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Real-OCCT gate for the automatic viewer dimensions. kernelCAD's
// cylinder(height, radius): cylinder(20, 2.5) is a Ø5 bore 20 long.
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../occtBackend';
import { computeViewerDimensions, type ViewerDimension } from './index';
import type { WorldFramePart } from '../sceneToWorldFrame';
import { partsFromSource } from '../../../../../tests/helpers/viewerDimensionParts';

beforeAll(async () => { await initOcct(); }, 60_000);

const textsOf = (parts: WorldFramePart[], budgetMs?: number) =>
  computeViewerDimensions({ parts, declared: [], auto: true, budgetMs }).dimensions.map(d => d.text).sort();
const texts = (src: string) => partsFromSource(src).then(parts => textsOf(parts));
const dimsOf = (parts: WorldFramePart[], budgetMs?: number): ViewerDimension[] =>
  computeViewerDimensions({ parts, declared: [], auto: true, budgetMs }).dimensions;
const close = (v: readonly number[], want: readonly number[]) =>
  v.forEach((x, k) => expect(x).toBeCloseTo(want[k], 6));

/** 40 mm long T-bracket: a 40×40×10 base with a 10 thick, 40 tall wall at
 *  y 15..25, and one R5 inside fillet along X where the wall's +Y face meets
 *  the base. The concave arc is centred at y=30, z=15 (in the open corner).
 *  The bounding-box centre (20,20,20) lies inside the wall, so guessing the
 *  arc normal from it puts the centre at about (23.4, 15.4) instead. */
function tBracketWithInsideFillet(): WorldFramePart[] {
  const block = (x: number, y: number, z: number) => new OcctBackend(replicad.makeBaseBox(x, y, z).translate(x / 2, y / 2, 0) as replicad.Shape3D);
  const base = block(40, 40, 10);
  const wall = block(40, 10, 40).translate(0, 15, 0);
  const strip = block(40, 5, 5).translate(0, 25, 10)
    .subtract(new OcctBackend(replicad.makeCylinder(5, 40, [0, 30, 15], [1, 0, 0]) as replicad.Shape3D));
  return [{ name: 'part', shape: base.union(wall).union(strip) }];
}

describe('auto viewer dimensions', () => {
  it('plate with two Ø5 holes 30 apart', async () => {
    const parts = await partsFromSource(`return box(40,20,10)
      .subtract(cylinder(20,2.5).translate(5,10,-5))
      .subtract(cylinder(20,2.5).translate(35,10,-5));`);
    const dims = dimsOf(parts);
    expect(dims.map(d => d.text).sort()).toEqual(['10', '2× Ø5', '20', '30', '40'].sort());
    const spacing = dims.find(d => d.text === '30')!;
    expect([spacing.a[0], spacing.b[0]].sort((p, q) => p - q)).toEqual([5, 35]);
    expect(spacing.a[1]).toBeCloseTo(10, 6);
    expect(spacing.b[1]).toBeCloseTo(10, 6);
    const hole = dims.find(d => d.kind === 'diameter')!;
    expect([5, 35]).toContain(Math.round(hole.centre![0] * 1e6) / 1e6);
    expect(hole.centre![1]).toBeCloseTo(10, 6);
    expect([0, 10]).toContain(Math.round(hole.centre![2] * 1e6) / 1e6);
    // a/b sit on the rim, 5 apart, centred on the hole.
    expect(Math.hypot(hole.b[0] - hole.a[0], hole.b[1] - hole.a[1], hole.b[2] - hole.a[2])).toBeCloseTo(5, 6);
    close(hole.a.map((x, k) => (x + hole.b[k]) / 2), hole.centre!);
  });
  it('filleted block gives its radius at the true arc centre', async () => {
    // All 12 edges carry the same R3 fillet, so the radius group is counted
    // like the hole group (groupLabel) — '12× R3', not a bare 'R3'.
    const dims = dimsOf(await partsFromSource(`return box(30,30,30).fillet(3);`));
    const r = dims.find(d => d.kind === 'radius')!;
    expect(r.text).toBe('12× R3');
    const offAxis = r.centre!.filter(c => Math.abs(c - 3) < 1e-6 || Math.abs(c - 27) < 1e-6);
    expect(offAxis.length).toBeGreaterThanOrEqual(2);
    close(r.a, r.centre!);
    expect(Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1], r.b[2] - r.a[2])).toBeCloseTo(3, 6);
  });
  it('inside (concave) fillet on a T-bracket is centred on its real axis', () => {
    const dims = dimsOf(tBracketWithInsideFillet());
    const r = dims.find(d => d.kind === 'radius')!;
    expect(r.text).toBe('R5');
    expect(r.centre![1]).toBeCloseTo(30, 6);
    expect(r.centre![2]).toBeCloseTo(15, 6);
    expect(Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1], r.b[2] - r.a[2])).toBeCloseTo(5, 6);
  });
  it('chamfered block gives its chamfer size', async () => {
    expect(await texts(`return box(40,30,10).chamfer(1);`)).toContain('1×45°');
  });
  it('sphere gives overall only', async () => {
    expect(await texts(`return sphere(50);`)).toEqual(['100', '100', '100']);
  });
  it('assembly over 8 parts gives overall only', async () => {
    const parts = Array.from({ length: 9 }, (_, i) => `a.part('p${i}', box(10,10,10).subtract(cylinder(20,2).translate(5,5,-5)).translate(${i * 12},0,0));`).join('\n');
    expect(await texts(`const a = assembly('row');\n${parts}\nreturn a.model();`)).toHaveLength(3);
  });
  it('tags per-part dimensions with the part name in a small assembly', async () => {
    const parts = await partsFromSource(`const a = assembly('pair');
      a.part('left', box(10,10,10).subtract(cylinder(20,2).translate(5,5,-5)));
      a.part('right', box(10,10,10).translate(12,0,0));
      return a.model();`);
    const dims = computeViewerDimensions({ parts, declared: [], auto: true }).dimensions;
    const hole = dims.find(d => d.kind === 'diameter');
    expect(hole).toMatchObject({ text: 'Ø4', part: 'left', source: 'auto', id: 'auto:holes:left:0' });
  });
});

/** n×n grid of Ø3 through-holes at pitch 10 in a 5 mm plate, cut in one
 *  boolean (100× faster to build than 100 chained script subtracts). */
function perforatedPlate(n: number): WorldFramePart[] {
  const cyls = Array.from({ length: n * n }, (_, i) =>
    replicad.makeCylinder(1.5, 20, [5 + (i % n) * 10, 5 + Math.floor(i / n) * 10, -5]));
  const plate = replicad.makeBaseBox(n * 10, n * 10, 5).translate(n * 5, n * 5, 0).cut(replicad.makeCompound(cyls));
  return [{ name: 'part', shape: new OcctBackend(plate as replicad.Shape3D) }];
}

describe('perforated plate', () => {
  it('25 holes are capped, grouped and spaced once per direction', () => {
    const t = textsOf(perforatedPlate(5), 60_000);
    expect(t).toContain('25× Ø3');
    expect(t.length).toBeLessThanOrEqual(20);
    expect(t.filter(x => x === '10')).toHaveLength(2); // one spacing per direction
  }, 60_000);

  // Hole recognition probes every bore (~90 ms each at this face count), so
  // 81 holes (~7.5 s unbudgeted) overrun the 3 s default mid-recognition.
  it('keeps overall extents and warns when the default budget runs out', () => {
    const parts = perforatedPlate(9);
    const start = performance.now();
    const r = computeViewerDimensions({ parts, declared: [], auto: true });
    expect(performance.now() - start).toBeLessThan(4_000);
    expect(r.dimensions.map(d => d.text).sort()).toEqual(['5', '90', '90']);
    expect(r.diagnostics.map(d => d.code)).toEqual(['viewer.dimensions.budget-exceeded']);
    expect(r.diagnostics[0].message).toMatch(/3000 ms budget/);
  }, 60_000);
});
