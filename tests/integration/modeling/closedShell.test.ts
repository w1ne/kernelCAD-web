// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Closed shell: `shell(thickness, { closed: true })` keeps every face and
// leaves a sealed internal cavity. Before this mode, shell() always required
// an open face and a closed body could only be hollowed by hand-authoring an
// inset cavity and subtracting it.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

async function build(code: string) {
  const model = await buildModel({ fileName: 'closed-shell-regression.kcad.ts', code });
  return { model, errors: model.diagnostics.filter((d) => d.severity === 'error') };
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('closed shell geometry', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('seals a box around a 2 mm wall and keeps both skins', async () => {
    const { model, errors } = await build('return box(40, 30, 10).shell(2, { closed: true });');

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 6 outer + 6 inner faces: the cavity is enclosed, not open.
    expect(shape.faceHashes().length).toBe(12);
    // Outer 40×30×10 minus the 36×26×6 cavity.
    expect(shape.volume()).toBeCloseTo(40 * 30 * 10 - 36 * 26 * 6, 3);
    const box = shape.boundingBox();
    for (const v of box.min) expect(v).toBeCloseTo(0, 6);
    expect(box.max[0]).toBeCloseTo(40, 6);
    expect(box.max[1]).toBeCloseTo(30, 6);
    expect(box.max[2]).toBeCloseTo(10, 6);
  }, 120_000);

  it('hollows a cylinder without breaking the outer surface', async () => {
    const { model, errors } = await build('return cylinder(20, 10).shell(1.5, { closed: true });');

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // Both skins plus the two annular caps; the seam may split a curved face.
    expect(shape.faceHashes().length).toBeGreaterThanOrEqual(4);
    expect(shape.volume()).toBeCloseTo(Math.PI * (100 * 20 - 8.5 * 8.5 * 17), 1);
    const box = shape.boundingBox();
    expect(box.min[2]).toBeCloseTo(0, 6);
    expect(box.max[2]).toBeCloseTo(20, 6);
  }, 120_000);

  it('keeps the open-face shell unchanged', async () => {
    const { model, errors } = await build("return box(40, 30, 10).shell(2, { face: 'top' });");

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 5 outer + 5 inner + 1 rim at the open top.
    expect(shape.faceHashes().length).toBe(11);
    expect(shape.volume()).toBeCloseTo(40 * 30 * 10 - 36 * 26 * 8, 3);
  }, 120_000);

  it('keeps canonical outer faces usable for a later hole', async () => {
    const { model, errors } = await build(`
      return box(40, 30, 20)
        .shell(2, { closed: true })
        .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' });
    `);

    expect(errors, JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    // 'through' stops at the first exit: 2 mm of top wall, then the cavity.
    expect(shape.volume()).toBeCloseTo(40 * 30 * 20 - 36 * 26 * 16 - Math.PI * 9 * 2, 1);
  }, 120_000);

  it('refuses a wall with no room for a cavity instead of returning the solid', async () => {
    const { errors } = await build('return box(40, 30, 10).shell(6, { closed: true });');
    expect(errors.map((d) => d.code)).toContain('feature.kernel-failed');
  }, 120_000);

  it('rejects face and closed together, and a non-boolean closed flag', async () => {
    await expect(build("return box(40, 30, 10).shell(2, { face: 'top', closed: true });"))
      .rejects.toMatchObject({ code: 'feature.invalid-args' });
    await expect(build("return box(40, 30, 10).shell(2, { closed: 'yes' });"))
      .rejects.toMatchObject({ code: 'feature.invalid-args' });
  }, 120_000);
});
