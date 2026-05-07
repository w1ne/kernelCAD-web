import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { createApi } from '../../../../src/modules/api';

describe('OCCT assembly lowerer', () => {
  beforeAll(async () => { await initOcct(); });

  it('keeps assembly part and joint records executable as geometry passthroughs', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link arm');
    const base = arm.part('base', kcad.box(20, 20, 6), { at: [0, 0, 0] });
    const link = arm.part('link', kcad.box(80, 10, 6), { at: [30, 0, 6] });
    const shoulder = arm.revolute('shoulder', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 6],
      limitsDeg: [-90, 90],
    });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    expect(result.shapes.get(base.id)).toBeDefined();
    expect(result.shapes.get(link.id)).toBeDefined();
    expect(result.shapes.get(shoulder.id)).toBeDefined();
    expect(result.shapes.get(link.id)?.boundingBox().min[0]).toBeGreaterThan(20);
  });
});
