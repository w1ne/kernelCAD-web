// tests/unit/backends/occt/cutoutLowerer.test.ts
//
// Integration tests driving Shape.cutout() through runScript → recompute →
// OCCT lowering. Asserts (a) recompute succeeds, (b) volume drops match the
// expected prism volume, and (c) the slice-1 created refs (`wall`, `floor`,
// `wall-back`) resolve via FaceSelector.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
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

  it('cuts through the whole body when an unrelated underside pocket has a nearer floor', async () => {
    const code = `
      const recess = path().moveTo(-15,-15).lineTo(-5,-15).lineTo(-5,-5).lineTo(-15,-5).close();
      const slot = path().moveTo(7,7).lineTo(13,7).lineTo(13,13).lineTo(7,13).close();
      return box(40,40,8).cutout(recess, { face: 'bottom', depth: 3 })
        .cutout(slot, { face: 'top', depth: 'through' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect((diagnostics as { severity: string }[]).filter(d => d.severity === 'error')).toEqual([]);
    const expected = 40 * 40 * 8 - 10 * 10 * 3 - 6 * 6 * 8;
    expect(shape.volume()).toBeGreaterThan(expected - 2);
    expect(shape.volume()).toBeLessThan(expected + 2);
  });

  it('cuts from the bottom through the body despite an unrelated top pocket', async () => {
    const code = `
      const recess = path().moveTo(-15,-15).lineTo(-5,-15).lineTo(-5,-5).lineTo(-15,-5).close();
      const slot = path().moveTo(7,7).lineTo(13,7).lineTo(13,13).lineTo(7,13).close();
      return box(40,40,8).cutout(recess, { face: 'top', depth: 3 })
        .cutout(slot, { face: 'bottom', depth: 'through' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect((diagnostics as { severity: string }[]).filter(d => d.severity === 'error')).toEqual([]);
    const expected = 40 * 40 * 8 - 10 * 10 * 3 - 6 * 6 * 8;
    expect(shape.volume()).toBeGreaterThan(expected - 2);
    expect(shape.volume()).toBeLessThan(expected + 2);
  });

  it('cuts through a side face despite an unrelated recess on the opposing face', async () => {
    const code = `
      const recess = path().moveTo(-13,-2).lineTo(-7,-2).lineTo(-7,2).lineTo(-13,2).close();
      const slot = path().moveTo(7,-2).lineTo(13,-2).lineTo(13,2).lineTo(7,2).close();
      return box(40,40,8).cutout(recess, { face: 'left', depth: 3 })
        .cutout(slot, { face: 'right', depth: 'through' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect((diagnostics as { severity: string }[]).filter(d => d.severity === 'error')).toEqual([]);
    const expected = 40 * 40 * 8 - 6 * 4 * 3 - 6 * 4 * 40;
    expect(shape.volume()).toBeGreaterThan(expected - 2);
    expect(shape.volume()).toBeLessThan(expected + 2);
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
