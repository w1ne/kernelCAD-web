// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// `path().slot(cx, cy, { width, centerDistance | length, angleDeg? })`: a closed
// stadium profile, so a slot is one call instead of two hand-signed arcs.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

async function volumeOf(code: string): Promise<{ volume: number; errors: string[]; bbox?: number[][] }> {
  let m;
  try {
    m = await buildModel({ fileName: 'slot.kcad.ts', code });
  } catch (e) {
    return { volume: NaN, errors: [e instanceof Error ? e.message : String(e)] };
  }
  const errors = m.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`);
  return { volume: m.tailShape ? m.tailShape.volume() : NaN, errors };
}

// Stadium area: a rectangle (centerDistance x width) plus a full circle of diameter `width`.
const stadium = (centerDistance: number, width: number): number => centerDistance * width + Math.PI * (width / 2) ** 2;

describe('path().slot', () => {
  beforeAll(async () => { await initOcct(); });

  it('is centred on (cx, cy) with centerDistance between the arc centres', async () => {
    const { volume, errors } = await volumeOf(`return path().slot(5, 3, { width: 10, centerDistance: 20 }).extrude(3);`);
    expect(errors).toEqual([]);
    expect(volume).toBeCloseTo(stadium(20, 10) * 3, 3);
  });

  it('reads length as the overall end-to-end size', async () => {
    const a = await volumeOf(`return path().slot(0, 0, { width: 10, length: 30 }).extrude(3);`);
    expect(a.errors).toEqual([]);
    expect(a.volume).toBeCloseTo(stadium(20, 10) * 3, 3);
  });

  it('turns by angleDeg without changing its area', async () => {
    const a = await volumeOf(`return path().slot(0, 0, { width: 6, centerDistance: 14, angleDeg: 35 }).extrude(2);`);
    expect(a.errors).toEqual([]);
    expect(a.volume).toBeCloseTo(stadium(14, 6) * 2, 3);
  });

  it('cuts through a plate with cutout, from the face centre', async () => {
    const { volume, errors } = await volumeOf(
      `return box(80, 40, 10).cutout(path().slot(0, 0, { width: 10, centerDistance: 20 }), { face: 'top', depth: 'through' });`,
    );
    expect(errors).toEqual([]);
    expect(volume).toBeCloseTo(80 * 40 * 10 - stadium(20, 10) * 10, 2);
  });

  it('follows param() values', async () => {
    const { volume, errors } = await volumeOf(
      `const w = param('w', 8); const d = param('d', 12); return path().slot(0, 0, { width: w, centerDistance: d }).extrude(1);`,
    );
    expect(errors).toEqual([]);
    expect(volume).toBeCloseTo(stadium(12, 8), 3);
  });

  it.each([
    ['both centerDistance and length', `path().slot(0, 0, { width: 6, centerDistance: 10, length: 16 })`, /exactly one of centerDistance/],
    ['neither centerDistance nor length', `path().slot(0, 0, { width: 6 })`, /exactly one of centerDistance/],
    ['a non-positive width', `path().slot(0, 0, { width: 0, centerDistance: 10 })`, /width/],
    ['a length that does not exceed the width', `path().slot(0, 0, { width: 6, length: 6 })`, /length/],
    ['a path that already has segments', `path().moveTo(0, 0).slot(0, 0, { width: 6, centerDistance: 10 })`, /fresh path/],
    ['an unknown option', `path().slot(0, 0, { width: 6, centerDistance: 10, diameter: 6 })`, /diameter/],
  ])('rejects %s', async (_name, code, pattern) => {
    const { errors } = await volumeOf(`return ${code}.extrude(1);`);
    expect(errors.join('\n')).toMatch(pattern);
  });
});
