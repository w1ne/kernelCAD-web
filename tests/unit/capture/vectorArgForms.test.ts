// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// A direction or offset is written either as separate numbers or as one
// vector / axis name wherever the meaning is the same.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

async function bboxOf(code: string): Promise<number[]> {
  const m = await buildModel({ fileName: 'vec.kcad.ts', code });
  const errors = m.diagnostics.filter((d) => d.severity === 'error');
  expect(errors).toEqual([]);
  const bb = m.tailShape!.boundingBox();
  return [bb.min[0], bb.min[1], bb.min[2], bb.max[0], bb.max[1], bb.max[2]].map((n) => Math.round(n * 1e6) / 1e6);
}

describe('vector argument forms', () => {
  beforeAll(async () => { await initOcct(); });

  it('translate takes one [x, y, z] array like three numbers', async () => {
    const asNumbers = await bboxOf(`return box(10, 10, 10).translate(5, -2, 7);`);
    const asArray = await bboxOf(`return box(10, 10, 10).translate([5, -2, 7]);`);
    expect(asArray).toEqual(asNumbers);
    expect(asArray).toEqual([5, -2, 7, 15, 8, 17]);
  });

  it('translate still rejects a malformed vector with the vector message', async () => {
    await expect(buildModel({ fileName: 'v.kcad.ts', code: `return box(1, 1, 1).translate([1, 2]);` }))
      .rejects.toThrow(/Translate vector/);
  });

  it('patternCircular takes an axis name like the vector', async () => {
    const named = await bboxOf(`return box(4, 4, 4).translate(10, 0, 0).patternCircular({ count: 4, axis: 'Z' });`);
    const vec = await bboxOf(`return box(4, 4, 4).translate(10, 0, 0).patternCircular({ count: 4, axis: [0, 0, 1] });`);
    expect(named).toEqual(vec);
  });

  it('patternCircular rejects an unknown axis name and says which names are valid', async () => {
    await expect(buildModel({ fileName: 'v.kcad.ts', code: `return box(4, 4, 4).patternCircular({ count: 4, axis: 'up' });` }))
      .rejects.toThrow(/'X'.*'Y'.*'Z'/s);
  });
});

describe('diagnostics that point to the working call', () => {
  beforeAll(async () => { await initOcct(); });

  const message = async (code: string): Promise<string> => {
    try {
      await buildModel({ fileName: 'd.kcad.ts', code });
    } catch (e) {
      return `${(e as Error).message} ${(e as { hint?: string }).hint ?? ''}`;
    }
    throw new Error('script did not fail');
  };

  it('a diameter written per position says holes() takes one diameter', async () => {
    const m = await message(`return box(40, 40, 5).holes('top', { positions: [{ u: 0, v: 0, diameter: 4 }, { u: 10, v: 0, diameter: 6 }], depth: 'through' });`);
    expect(m).toMatch(/ONE diameter/);
  });

  it('a FaceQuery key on an edge query points to ofFace and the face argument', async () => {
    const m = await message(`const b = box(10, 10, 5); return b.chamfer(1, await selectEdges(b, { byNormal: '-Z' }));`);
    expect(m).toMatch(/ofFace/);
    expect(m).toMatch(/\{ face:/);
  });

  it('a cutout profile written in world coordinates is told the frame', async () => {
    const m = await message(`return box(80, 40, 10).cutout(path().moveTo(30, 15).lineTo(50, 15).lineTo(50, 25).lineTo(30, 25).close(), { face: 'top', depth: 'through' });`).catch(() => '');
    // The profile bbox warning is a diagnostic, not a throw: read it from the model instead.
    expect(m).toBe('');
    const model = await buildModel({ fileName: 'd.kcad.ts', code: `return box(80, 40, 10).cutout(path().moveTo(30, 15).lineTo(50, 15).lineTo(50, 25).lineTo(30, 25).close(), { face: 'top', depth: 'through' });` });
    const warn = model.diagnostics.find((d) => d.message.includes('Cutout profile bbox exceeds'));
    expect(warn?.hint).toMatch(/measured from the entry face centre \(40, 20, 10\)/);
  });
});
