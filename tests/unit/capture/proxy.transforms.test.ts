// tests/unit/capture/proxy.transforms.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';

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
    expect(diag.code).toBe('feature.transform.invalid-translate');
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
    expect(diag.code).toBe('feature.transform.invalid-rotate');
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
    expect(diag.code).toBe('feature.transform.invalid-scale');
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

  it('scale does not throw for valid positive factor', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).scale(2);`, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toHaveLength(1);
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
    expect(diag.code).toBe('feature.transform.invalid-reflect');
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
    expect(diag.code).toBe('feature.transform.invalid-reflect');
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
    expect(diag.code).toBe('feature.mirror.invalid-plane');
    expect(diag.featureId).toBeDefined();
    expect(typeof diag.featureId).toBe('string');
  });

  it('mirror does not throw for valid cardinal plane', async () => {
    const result = await runScript({ code: `return box(5, 5, 5).mirror('yz');`, fileName: 'test.kcad.ts' });
    // mirror creates a new feature record
    expect(result.records.length).toBeGreaterThanOrEqual(1);
  });
});
