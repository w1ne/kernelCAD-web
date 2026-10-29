import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../../src/modeling/buildModel';

beforeAll(async () => { await initOcct(); }, 60000);

describe('ParamRef scale non-positive fails closed on re-lower', () => {
  it('fails closed (rejects) when a scale param is updated to non-positive', async () => {
    const model = await buildModel({
      fileName: 'scale-param.kcad.ts',
      code: `
        const s = param('scale', 2);
        return box(10, 10, 10).scale(s);
      `,
    });

    await expect(model.session.params.update([{ name: 'scale', value: -1 }])).rejects.toBeTruthy();
  }, 120000);

  it('emits feature.invalid-args on re-lower via updated paramTable', async () => {
    const { runScript } = await import('../../../../src/modeling/runtime/runScript');
    const { RecomputeEngine } = await import('../../../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../../src/modeling/backends/occt/occtLowerer');
    const run = await runScript({ code: `const s = param('scale', 2); return box(10,10,10).scale(s);`, fileName: '<test>' });
    const pt = run.session.paramTable;
    pt.set('scale', -1);
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records, { paramTable: pt });
    expect(result.diagnostics.map((d) => d.code)).toContain('feature.invalid-args');
  }, 120000);

  it('emits feature.invalid-args for a direct non-positive scale transform IR', async () => {
    const { runScript } = await import('../../../../src/modeling/runtime/runScript');
    const { RecomputeEngine } = await import('../../../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../../src/modeling/backends/occt/occtLowerer');
    const run = await runScript({ code: 'return box(10, 10, 10);', fileName: '<test>' });
    const records = run.records;
    records[0].transforms = [{ op: 'scale', sx: -2, sy: 1, sz: 1 }] as never;
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.diagnostics.map((d) => d.code)).toContain('feature.invalid-args');
  }, 60000);
});