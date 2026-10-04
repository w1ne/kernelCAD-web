// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/script-runtime/exportDxfPlanar.test.ts
//
// DXF export of ordinary parts: flat plates, rotated plates, extruded
// profiles, a multi-part panel set, sections, and the refusal for a part
// that is neither flat nor sectioned. Every test reads the DXF back with
// `dxf-parser` and checks the geometry (sizes, circle diameters, arc
// bulges, areas), not just that bytes came out.

import { describe, it, expect, beforeAll } from 'vitest';
import DxfParser from 'dxf-parser';
import { runAndExport, type ExportOptions, type ExportResult } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

interface Vtx { x: number; y: number; bulge?: number }
interface Entity { type: string; layer: string; shape?: boolean; vertices?: Vtx[] }
interface Parsed {
  header: Record<string, unknown>;
  entities: Entity[];
  tables?: { layer?: { layers: Record<string, unknown> } };
}

function parse(bytes: Uint8Array): Parsed {
  return new DxfParser().parseSync(new TextDecoder().decode(bytes)) as unknown as Parsed;
}

/** A closed LWPOLYLINE, read independently of the exporter's own helpers. */
interface Loop {
  layer: string;
  vtx: Vtx[];
  area: number;
  min: [number, number];
  max: [number, number];
}

/** Arc span data for vertex i → i+1 (bulge b = tan(θ/4)). */
function arcOf(a: Vtx, b: Vtx, bulge: number): { cx: number; cy: number; r: number; theta: number } {
  const theta = 4 * Math.atan(bulge);
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const r = chord / (2 * Math.abs(Math.sin(theta / 2)));
  const h = (chord / 2) / Math.tan(theta / 2);
  const nx = -(b.y - a.y) / chord;
  const ny = (b.x - a.x) / chord;
  return { cx: (a.x + b.x) / 2 + nx * h, cy: (a.y + b.y) / 2 + ny * h, r, theta };
}

function toLoop(e: Entity): Loop {
  const vtx = e.vertices ?? [];
  let twice = 0;
  let caps = 0;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < vtx.length; i++) {
    const a = vtx[i];
    const b = vtx[(i + 1) % vtx.length];
    twice += a.x * b.y - b.x * a.y;
    pts.push([a.x, a.y]);
    const bulge = a.bulge ?? 0;
    if (bulge !== 0) {
      const { cx, cy, r, theta } = arcOf(a, b, bulge);
      caps += 0.5 * r * r * (theta - Math.sin(theta));
      // Sample the arc densely for the bounding box.
      const a0 = Math.atan2(a.y - cy, a.x - cx);
      for (let k = 1; k < 720; k++) {
        const t = a0 + (theta * k) / 720;
        pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
    }
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    layer: e.layer,
    vtx,
    area: Math.abs(twice / 2 + caps),
    min: [Math.min(...xs), Math.min(...ys)],
    max: [Math.max(...xs), Math.max(...ys)],
  };
}

function loopsOf(bytes: Uint8Array): Loop[] {
  const dxf = parse(bytes);
  for (const e of dxf.entities) {
    expect(e.type).toBe('LWPOLYLINE');
    expect(e.shape).toBe(true); // closed
  }
  return dxf.entities.map(toLoop);
}

/** A full circle is two half-circle bulges: returns { cx, cy, d } or null. */
function circleOf(l: Loop): { cx: number; cy: number; d: number } | null {
  if (l.vtx.length !== 2) return null;
  const [a, b] = l.vtx;
  if (Math.abs(Math.abs(a.bulge ?? 0) - 1) > 1e-9 || Math.abs(Math.abs(b.bulge ?? 0) - 1) > 1e-9) return null;
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y) };
}

const size = (l: Loop): [number, number] => [l.max[0] - l.min[0], l.max[1] - l.min[1]];

async function dxf(code: string, options?: Omit<Extract<ExportOptions, { format: 'dxf' }>, 'format'>): Promise<ExportResult> {
  return runAndExport({
    code,
    fileName: 'part.kcad.ts',
    format: 'dxf',
    ...(options ? { options: { format: 'dxf', ...options } } : {}),
  });
}

function expectOk(r: ExportResult): void {
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(r.bytes.length).toBeGreaterThan(0);
}

const PLATE = `
  let p = box(100, 60, 5);
  p = p.subtract(cylinder(5, 4).translate(20, 30, 0));
  p = p.subtract(cylinder(5, 6).translate(80, 30, 0));
  const slot = box(20, 6, 5).translate(40, 12, 0)
    .union(cylinder(5, 3).translate(40, 15, 0))
    .union(cylinder(5, 3).translate(60, 15, 0));
  return p.subtract(slot);
`;

