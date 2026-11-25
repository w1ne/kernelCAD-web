// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `Sketch.sweep` with `transitionMode: 'round'` and a curved (circular)
// profile returned a body whose faces all pass BRepCheck while the shell is
// not closed: OCCT inserts the tangent-arc corner faces but does not sew them
// to the straight runs. The feature integrated a plausible volume and only
// failed later, at STEP export, with `export.brep.invalid` /
// `export.mesh.not-watertight`.
//
// The sweep lowerer now checks the solid validity of a round-corner result and
// refuses it with `feature.sweep.invalid-result`. These tests pin the refusal,
// the cause, and the unchanged behavior of the sweeps that do close.
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

const SHARP_RAIL = '[[0,0,0],[30,0,0],[30,30,0]]';

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

describe('sweep round-corner validity gate', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('refuses a round corner on a circular profile instead of returning an unsewn body', async () => {
    const model = await buildModel({
      code: `return path().circle(0, 0, 4).sweep(${SHARP_RAIL}, { spine: 'polyline', transitionMode: 'round' });`,
      fileName: 'sweep-round-refused.kcad.ts',
    });

    const errors = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toContain('feature.sweep.invalid-result');
    const refusal = errors.find((d) => d.code === 'feature.sweep.invalid-result')!;
    expect(refusal.message).toMatch(/transitionMode "round"/);
    expect(refusal.message).toMatch(/shell is not closed/);
    expect(refusal.details).toMatchObject({ transitionMode: 'round' });
    // Not a phantom solid: there is no body to measure or export.
    expect(model.rootShape).toBeUndefined();
  }, 120_000);

  it('records that the raw round-corner kernel result is invalid (the defect the gate catches)', async () => {
    // Direct kernel call, bypassing the lowerer gate. If the round result ever
    // becomes valid this test fails and the gate can be relaxed.
    const profile = await buildModel({
      code: 'return path().circle(0, 0, 4);',
      fileName: 'sweep-validity-profile.kcad.ts',
    });
    const oc = getOC();
    const rail: [number, number, number][] = [[0, 0, 0], [30, 0, 0], [30, 30, 0]];
    const sketch = profile.rootShape as OcctBackend;

    const right = OcctBackend.sweepFromSketch(sketch, rail, { spine: 'polyline', transitionMode: 'right' });
    try {
      expect(isValidShape(oc, wrapped(right))).toBe(true);
    } finally {
      right.dispose?.();
    }

    const round = OcctBackend.sweepFromSketch(sketch, rail, { spine: 'polyline', transitionMode: 'round' });
    try {
      expect(isValidShape(oc, wrapped(round))).toBe(false);
    } finally {
      round.dispose?.();
    }
  }, 120_000);

  it('keeps a round corner that the kernel sews correctly (polygonal profile)', async () => {
    // The gate is a validity check, not a ban on transitionMode 'round'.
    const square = 'path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close()';
    const model = await buildModel({
      code: `return ${square}.sweep([[0,0,0],[0,0,10],[10,0,10]], { spine: 'polyline', transitionMode: 'round' });`,
      fileName: 'sweep-round-square.kcad.ts',
    });

    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
      expect(shape.volume()).toBeGreaterThan(0);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('keeps a right-corner elbow: valid, one solid, authored volume and bounding box', async () => {
    const model = await buildModel({
      code: `return path().circle(0, 0, 4).sweep(${SHARP_RAIL}, { spine: 'polyline', transitionMode: 'right' });`,
      fileName: 'sweep-right-valid.kcad.ts',
    });

    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      // The mitered corner keeps the full 60 mm of swept path.
      expect(shape.volume()).toBeCloseTo(60 * Math.PI * 16, 1);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
      const box = shape.boundingBox();
      expect(box.min).toEqual([expect.closeTo(0, 6), -4, -4]);
      expect(box.max).toEqual([34, 30, 4]);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('keeps a straight smooth-spine sweep unchanged', async () => {
    const model = await buildModel({
      code: `return path().circle(0, 0, 4).sweep([[0,0,0],[0,0,10],[0,0,20],[0,0,30]], { spine: 'smooth' });`,
      fileName: 'sweep-straight-smooth.kcad.ts',
    });

    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.volume()).toBeCloseTo(30 * Math.PI * 16, 1);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('exports the valid elbow to STEP', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kcad-sweep-'));
    const code = `return path().circle(0, 0, 4).sweep(${SHARP_RAIL}, { spine: 'polyline', transitionMode: 'right' });`;
    const result = await exportModelTool({
      code,
      output_path: join(dir, 'elbow.step'),
      format: 'step',
    });
    expect(result.ok).toBe(true);
    expect((result.diagnostics ?? []).filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.byte_count).toBeGreaterThan(0);
  }, 300_000);
});
