import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../src/capture/captureSession';
import { createApi } from '../../src/modeling/api';

function cablePortProfile(api: ReturnType<typeof createApi>) {
  return api.path()
    .moveTo(-8, -4)
    .lineTo(8, -4)
    .lineTo(8, 4)
    .lineTo(-8, 4)
    .close();
}

describe('v0.3 slice-3 — boolean param gating', () => {
  beforeAll(async () => { await initOcct(); });

  it('build-time enabled=false gates a named cutout and warns on downstream face ref', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const addCablePort = api.param('addCablePort', false);
    const plate = api.box(80, 50, 6)
      .cutout(cablePortProfile(api), {
        face: 'top',
        depth: 'through',
        name: 'cablePort',
        enabled: addCablePort,
      })
      .fillet(0.5, { face: 'cablePort.wall' });

    const shape = await plate.lower();

    expect(shape.volume()).toBeGreaterThan(0);
    expect(session.warnings).toHaveLength(1);
    expect(session.warnings[0]).toMatchObject({
      code: 'feature.face-ref.not-resolvable',
      hint: 'face-ref.skipped-by-param',
      recordId: session.getRecords().find(r => r.kind === 'fillet')?.id,
      paramName: 'addCablePort',
      phase: 'build',
    });
  });

  it('params.update gates and ungates a named cutout with per-call warnings', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const addCablePort = api.param('addCablePort', true);
    const plate = api.box(80, 50, 6)
      .cutout(cablePortProfile(api), {
        face: 'top',
        depth: 'through',
        name: 'cablePort',
        enabled: addCablePort,
      })
      .fillet(0.5, { face: 'cablePort.wall' });

    const initial = await plate.lower();
    expect(session.warnings).toEqual([]);

    const gated = await session.params.update([{ name: 'addCablePort', value: false }]);
    expect(gated.shape.volume()).toBeGreaterThan(initial.volume());
    expect(gated.warnings).toHaveLength(1);
    expect(gated.warnings[0]).toMatchObject({
      code: 'feature.face-ref.not-resolvable',
      hint: 'face-ref.skipped-by-param',
      recordId: session.getRecords().find(r => r.kind === 'fillet')?.id,
      paramName: 'addCablePort',
      phase: 'update',
    });
    expect(session.warnings.at(-1)).toMatchObject(gated.warnings[0]);

    const ungated = await session.params.update([{ name: 'addCablePort', value: true }]);
    expect(ungated.shape.volume()).toBeCloseTo(initial.volume(), 3);
    expect(ungated.warnings).toEqual([]);
  });

  it('keeps typos fatal instead of treating them as gated lineage warnings', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const addCablePort = api.param('addCablePort', false);
    const plate = api.box(80, 50, 6)
      .cutout(cablePortProfile(api), {
        face: 'top',
        depth: 'through',
        name: 'cablePort',
        enabled: addCablePort,
      })
      .fillet(0.5, { face: 'cabblePort.wall' });

    await expect(plate.lower()).rejects.toThrow(/not lowered/);
    expect(session.warnings).toEqual([]);
  });
});
