// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for a symmetric (mid-plane) partial revolve: the solid spans
// angleDeg/2 to each side of the sketch plane (y = 0) instead of 0..angleDeg.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { countFaces, isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

// 10 mm x 4 mm rectangle from radius 20 to 30, z = 0..4.
const RING = 'path().moveTo(20, 0).lineTo(30, 0).lineTo(30, 4).lineTo(20, 4).close()';
const RING_AREA_MOMENT = 10 * 4 * 25; // area x centroid radius

async function build(code: string) {
  return buildModel({ fileName: 'revolve-symmetric.kcad.ts', code });
}

function errors(model: Awaited<ReturnType<typeof build>>) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

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

describe('Sketch.revolve symmetric', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('centres a 90 degree ring segment on the sketch plane', async () => {
    const model = await build(`return ${RING}.revolve({ angleDeg: 90, symmetric: true });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    expect(countFaces(wrappedOf(shape))).toBe(6);
    // Pappus: V = A * 2*pi*r_c * (angle / 360).
    expect(shape.volume()).toBeCloseTo(RING_AREA_MOMENT * 2 * Math.PI * 0.25, 3);
    const bb = shape.boundingBox();
    const s45 = Math.sin(Math.PI / 4);
    // Symmetric about y = 0: the segment spans -45..45 degrees.
    expect(bb.min[1]).toBeCloseTo(-30 * s45, 2);
    expect(bb.max[1]).toBeCloseTo(30 * s45, 2);
    expect(bb.min[0]).toBeCloseTo(20 * s45, 2);
    expect(bb.max[0]).toBeCloseTo(30, 2);
    expect(bb.min[2]).toBeCloseTo(0, 6);
    expect(bb.max[2]).toBeCloseTo(4, 6);
  }, 120_000);

  it('keeps the sketch-plane section equal to the profile', async () => {
    // A thin slab at y = 0 cuts the symmetric segment through its middle.
    const slice = await build(
      `return ${RING}.revolve({ angleDeg: 60, symmetric: true }).intersect(box(80, 0.02, 20).translate(0, -0.01, -5));`,
    );
    expect(errors(slice), JSON.stringify(slice.diagnostics)).toEqual([]);
    expect(slice.tailShape!.volume()).toBeCloseTo(10 * 4 * 0.02, 4);
  }, 120_000);

  it('leaves a full 360 degree revolve unchanged', async () => {
    const plain = await build(`return ${RING}.revolve();`);
    const sym = await build(`return ${RING}.revolve({ symmetric: true });`);
    expect(errors(sym), JSON.stringify(sym.diagnostics)).toEqual([]);
    expect(sym.tailShape!.volume()).toBeCloseTo(plain.tailShape!.volume(), 6);
  }, 120_000);

  it('keeps the one-sided revolve for symmetric: false', async () => {
    const model = await build(`return ${RING}.revolve({ angleDeg: 90, symmetric: false });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const bb = model.tailShape!.boundingBox();
    // One-sided: the segment starts on the sketch plane and stays on one side of y = 0.
    expect(Math.min(Math.abs(bb.min[1]), Math.abs(bb.max[1]))).toBeLessThan(1e-6);
  }, 120_000);

  it('records no symmetric param on a one-sided revolve', async () => {
    const plain = await build(`return ${RING}.revolve({ angleDeg: 90 });`);
    const off = await build(`return ${RING}.revolve({ angleDeg: 90, symmetric: false });`);
    const on = await build(`return ${RING}.revolve({ angleDeg: 90, symmetric: true });`);
    const revolveParams = (m: Awaited<ReturnType<typeof build>>) =>
      m.records.find((f) => f.kind === 'revolve')!.params;
    expect(revolveParams(plain)).not.toHaveProperty('symmetric');
    expect(revolveParams(off)).toEqual(revolveParams(plain));
    expect(revolveParams(on)).toHaveProperty('symmetric');
  }, 120_000);

  it('rejects a non-boolean symmetric', async () => {
    const code = `return ${RING}.revolve({ angleDeg: 90, symmetric: 'yes' });`;
    expect(await errorCodes(code), code).toContain('feature.invalid-args');
  }, 120_000);
});

describe('symmetric-pipe-elbow cookbook example', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('builds a 90 degree elbow centred on its sketch plane to the closed-form volume', async () => {
    const code = await readFile('examples/cookbook-parity/symmetric-pipe-elbow.kcad.ts', 'utf8');
    const model = await buildModel({ fileName: 'symmetric-pipe-elbow.kcad.ts', code });
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Torus segment: V = pi (R_o^2 - R_i^2) * 2 pi R_bend * (90 / 360).
    expect(shape.volume()).toBeCloseTo(Math.PI * (8 * 8 - 6 * 6) * 2 * Math.PI * 30 * 0.25, 1);
    // OCCT bounds overshoot on the torus faces, so check placement by
    // sections: the y = 0 slab holds the full annulus, the elbow mirrors
    // about y = 0, and nothing of it lies past 45 degrees.
    const mid = await buildModel({
      fileName: 'symmetric-pipe-elbow-mid.kcad.ts',
      code: code.replace(/return (.*);\s*$/, 'return ($1).intersect(box(80, 0.02, 40).translate(0, -0.01, -20));'),
    });
    expect(errors(mid), JSON.stringify(mid.diagnostics)).toEqual([]);
    expect(mid.tailShape!.volume()).toBeCloseTo(Math.PI * (8 * 8 - 6 * 6) * 0.02, 3);
    const half = await buildModel({
      fileName: 'symmetric-pipe-elbow-half.kcad.ts',
      code: code.replace(/return (.*);\s*$/, 'return ($1).intersect(box(80, 80, 40).translate(0, 0, -20));'),
    });
    expect(half.tailShape!.volume()).toBeCloseTo(shape.volume() / 2, 1);
  }, 120_000);
});
