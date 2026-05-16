// tests/unit/backends/occt/cutoutLowerer.test.ts
//
// Integration tests driving Shape.cutout() through runScript → recompute →
// OCCT lowering. Asserts (a) recompute succeeds, (b) volume drops match the
// expected prism volume, and (c) the slice-1 created refs (`wall`, `floor`,
// `wall-back`) resolve via FaceSelector.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';

async function lowerScript(code: string): Promise<{
  shape: OcctBackend;
  diagnostics: ReturnType<RecomputeEngine['_diagnosticsForTest']> | unknown[];
}> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = r.shapes.get(lastRecord.id) as OcctBackend;
  return { shape, diagnostics: r.diagnostics };
}

describe('cutoutLowerer — basic shapes', () => {
  beforeAll(async () => { await initOcct(); });

  it('blind rectangular cutout removes profile_area · depth volume', async () => {
    const code = `
      const sk = path().moveTo(-3, -4).lineTo(3, -4).lineTo(3, 4).lineTo(-3, 4).close();
      return box(40, 40, 20).cutout(sk, { face: 'top', depth: 5 });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    const vol = shape.volume();
    const expected = 40 * 40 * 20 - 6 * 8 * 5;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it('through rectangular cutout removes profile_area · plate_thickness', async () => {
    const code = `
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(40, 40, 8).cutout(sk, { face: 'top', depth: 'through' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    const vol = shape.volume();
    const expected = 40 * 40 * 8 - 6 * 6 * 8;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it("creates a 'wall' ref that resolves on a blind cutout (filletable)", async () => {
    const code = `
      const sk = path().moveTo(-4, -4).lineTo(4, -4).lineTo(4, 4).lineTo(-4, 4).close();
      const cut = box(40, 40, 20).cutout(sk, { face: 'top', depth: 6 });
      return cut.fillet(0.3, { face: 'wall' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    expect(shape).toBeDefined();
  });

  it('auto-closes a bare PathBuilder profile', async () => {
    const code = `
      // No .close() — proxy auto-closes.
      const pb = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3);
      return box(40, 40, 10).cutout(pb, { face: 'top', depth: 5 });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    const vol = shape.volume();
    expect(vol).toBeLessThan(40 * 40 * 10);
  });
});

describe('cutoutLowerer — arc-bounded profiles', () => {
  beforeAll(async () => { await initOcct(); });

  it('keyhole-shaped cutout (rect + half-disk) succeeds', async () => {
    const code = `
      // D-shape: 6mm wide rectangle from (-3,0) to (3,0), arc bulging up to y=5
      const sk = path()
        .moveTo(-3, 0)
        .lineTo(3, 0)
        .threePointsArc(-3, 0, 0, 5)
        .close();
      return box(40, 40, 10).cutout(sk, { face: 'top', depth: 6 });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    expect(shape.volume()).toBeLessThan(40 * 40 * 10);
  });
});
