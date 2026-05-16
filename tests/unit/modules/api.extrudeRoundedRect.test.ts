import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';

describe('extrudeRoundedRect top-level API', () => {
  beforeAll(async () => { await initOcct(); });

  it('captures an extrude record with profile=rounded-rect and width/height/radius/depth params', async () => {
    const code = `return extrudeRoundedRect(20, 20, 2, 5);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    const r = result.records[0];
    expect(r.kind).toBe('extrude');
    expect(r.params.profileKind.expression).toBe(`'rounded-rect'`);
    expect(r.params.width.evaluated).toBe(20);
    expect(r.params.height.evaluated).toBe(20);
    expect(r.params.radius.evaluated).toBe(2);
    expect(r.params.depth.evaluated).toBe(5);
  });

  it('lowers + recomputes successfully', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/kernel/backends/occt/occtLowerer');
    const code = `return extrudeRoundedRect(40, 20, 3, 4);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    expect(r.shapes.get(last.id)!.volume()).toBeLessThan(40 * 20 * 4);
    expect(r.shapes.get(last.id)!.volume()).toBeGreaterThan(40 * 20 * 4 * 0.9);
  });
});
