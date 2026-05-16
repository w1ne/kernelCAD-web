import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';

describe('top-level path() API', () => {
  beforeAll(async () => { await initOcct(); });

  it('chains path().moveTo().lineTo().close().extrude() into a captured shape', async () => {
    const code = `return path().moveTo(0,0).lineTo(20,0).lineTo(20,15).lineTo(0,15).close().extrude(3);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records.map(r => r.kind)).toEqual(['sketch', 'extrude']);
  });

  it('lowers an L-bracket profile through the full pipeline', async () => {
    const { RecomputeEngine } = await import('../../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/modeling/backends/occt/occtLowerer');
    const code = `return path()
      .moveTo(0, 0)
      .lineTo(20, 0)
      .lineTo(20, 10)
      .lineTo(10, 10)
      .lineTo(10, 20)
      .lineTo(0, 20)
      .close()
      .extrude(5);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    // L-bracket: 20*10 + 10*20 - 10*10 (overlap) = 300 area; volume @ depth 5 = 1500
    expect(r.shapes.get(last.id)!.volume()).toBeCloseTo(1500, 0);
  });
});
