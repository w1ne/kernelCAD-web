import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';

describe('extrudePolygon top-level API', () => {
  beforeAll(async () => { await initOcct(); });

  it('captures an extrude record with profile=polygon and points in metadata', async () => {
    const code = `return extrudePolygon([[0, 0], [10, 0], [5, 8]], 5);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].kind).toBe('extrude');
    expect(result.records[0].params.profileKind.expression).toBe(`'polygon'`);
    expect(result.records[0].params.depth.evaluated).toBe(5);
    expect(result.records[0].metadata?.points).toEqual([[0, 0], [10, 0], [5, 8]]);
  });

  it('captures arbitrary point counts', async () => {
    const code = `return extrudePolygon([[0,0],[10,0],[10,10],[0,10],[0,5]], 3);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const r = result.records[0];
    expect((r.metadata as { points: unknown[] }).points).toHaveLength(5);
  });

  it('lowers + recomputes successfully', async () => {
    const { RecomputeEngine } = await import('../../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/modeling/backends/occt/occtLowerer');
    const code = `return extrudePolygon([[0,0],[10,0],[10,10],[0,10]], 2);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    expect(r.shapes.get(last.id)!.volume()).toBeCloseTo(200, 1);
  });
});
