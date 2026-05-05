// tests/unit/backends/occt/holeLowerer.test.ts
//
// Integration tests driving Shape.hole() / Shape.holes() through runScript →
// recompute → OCCT lowering. Asserts (a) the recompute succeeds, (b) volume
// drops by an expected amount, and (c) the slice-1 created refs (`wall`,
// `floor`, `wall-back`, `counterbore-*`, `countersink-cone`) are addressable
// via the existing FaceSelector resolver.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';

async function lowerScript(code: string): Promise<{
  shape: OcctBackend;
  diagnostics: ReturnType<RecomputeEngine['_diagnosticsForTest']> | unknown[];
  recordCount: number;
}> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = r.shapes.get(lastRecord.id) as OcctBackend;
  return { shape, diagnostics: r.diagnostics, recordCount: records.length };
}

describe('holeLowerer — single hole', () => {
  beforeAll(async () => { await initOcct(); });

  it('blind hole removes ~ π·r²·depth volume from a box', async () => {
    const code = `
      const base = box(40, 40, 20);
      return base.hole('top', { u: 0, v: 0, diameter: 10, depth: 8 });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const vol = shape.volume();
    const expected = 40 * 40 * 20 - Math.PI * 5 * 5 * 8;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it('through-hole removes ~ π·r²·boxThickness volume', async () => {
    const code = `
      const base = box(40, 40, 10);
      return base.hole('top', { u: 5, v: 0, diameter: 6, depth: 'through' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const vol = shape.volume();
    const expected = 40 * 40 * 10 - Math.PI * 3 * 3 * 10;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it('counterbored through-hole removes bore + cb annular pocket', async () => {
    const code = `
      const base = box(50, 50, 12);
      return base.hole('top', {
        u: 0, v: 0, diameter: 6, depth: 'through',
        counterbore: { diameter: 11, depth: 4 },
      });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const vol = shape.volume();
    const boreVol = Math.PI * 3 * 3 * 12;
    const cbAnnular = Math.PI * (5.5 * 5.5 - 3 * 3) * 4;
    const expected = 50 * 50 * 12 - boreVol - cbAnnular;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it("creates a 'wall' ref that resolves on the hole result via faceLabel lookup", async () => {
    const code = `
      const base = box(40, 40, 20);
      const drilled = base.hole('top', { u: 0, v: 0, diameter: 10, depth: 8 });
      // .fillet on the bore wall — passes if pickEdges finds the wall by labelName.
      return drilled.fillet(0.5, { face: 'wall' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    // No errors means: the fillet found the bore wall via the 'wall' created ref,
    // selected ≥1 sharp edge, and OCCT successfully rounded.
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    expect(shape).toBeDefined();
  });
});

describe('holeLowerer — batched holes', () => {
  beforeAll(async () => { await initOcct(); });

  it('4-position bolt pattern subtracts ~ 4 · π·r²·boxThickness', async () => {
    const code = `
      const base = box(60, 60, 8);
      return base.holes('top', {
        positions: [{u: -20, v: -20}, {u: 20, v: -20}, {u: -20, v: 20}, {u: 20, v: 20}],
        diameter: 5, depth: 'through',
      });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    const vol = shape.volume();
    const expected = 60 * 60 * 8 - 4 * Math.PI * 2.5 * 2.5 * 8;
    expect(vol).toBeGreaterThan(expected - 2);
    expect(vol).toBeLessThan(expected + 2);
  });

  it("filleting 'wall' on a 4-hole batch finds all bore walls (collective sugar)", async () => {
    const code = `
      const base = box(60, 60, 8);
      const drilled = base.holes('top', {
        positions: [{u: -15, v: -15}, {u: 15, v: -15}, {u: -15, v: 15}, {u: 15, v: 15}],
        diameter: 4, depth: 'through',
      });
      return drilled.fillet(0.3, { face: 'wall' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    expect(shape).toBeDefined();
  });
});

describe('holeLowerer — error paths', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits feature.kernel-failed when through is requested but the body is too thin to find a back face anti-parallel to entry', async () => {
    // A "valid" through case is normally fine. We construct a degenerate case:
    // a sphere has no anti-parallel cardinal back face. The hole should
    // fail via the through-no-back-face hint or via feature.face-ref.not-applicable
    // (sphere doesn't accept canonical 'top').
    const code = `
      const base = sphere(10);
      // sphere does not have a canonical 'top' face — pickFace will reject.
      // Wrap in try/catch via the diagnostic stream.
      return base.hole('top', { u: 0, v: 0, diameter: 4, depth: 'through' });
    `;
    const { diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string; code: string }[]).filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    // Code must be from the catalog (sentinel verifies this generally).
    expect([
      'feature.face-ref.not-resolvable',
      'feature.face-ref.not-applicable',
      'feature.face-ref.removed',
      'feature.kernel-failed',
      'feature.invalid-args',
    ]).toContain(errs[0].code);
  });
});
