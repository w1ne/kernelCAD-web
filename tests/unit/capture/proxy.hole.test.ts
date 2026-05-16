// tests/unit/capture/proxy.hole.test.ts
//
// Capture-time tests for Shape.hole() and Shape.holes(). Covers (a) the
// FeatureRecord shape produced for each opt combination, and (b) every
// §D.1 trigger from spec 2026-05-05-v0.3-slice1-hole-cutout-design.
//
// Discipline: every error path asserts code === 'feature.invalid-args' AND
// a hint substring. No new diagnostic codes are introduced.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { kernelErrorToDiagnostic } from '../../../src/agent/script-runtime/kernelErrorToDiagnostic';

async function runAndCatch(code: string): Promise<unknown> {
  let caught: unknown;
  try {
    await runScript({ code, fileName: 'test.kcad.ts' });
  } catch (e) {
    caught = e;
  }
  return caught;
}

describe('Shape.hole capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('registers a hole record with target+face inputs and u/v/diameter/depth params', async () => {
    const code = `return box(20, 20, 20).hole('top', { u: 5, v: 5, diameter: 4, depth: 6 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(2);
    const hole = result.records[1];
    expect(hole.kind).toBe('hole');
    expect(hole.inputs.target).toEqual({ kind: 'feature', id: result.records[0].id });
    expect(hole.inputs.face).toEqual({
      kind: 'face',
      featureId: result.records[0].id,
      ref: { kind: 'canonical', face: 'top' },
    });
    expect(hole.params.u.evaluated).toBe(5);
    expect(hole.params.v.evaluated).toBe(5);
    expect(hole.params.diameter.evaluated).toBe(4);
    expect(hole.params.depth.evaluated).toBe(6);
  });

  it('captures a through-hole as depthMode=through (no numeric depth)', async () => {
    const code = `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const hole = result.records[1];
    expect(hole.params.depthMode.expression).toBe("'through'");
    expect(hole.params.depth).toBeUndefined();
  });

  it('captures counterbore params and metadata', async () => {
    const code = `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', counterbore: { diameter: 11, depth: 4 } });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const hole = result.records[1];
    expect(hole.params.counterboreDiameter.evaluated).toBe(11);
    expect(hole.params.counterboreDepth.evaluated).toBe(4);
  });

  it('captures countersink with default 90deg angle when angleDeg omitted', async () => {
    const code = `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 4, depth: 'through', countersink: { diameter: 8 } });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const hole = result.records[1];
    expect(hole.params.countersinkDiameter.evaluated).toBe(8);
    expect(hole.params.countersinkAngleDeg.evaluated).toBe(90);
  });

  // §D.1 triggers --------------------------------------------------------------

  it('feature.invalid-args when neither depth nor upToFace is set', async () => {
    const caught = await runAndCatch(`return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 4 });`);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('depth (number');
  });

  it('feature.invalid-args when both depth and upToFace are set', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 4, depth: 5, upToFace: { kind: 'canonical', face: 'bottom' } });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('not both');
  });

  it('feature.invalid-args when both counterbore and countersink are set', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 4, depth: 6, counterbore: { diameter: 8, depth: 2 }, countersink: { diameter: 8 } });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('mutually exclusive');
  });

  it('feature.invalid-args when diameter is non-positive', async () => {
    const caught = await runAndCatch(`return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 0, depth: 5 });`);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('diameter');
  });

  it('feature.invalid-args when diameter exceeds 1000mm', async () => {
    const caught = await runAndCatch(`return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 1500, depth: 5 });`);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('1000');
  });

  it('feature.invalid-args when counterbore.diameter is not greater than diameter', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 10, depth: 5, counterbore: { diameter: 8, depth: 2 } });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('Counterbore is the wider shoulder');
  });

  it('feature.invalid-args when countersink.diameter is not greater than diameter', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 10, depth: 5, countersink: { diameter: 8 } });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('countersink.diameter');
  });

  it('feature.invalid-args when countersink.angleDeg is out of (0,180)', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 4, depth: 5, countersink: { diameter: 8, angleDeg: 200 } });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('(0, 180)');
  });

  it('feature.invalid-args when u or v is non-finite', async () => {
    const caught = await runAndCatch(`return box(20, 20, 20).hole('top', { u: NaN, v: 0, diameter: 4, depth: 5 });`);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('finite numbers');
  });
});

describe('Shape.holes capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('registers a holes record with positions array in metadata', async () => {
    const code = `return box(40, 40, 10).holes('top', {
      positions: [{u: -10, v: -10}, {u: 10, v: -10}, {u: -10, v: 10}, {u: 10, v: 10}],
      diameter: 5, depth: 'through',
    });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const holes = result.records[1];
    expect(holes.kind).toBe('holes');
    expect(holes.params.diameter.evaluated).toBe(5);
    expect(holes.params.positionCount.evaluated).toBe(4);
    expect((holes.metadata as { positions: unknown[] }).positions).toHaveLength(4);
  });

  it('feature.invalid-args when positions is empty', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).holes('top', { positions: [], diameter: 5, depth: 'through' });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('use .hole() instead');
  });

  it('feature.invalid-args when a position has non-finite u or v', async () => {
    const caught = await runAndCatch(
      `return box(20, 20, 20).holes('top', { positions: [{u: 0, v: NaN}], diameter: 5, depth: 'through' });`,
    );
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('finite numbers');
  });
});