describe('DXF export of flat parts', () => {
  beforeAll(async () => { await initOcct(); });

  it('plate with two holes and a slot → outline, true circles and an arc slot with exact sizes', async () => {
    const r = await dxf(PLATE);
    expectOk(r);
    const loops = loopsOf(r.bytes);
    expect(loops).toHaveLength(4);
    for (const l of loops) expect(l.layer).toBe('cut');

    const outer = loops[0];
    expect(outer.min[0]).toBeCloseTo(0, 6);
    expect(outer.min[1]).toBeCloseTo(0, 6);
    expect(size(outer)[0]).toBeCloseTo(100, 6);
    expect(size(outer)[1]).toBeCloseTo(60, 6);
    expect(outer.area).toBeCloseTo(6000, 4);
    expect(outer.vtx.every((v) => (v.bulge ?? 0) === 0)).toBe(true);

    const circles = loops.map(circleOf).filter((c) => c !== null).sort((a, b) => a.d - b.d);
    expect(circles).toHaveLength(2);
    expect(circles[0].d).toBeCloseTo(8, 6);
    expect(circles[0].cx).toBeCloseTo(20, 6);
    expect(circles[0].cy).toBeCloseTo(30, 6);
    expect(circles[1].d).toBeCloseTo(12, 6);
    expect(circles[1].cx).toBeCloseTo(80, 6);
    expect(circles[1].cy).toBeCloseTo(30, 6);

    const slot = loops.find((l) => l !== outer && circleOf(l) === null)!;
    // Two straight sides + two exact half-circle ends.
    expect(slot.vtx).toHaveLength(4);
    expect(slot.vtx.filter((v) => Math.abs(Math.abs(v.bulge ?? 0) - 1) < 1e-9)).toHaveLength(2);
    expect(slot.min[0]).toBeCloseTo(37, 4);
    expect(slot.max[0]).toBeCloseTo(63, 4);
    expect(slot.min[1]).toBeCloseTo(12, 4);
    expect(slot.max[1]).toBeCloseTo(18, 4);
    expect(slot.area).toBeCloseTo(20 * 6 + Math.PI * 9, 4);

    // Unit and attribution header survive.
    const text = new TextDecoder().decode(r.bytes);
    expect(text).toMatch(/\$INSUNITS\n70\n4\n/);
    expect(text).toMatch(/^999\nkernelCAD /);
  });

  it('scales a flat part to inches with $INSUNITS = 1', async () => {
    const r = await dxf('return box(50.8, 25.4, 3).subtract(cylinder(3, 6.35).translate(25.4, 12.7, 0));', { unit: 'in' });
    expectOk(r);
    expect(parse(r.bytes).header.$INSUNITS).toBe(1);
    const loops = loopsOf(r.bytes);
    expect(size(loops[0])[0]).toBeCloseTo(2, 6);
    expect(size(loops[0])[1]).toBeCloseTo(1, 6);
    expect(circleOf(loops[1])!.d).toBeCloseTo(0.5, 6);
  });

  it('rotated plate → exported in its own plane with true sizes', async () => {
    const r = await dxf(`
      const p = box(80, 40, 3).subtract(cylinder(3, 5).translate(20, 20, 0));
      return p.rotate([1, 1, 0], 37).rotate([0, 0, 1], 20).translate(5, -7, 11);
    `);
    expectOk(r);
    const loops = loopsOf(r.bytes);
    expect(loops).toHaveLength(2);
    const [w, h] = size(loops[0]);
    expect(Math.max(w, h)).toBeCloseTo(80, 5);
    expect(Math.min(w, h)).toBeCloseTo(40, 5);
    expect(loops[0].area).toBeCloseTo(3200, 3);
    const c = circleOf(loops[1])!;
    expect(c.d).toBeCloseTo(10, 5);
    // The hole sits 20 mm from a short edge and 20 mm from a long edge.
    const fromU = Math.min(c.cx, w - c.cx);
    const fromV = Math.min(c.cy, h - c.cy);
    expect(w > h ? fromU : fromV).toBeCloseTo(20, 5);
    expect(w > h ? fromV : fromU).toBeCloseTo(20, 5);
  });

  it('extruded L-profile → the L cross-section (6 straight vertices)', async () => {
    const r = await dxf(`
      const l = path().moveTo(0, 0).lineTo(40, 0).lineTo(40, 4).lineTo(4, 4).lineTo(4, 30).lineTo(0, 30).close();
      return l.extrude(500).rotateY(90);
    `);
    expectOk(r);
    const loops = loopsOf(r.bytes);
    expect(loops).toHaveLength(1);
    const [l] = loops;
    expect(l.vtx).toHaveLength(6);
    expect(l.vtx.every((v) => (v.bulge ?? 0) === 0)).toBe(true);
    expect(l.area).toBeCloseTo(40 * 4 + 4 * 26, 6);
    expect([...size(l)].sort((a, b) => a - b)[0]).toBeCloseTo(30, 6);
    expect([...size(l)].sort((a, b) => a - b)[1]).toBeCloseTo(40, 6);
  });

  it('multi-part plywood panel set → one DXF per part plus a combined sheet with a layer per part', async () => {
    const code = `
      const cab = assembly('cabinet');
      cab.part('side_left', box(18, 300, 500));
      cab.part('side_right', box(18, 300, 500), { at: [482, 0, 0] });
      cab.part('shelf', box(464, 300, 18).subtract(cylinder(18, 17.5).translate(232, 150, 0)), { at: [18, 0, 200] });
      return cab.model();
    `;
    const r = await dxf(code);
    expectOk(r);
    expect(r.meshes?.map((m) => m.relPath)).toEqual(['parts/side_left.dxf', 'parts/side_right.dxf', 'parts/shelf.dxf']);

    const side = loopsOf(r.meshes![0].bytes);
    expect(side).toHaveLength(1);
    expect(size(side[0]).sort((a, b) => a - b)).toEqual([expect.closeTo(300, 6), expect.closeTo(500, 6)]);
    const shelf = loopsOf(r.meshes![2].bytes);
    expect(shelf).toHaveLength(2);
    expect(size(shelf[0])[0]).toBeCloseTo(464, 6);
    expect(size(shelf[0])[1]).toBeCloseTo(300, 6);
    expect(circleOf(shelf[1])!.d).toBeCloseTo(35, 6);

    // Combined sheet: parts left to right, 10 mm apart, one layer each.
    const sheet = loopsOf(r.bytes);
    const layers = Object.keys(parse(r.bytes).tables?.layer?.layers ?? {});
    expect(layers).toEqual(expect.arrayContaining(['side_left', 'side_right', 'shelf', 'BEND']));
    const outerOf = (layer: string): Loop => sheet.filter((l) => l.layer === layer).sort((a, b) => b.area - a.area)[0];
    expect(outerOf('side_left').min[0]).toBeCloseTo(0, 6);
    expect(outerOf('side_right').min[0]).toBeCloseTo(outerOf('side_left').max[0] + 10, 6);
    expect(outerOf('shelf').min[0]).toBeCloseTo(outerOf('side_right').max[0] + 10, 6);
    expect(size(outerOf('shelf'))[0]).toBeCloseTo(464, 6);

    // layout: 'sheet' → the combined file only.
    const only = await dxf(code, { layout: 'sheet' });
    expectOk(only);
    expect(only.meshes).toBeUndefined();
    expect(loopsOf(only.bytes)).toHaveLength(4);
  });

  it('section at Z through a box with a pocket → outer + pocket loops in world XY', async () => {
    const code = `
      return box(100, 80, 30).subtract(box(40, 30, 10).translate(30, 25, 20));
    `;
    const r = await dxf(code, { section: { axis: 'z', at: 25 } });
    expectOk(r);
    const loops = loopsOf(r.bytes).sort((a, b) => b.area - a.area);
    expect(loops).toHaveLength(2);
    expect(loops[0].min).toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6)]);
    expect(loops[0].max).toEqual([expect.closeTo(100, 6), expect.closeTo(80, 6)]);
    expect(loops[1].min).toEqual([expect.closeTo(30, 6), expect.closeTo(25, 6)]);
    expect(loops[1].max).toEqual([expect.closeTo(70, 6), expect.closeTo(55, 6)]);

    const below = await dxf(code, { section: { axis: 'z', at: 10 } });
    expectOk(below);
    expect(loopsOf(below.bytes)).toHaveLength(1);

    const miss = await dxf(code, { section: { axis: 'z', at: 50 } });
    expect(miss.bytes.length).toBe(0);
    expect(miss.diagnostics.find((d) => d.code === 'export.dxf.non-planar')?.message).toMatch(/does not cut the part/);
  });

  it('section of a cylinder keeps the circle exact', async () => {
    const r = await dxf('return cylinder(40, 12.5).translate(10, 20, 0);', { section: { axis: 'z', at: 5 } });
    expectOk(r);
    const c = circleOf(loopsOf(r.bytes)[0])!;
    expect(c.d).toBeCloseTo(25, 6);
    expect(c.cx).toBeCloseTo(10, 6);
    expect(c.cy).toBeCloseTo(20, 6);
  });

  it('a part that is neither flat nor sectioned is refused with the section / flatten_pattern / STEP hint', async () => {
    for (const code of [
      'return box(100, 80, 30).subtract(box(40, 30, 10).translate(30, 25, 20));',
      'return sphere(10);',
    ]) {
      const r = await dxf(code);
      expect(r.bytes.length).toBe(0);
      const d = r.diagnostics.find((x) => x.code === 'export.dxf.non-planar');
      expect(d).toBeDefined();
      expect(d!.hint).toContain('section: { axis, at }');
      expect(d!.hint).toContain('flatten_pattern');
      expect(d!.hint).toContain('STEP/STL');
    }
  });
});
