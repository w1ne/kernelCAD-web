// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for shell() opening more than one face of a solid.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

async function build(code: string) {
  const model = await buildModel({ fileName: 'multi-face-shell-regression.kcad.ts', code });
  return { model, errors: model.diagnostics.filter((d) => d.severity === 'error') };
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('multi-face shell geometry', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('opens the top and bottom of a block into a 2 mm rectangular sleeve', async () => {
    const code = await readFile('examples/cookbook-parity/open-ended-duct-sleeve.kcad.ts', 'utf8');
    const { model, errors } = await build(code);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 4 outer walls + 4 inner walls + 2 rims; no top or bottom cap is left.
    expect(shape.faceHashes().length).toBe(10);
    // Outer 40 × 30 section minus the 36 × 26 bore, through the full 20 mm.
    expect(shape.volume()).toBeCloseTo(40 * 30 * 20 - 36 * 26 * 20, 3);
    // A top-only shell would keep a 2 mm floor: 7,152 mm³.
    expect(Math.abs(shape.volume() - 7_152)).toBeGreaterThan(1_000);
    for (const v of shape.boundingBox().min) expect(v).toBeCloseTo(0, 6);
    expect(shape.boundingBox().max[0]).toBeCloseTo(40, 6);
    expect(shape.boundingBox().max[1]).toBeCloseTo(30, 6);
    expect(shape.boundingBox().max[2]).toBeCloseTo(20, 6);
  }, 120_000);

  it('opens two adjacent faces into a corner channel', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 20).shell(2, { face: ['top', 'front'] });
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Cavity: 36 wide, 28 deep (back wall only), 18 tall (floor only).
    expect(shape.volume()).toBeCloseTo(40 * 30 * 20 - 36 * 28 * 18, 3);
  }, 120_000);

  it('keeps the single-face form unchanged', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 20).shell(2, { face: 'top' });
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 5 outer + 5 inner + 1 rim.
    expect(shape.faceHashes().length).toBe(11);
    expect(shape.volume()).toBeCloseTo(40 * 30 * 20 - 36 * 26 * 18, 3);
  }, 120_000);
});
