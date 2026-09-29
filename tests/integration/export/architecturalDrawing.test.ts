// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `style: 'architectural'` drawings: a room model drawn with the default
// mechanical sheet got datums, flatness and an ISO 2768 note. The
// architectural style draws a floor plan — section ~1 m above the floor, cut
// walls filled, wall / opening chain dimensions, room labels with net area, a
// scale bar and a north arrow — in feet-inches for an imperial model. A
// building-sized model drawn in the default style is told about it.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

// 6000 × 4000 two-room house: 200 mm walls, 2700 high, on a 150 mm slab. A
// 900 door in the partition, a 1000 front door, a 1200 east window (sill 900).
const HOUSE = `
const W = 6000, D = 4000, T = 200, H = 2700, S = 150;
let walls = box(W, D, H).translate(0, 0, S).subtract(box(W - 2 * T, D - 2 * T, H + 10).translate(T, T, S));
walls = walls.union(box(100, D - 2 * T, H).translate(3500, T, S));
walls = walls
  .subtract(box(300, 900, 2100).translate(3400, 1500, S))
  .subtract(box(1000, 400, 2100).translate(1000, -100, S))
  .subtract(box(400, 1200, 1200).translate(5700, 1200, S + 900));
return box(W, D, S).union(walls);`;

// 20' × 14' cabin in whole feet / inches: 6" walls, 9' high, on a 6" slab.
const CABIN = `
const FT = 304.8, IN = 25.4;
const W = 20 * FT, D = 14 * FT, T = 6 * IN, H = 9 * FT, S = 6 * IN;
let walls = box(W, D, H).translate(0, 0, S).subtract(box(W - 2 * T, D - 2 * T, H + 10).translate(T, T, S));
walls = walls.union(box(4 * IN, D - 2 * T, H).translate(12 * FT, T, S));
walls = walls
  .subtract(box(1 * FT, 3 * FT, 7 * FT).translate(12 * FT - 4 * IN, 5 * FT, S))
  .subtract(box(3 * FT, 1 * FT, 7 * FT).translate(3 * FT, -3 * IN, S))
  .subtract(box(1 * FT, 4 * FT, 4 * FT).translate(W - 9 * IN, 5 * FT, S + 3 * FT));
return box(W, D, S).union(walls);`;

const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].replace(/&quot;/g, '"'));

async function exportDrawing(code: string, format: 'svg-drawing' | 'pdf-drawing', options: Record<string, unknown>) {
  return runAndExport({ code, fileName: 'house.kcad.ts', format, options: { format, ...options } as never });
}

describe('architectural drawing style', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('draws a metric floor plan: poché walls, chains, rooms with area, scale bar, north arrow', async () => {
    const r = await exportDrawing(HOUSE, 'svg-drawing', { style: 'architectural', plan: { rooms: [{ name: 'Living', at: [1000, 1000] }] } });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const svg = new TextDecoder().decode(r.bytes);
    expect(svg).toContain('data-kc-style="architectural"');
    expect(svg).toContain('id="plan-cut"');
    expect(svg).toContain('id="north-arrow"');
    expect(svg).toContain('id="scale-bar"');
    const t = texts(svg);
    // Rooms: 3300 × 3600 and 2200 × 3600 net of the 100 mm partition.
    expect(t).toContain('LIVING');
    expect(t).toContain('11.9 m²');
    expect(t).toContain('ROOM 1');
    expect(t).toContain('7.9 m²');
    // South chain: wall 1000, door 1000, wall 4000; east chain: 1200 window
    // (its sill at 900 above the floor is under the 1 m cut); overalls.
    for (const label of ['1000', '4000', '1200', '6000']) expect(t).toContain(label);
    expect(t.filter((x) => x === '1000').length).toBeGreaterThanOrEqual(2);
    // No mechanical annotations on a plan.
    expect(svg).not.toMatch(/ISO 2768|datum|flatness/i);
    expect(t.some((x) => x.startsWith('SCALE 1:'))).toBe(true);
  }, 180_000);

  it('uses feet-inches and ft² for an imperial model', async () => {
    const r = await exportDrawing(CABIN, 'svg-drawing', { style: 'architectural' });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const svg = new TextDecoder().decode(r.bytes);
    const t = texts(svg);
    expect(svg).toContain('data-kc-units="ft-in"');
    for (const label of [`3'-0"`, `14'-0"`, `4'-0"`, `20'-0"`, '150 ft²', '93 ft²', 'FEET-INCHES']) {
      expect(t, label).toContain(label);
    }
    expect(t.some((x) => /^SCALE \d+\/\d+" = 1'-0"$/.test(x))).toBe(true);
  }, 180_000);

  it('writes the plan as a PDF', async () => {
    const r = await exportDrawing(HOUSE, 'pdf-drawing', { style: 'architectural', title: 'House' });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pdf = new TextDecoder('latin1').decode(r.bytes);
    expect(pdf.startsWith('%PDF-')).toBe(true);
    // One A3 landscape page (420 × 297 mm in points).
    expect(pdf).toMatch(/\/MediaBox \[0 0 1190\.55\d* 841\.88\d*\]/);
  }, 180_000);

  it('suggests the architectural style for a building drawn as a mechanical part', async () => {
    const r = await exportDrawing(HOUSE, 'svg-drawing', {});
    const hint = r.diagnostics.find((d) => d.code === 'drawing.style.architectural-suggested');
    expect(hint, JSON.stringify(r.diagnostics.map((d) => d.code))).toBeDefined();
    expect(hint!.severity).toBe('warn');
    expect(hint!.hint).toMatch(/style: 'architectural'/);
    // A part-sized model and an explicit mechanical style stay quiet.
    const part = await exportDrawing('return box(80, 60, 20);', 'svg-drawing', {});
    expect(part.diagnostics.map((d) => d.code)).not.toContain('drawing.style.architectural-suggested');
    const explicit = await exportDrawing(HOUSE, 'svg-drawing', { style: 'mechanical' });
    expect(explicit.diagnostics.map((d) => d.code)).not.toContain('drawing.style.architectural-suggested');
  }, 300_000);

  it('rejects an unknown style', async () => {
    const r = await exportDrawing('return box(10, 10, 10);', 'svg-drawing', { style: 'blueprint' });
    expect(r.bytes.length).toBe(0);
    expect(r.diagnostics.map((d) => d.code)).toContain('cli.invalid-args');
  });
});
