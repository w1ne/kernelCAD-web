import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createApi } from '../../src/modeling/api';

describe('v0.3 slice-3 session export/import', () => {
  beforeAll(async () => { await initOcct(); });

  it('round-trips schema v3 params and records', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const boltDia = api.param('boltDia', 5, { min: 1, max: 20 });
    const plate = api.box(60, 40, 5).hole('top', {
      u: 0,
      v: 0,
      diameter: boltDia,
      depth: 'through',
    });
    const initial = await plate.lower();

    const exported = session.exportSession();
    expect(exported.schemaVersion).toBe(3);
    expect(exported.params.boltDia).toMatchObject({
      type: 'number',
      value: 5,
      defaultValue: 5,
      meta: { min: 1, max: 20 },
    });
    expect(exported.records).toHaveLength(2);

    const imported = CaptureSession.importSession(exported);
    expect(imported.paramTable.get('boltDia').value).toBe(5);
    expect(imported.getRecords()).toEqual(session.getRecords());

    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(imported.getRecords(), { paramTable: imported.paramTable });
    const tailId = imported.getRecords().at(-1)!.id;
    expect(result.shapes.get(tailId)?.volume()).toBeCloseTo(initial.volume(), 3);
  });

  it('loads legacy sessions without params as an empty param table', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    api.box(10, 10, 10);

    const imported = CaptureSession.importSession({
      schemaVersion: 2,
      records: session.getRecords(),
    });

    expect(imported.paramTable.size()).toBe(0);
    expect(imported.getRecords()).toEqual(session.getRecords());
  });

  it('rejects schema v3 records that reference params missing from the table', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const boltDia = api.param('boltDia', 5);
    api.box(60, 40, 5).hole('top', {
      u: 0,
      v: 0,
      diameter: boltDia,
      depth: 'through',
    });
    const exported = session.exportSession();
    delete exported.params.boltDia;

    expect(() => CaptureSession.importSession(exported)).toThrow(/unknown param ref 'boltDia'/);
  });
});
