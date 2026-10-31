// tests/unit/capture/pathCircleAndTorus.test.ts
//
// Slice F1: `path().circle(cx, cy, r)` + top-level `torus(majorR, minorR)`.
// Surfaced 2× in agent-eval (eyebolt + others): there was no first-class
// circle primitive at the path level, and no torus primitive. Agents had
// to emit trig in TS to build polyline circles.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createModelingApi({ session }) };
}

describe('path().circle(cx, cy, r)', () => {
  beforeAll(async () => { await initOcct(); });

  it('produces a closed-disc sketch that extrudes to a positive-volume cylinder', async () => {
    const m = await buildModel({
      fileName: 'path-circle.kcad.ts',
      code: `return path().circle(0, 0, 5).extrude(10);`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape).toBeDefined();
    // The default circle is exact: π · 25 · 10 ≈ 785.40.
    const v = m.tailShape!.volume();
    expect(v).toBeCloseTo(Math.PI * 25 * 10, 3);
  });

  it('revolves the default (exact) circle into a true torus with few faces', async () => {
    const m = await buildModel({
      fileName: 'path-circle-ring.kcad.ts',
      code: `return path().circle(7, 0, 0.55).revolve();`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // 2π² R r² — a 48-gon gave 48 faces, each making later booleans slower.
    expect(m.tailShape!.volume()).toBeCloseTo(2 * Math.PI ** 2 * 7 * 0.55 ** 2, 3);
    expect(m.tailShape!.faceHashes().length).toBeLessThanOrEqual(2);
  });

  it('still builds a polygon when segments is given', async () => {
    const m = await buildModel({
      fileName: 'path-circle-48.kcad.ts',
      code: `return path().circle(0, 0, 5, 48).extrude(10);`,
    });
    // 48-gon area = (n/2) r² sin(2π/n) ≈ 78.31, so volume ≈ 783.
    const v = m.tailShape!.volume();
    expect(v).toBeGreaterThan(780);
    expect(v).toBeLessThan(785);
  });

  it('respects a higher segment count for finer approximation', async () => {
    const m = await buildModel({
      fileName: 'path-circle-fine.kcad.ts',
      code: `return path().circle(0, 0, 10, 120).extrude(1);`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // Analytic = π · 100 · 1 ≈ 314.16. 120-gon should be within 0.1%.
    const v = m.tailShape!.volume();
    expect(v).toBeGreaterThan(313);
    expect(v).toBeLessThan(315);
  });

  it('rejects non-finite or non-positive radius', () => {
    const { api } = makeApi();
    expect(() => api.path().circle(0, 0, 0)).toThrow(KernelError);
    try { api.path().circle(0, 0, 0); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/requires r > 0/);
    }
    expect(() => api.path().circle(0, 0, NaN)).toThrow(KernelError);
  });

  it('rejects circle() chained after other path commands', () => {
    const { api } = makeApi();
    expect(() => api.path().moveTo(0, 0).circle(5, 5, 3)).toThrow(/must be the only operation/);
  });

  it('rejects segments < 3', () => {
    const { api } = makeApi();
    expect(() => api.path().circle(0, 0, 5, 2)).toThrow(/segments — got 2; requires an integer >= 3/);
  });
});

describe('torus(majorR, minorR)', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds a positive-volume torus matching the analytic formula within ~5%', async () => {
    const m = await buildModel({
      fileName: 'torus-basic.kcad.ts',
      code: `return torus(20, 5);`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape).toBeDefined();
    const v = m.tailShape!.volume();
    // Analytic torus volume = 2π² R r² = 2π² · 20 · 25 ≈ 9869.6.
    // 48-segment polyline approximation comes within ~5%.
    expect(v).toBeGreaterThan(9200);
    expect(v).toBeLessThan(10100);
  });

  it('rejects minorR >= majorR (self-intersecting)', () => {
    const { api } = makeApi();
    expect(() => api.torus(5, 5)).toThrow(/minorR — got 5; requires minorR < majorR/);
    expect(() => api.torus(5, 6)).toThrow(/minorR — got 6; requires minorR < majorR/);
  });

  it('rejects non-finite or non-positive radii', () => {
    const { api } = makeApi();
    expect(() => api.torus(-1, 5)).toThrow(/majorR — got -1; requires a finite number > 0/);
    expect(() => api.torus(0, 5)).toThrow(/majorR — got 0; requires a finite number > 0/);
    expect(() => api.torus(NaN, 5)).toThrow(/majorR — got NaN; requires a finite number > 0/);
  });
});
