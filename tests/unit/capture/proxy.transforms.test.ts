// tests/unit/capture/proxy.transforms.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { formatScalarForError } from '../../../src/shared/intent/types';

describe('Shape transform validators (capture-time)', () => {
  beforeAll(async () => { await initOcct(); });

  // translate ----------------------------------------------------------------

  it('translate throws feature.transform.invalid-translate when given a NaN', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).translate(NaN, 0, 0);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.featureId).toBeDefined();
    expect(typeof diag.featureId).toBe('string');
  });

  it('translate throws feature.transform.invalid-translate when given Infinity', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).translate(0, Infinity, 0);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/invalid-translate|finite/i);
  });

  it('translate does not throw for valid finite vector', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).translate(1, 2, 3);`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toHaveLength(1);
  });

  // rotate -------------------------------------------------------------------

  it('rotate throws feature.transform.invalid-rotate when degrees is Infinity', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).rotate([0, 0, 1], Infinity);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.featureId).toBeDefined();
  });

  it('rotate throws feature.transform.invalid-rotate when axis contains NaN', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).rotate([NaN, 0, 1], 45);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/invalid-rotate|finite/i);
  });

  it('rotate throws feature.transform.invalid-rotate when pivot is malformed', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).rotate([0, 0, 1], 45, [0, NaN, 0]);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/invalid-rotate|finite/i);
  });

  it('rotate error message preserves NaN degrees value', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).rotate([0, 0, 1], NaN);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/NaN/);
  });

  it('rotate does not throw for valid axis and degrees', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).rotate([0, 0, 1], 90);`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toHaveLength(1);
  });

  // scale --------------------------------------------------------------------

  it('scale throws feature.transform.invalid-scale when factor is negative', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).scale(-1);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.featureId).toBeDefined();
  });

  it('scale throws feature.transform.invalid-scale when factor is zero', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).scale(0);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/invalid-scale|positive/i);
  });

  it('scale throws feature.transform.invalid-scale when per-axis factor is negative', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).scale(1, -2, 1);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/invalid-scale|positive/i);
  });

  it('scale error message preserves NaN value', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).scale(NaN);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/NaN/);
  });

  it('scale does not throw for valid positive factor', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).scale(2);`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toHaveLength(1);
  });

  it('scale captures non-uniform per-axis factors on the transform record', async () => {
    // Render-primitives slice (2026-05-09): Shape.scale now accepts Vec3 for
    // non-uniform scale. Capture writes per-axis components; lowering still
    // requires a uniform diagonal until BRepBuilderAPI_GTransform ships in
    // the active OCCT WASM build. See `tests/unit/capture/shapeScaleVec3.test.ts`.
    const result = await runScript({ code: `return box(10, 10, 10).scale(2, 3, 4);`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toEqual([
      { op: 'scale', sx: 2, sy: 3, sz: 4 },
    ]);
  });

  it('scale accepts explicit per-axis args (uniform triple)', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).scale(2, 2, 2);`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toEqual([
      { op: 'scale', sx: 2, sy: 2, sz: 2 },
    ]);
  });

  // reflect ------------------------------------------------------------------

  it('reflect throws feature.transform.invalid-reflect when plane is malformed', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).reflect('z');`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.featureId).toBeDefined();
    expect(typeof diag.featureId).toBe('string');
  });

  it('reflect throws feature.transform.invalid-reflect for null plane', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).reflect(null);`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
  });

  it('reflect error message preserves Infinity in offset', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).reflect({ plane: 'yz', offset: Infinity });`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/Infinity/);
  });

  it('reflect does not throw for valid cardinal plane', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).reflect('xy');`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toHaveLength(1);
  });

  // mirror -------------------------------------------------------------------

  it('mirror throws feature.mirror.invalid-plane when plane is malformed', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).mirror('z');`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.featureId).toBeDefined();
    expect(typeof diag.featureId).toBe('string');
  });

  it('mirror error message preserves NaN in offset', async () => {
    let caught: unknown;
    try {
      await runScript({ code: `return box(10, 10, 10).mirror({ plane: 'yz', offset: NaN });`, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/NaN/);
  });

  it('mirror does not throw for valid cardinal plane', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).mirror('yz');`, fileName: 'test.kcad.ts' });
    // mirror creates a new feature record
    expect(result.records.length).toBeGreaterThanOrEqual(1);
  });
});

describe('formatScalarForError robustness', () => {
  it('handles circular objects without crashing', () => {
    const o: { self?: unknown } = {};
    o.self = o;
    expect(formatScalarForError(o)).toMatch(/<circular>/);
  });

  it('handles BigInt without throwing', () => {
    expect(formatScalarForError(BigInt(123))).toBe('123n');
  });

  it('handles Symbol without throwing', () => {
    const sym = Symbol('test');
    expect(formatScalarForError(sym)).toMatch(/Symbol\(test\)/);
  });

  it('handles undefined gracefully', () => {
    // JSON.stringify(undefined) returns undefined (not a string), which
    // could cause downstream issues; verify the helper produces something
    // string-shaped.
    const result = formatScalarForError(undefined);
    expect(typeof result).toBe('string');
  });

  it('handles deep nesting without stack overflow', () => {
    // Deeply nested but non-circular — should still work.
    const deep: any = {};
    let cur = deep;
    for (let i = 0; i < 100; i++) {
      cur.next = {};
      cur = cur.next;
    }
    // Should not throw RangeError.
    expect(() => formatScalarForError(deep)).not.toThrow();
  });
});
