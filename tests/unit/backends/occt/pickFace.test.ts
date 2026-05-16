// tests/unit/backends/occt/pickFace.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/kernel/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('pickFace query dispatch (shell with FaceQuery)', () => {
  beforeAll(async () => { await initOcct(); });

  it('box(10,10,5).shell(1, { face: { atZ: 5 } }) hollows out the top face', async () => {
    const code = `return box(10, 10, 5).shell(1, { face: { atZ: 5 } });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    // Original 10x10x5 = 500. Shell with thickness 1 leaving the top open
    // hollows out an inner 8x8x4 cavity ≈ 256 mm³, so volume ≈ 244.
    // Wide bound to absorb implementation tolerance.
    expect(v).toBeGreaterThan(200);
    expect(v).toBeLessThan(320);
  });

  it('box.shell(1, { face: { atZ: 0 } }) (bottom face) works symmetrically', async () => {
    const code = `return box(10, 10, 5).shell(1, { face: { atZ: 0 } });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(200);
    expect(v).toBeLessThan(320);
  });

  it('box.shell(1, { face: { atZ: 999 } }) emits feature.selection.no-match', async () => {
    // Post-vocabulary-collapse (milestone C), shell + fillet share the
    // unified feature.selection.no-match code (no per-surface namespace).
    const code = `return box(10, 10, 5).shell(1, { face: { atZ: 999 } });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.selection.no-match' && d.severity === 'error'
    )).toBe(true);
  });

  it('canonical shell still works after pickFace widening (regression)', async () => {
    const code = `return box(10, 10, 5).shell(1, { face: 'top' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });
});
