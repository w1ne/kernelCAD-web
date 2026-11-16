// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for a symmetric (mid-plane) sketch extrude: the solid spans
// depth/2 to each side of the sketch plane instead of 0..depth along +Z.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { countFaces, isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

const SQUARE = 'path().moveTo(-10, -10).lineTo(10, -10).lineTo(10, 10).lineTo(-10, 10).close()';

async function build(code: string) {
  return buildModel({ fileName: 'extrude-symmetric.kcad.ts', code });
}

function errors(model: Awaited<ReturnType<typeof build>>) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

/** Error codes from a build, whether capture threw or lowering reported them. */
async function errorCodes(code: string): Promise<string[]> {
  try {
    return errors(await build(code)).map((d) => d.code);
  } catch (e) {
    return [(e as { code?: string }).code ?? String(e)];
  }
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('Sketch.extrude symmetric', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('centres a 20 mm square prism on the sketch plane', async () => {
    const model = await build(`return ${SQUARE}.extrude(10, { symmetric: true });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    expect(countFaces(wrappedOf(shape))).toBe(6);
    const bb = shape.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-10, 6);
    expect(bb.max[0]).toBeCloseTo(10, 6);
    expect(bb.min[2]).toBeCloseTo(-5, 6);
    expect(bb.max[2]).toBeCloseTo(5, 6);
    expect(shape.volume()).toBeCloseTo(4000, 6);
  }, 120_000);

  it('keeps the sketch-plane section equal to the profile', async () => {
    // A thin slab at z = 0 cuts the symmetric prism through its middle.
    const slice = await build(
      `return ${SQUARE}.extrude(10, { symmetric: true }).intersect(box(40, 40, 0.02).translate(-20, -20, -0.01));`,
    );
    expect(errors(slice), JSON.stringify(slice.diagnostics)).toEqual([]);
    expect(slice.tailShape!.volume()).toBeCloseTo(20 * 20 * 0.02, 6);
  }, 120_000);

  it('cuts a through slot centred on a mid-plane plate', async () => {
    const model = await build(`
      const plate = box(40, 20, 6).translate(-20, -10, -3);
      const slot = path().moveTo(-8, -2).lineTo(8, -2).lineTo(8, 2).lineTo(-8, 2).close()
        .extrude(6, { symmetric: true });
      return plate.subtract(slot);
    `);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    expect(shape.volume()).toBeCloseTo(40 * 20 * 6 - 16 * 4 * 6, 6);
  }, 120_000);

  it('keeps the one-sided extrude for symmetric: false', async () => {
    const model = await build(`return ${SQUARE}.extrude(10, { symmetric: false });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const bb = model.tailShape!.boundingBox();
    expect(bb.min[2]).toBeCloseTo(0, 6);
    expect(bb.max[2]).toBeCloseTo(10, 6);
  }, 120_000);

  it('records no symmetric param on a one-sided extrude', async () => {
    const plain = await build(`return ${SQUARE}.extrude(10);`);
    const off = await build(`return ${SQUARE}.extrude(10, { symmetric: false });`);
    const on = await build(`return ${SQUARE}.extrude(10, { symmetric: true });`);
    const extrudeParams = (m: Awaited<ReturnType<typeof build>>) =>
      m.records.find((f) => f.kind === 'extrude')!.params;
    expect(extrudeParams(plain)).not.toHaveProperty('symmetric');
    expect(extrudeParams(off)).toEqual(extrudeParams(plain));
    expect(extrudeParams(on)).toHaveProperty('symmetric');
  }, 120_000);

  it('rejects a non-boolean symmetric and symmetric with taper or twist', async () => {
    for (const code of [
      `return ${SQUARE}.extrude(10, { symmetric: 'yes' });`,
      `return ${SQUARE}.extrude(10, { symmetric: true, taperDeg: 3 });`,
      `return ${SQUARE}.extrude(10, { symmetric: true, twistAngle: 30 });`,
    ]) {
      expect(await errorCodes(code), code).toContain('feature.invalid-args');
    }
  }, 120_000);
});

describe('mid-plane-spacer cookbook example', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('builds a spacer centred on its mid-plane to the closed-form volume', async () => {
    const code = await readFile('examples/cookbook-parity/mid-plane-spacer.kcad.ts', 'utf8');
    const model = await buildModel({ fileName: 'mid-plane-spacer.kcad.ts', code });
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    const bb = shape.boundingBox();
    expect(bb.min[2]).toBeCloseTo(-4, 6);
    expect(bb.max[2]).toBeCloseTo(4, 6);
  }, 120_000);
});
