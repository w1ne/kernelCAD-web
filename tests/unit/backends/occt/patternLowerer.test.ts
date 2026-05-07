import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { createApi } from '../../../../src/modules/api';

describe('OCCT pattern lowerer', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a linear pattern into a fused repeated solid', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.box(2, 2, 2).patternLinear({ count: 3, direction: [1, 0, 0], spacing: 4 });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    expect(pattern).toBeDefined();
    if (!pattern) throw new Error('pattern did not lower');
    const bbox = pattern.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeGreaterThan(9);
  });

  it('lowers a circular pattern into a fused repeated solid around an axis', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.box(2, 2, 2).translate(6, 0, 0).patternCircular({ count: 4, axis: [0, 0, 1] });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    expect(pattern).toBeDefined();
    if (!pattern) throw new Error('pattern did not lower');
    const bbox = pattern.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeGreaterThan(12);
    expect(bbox.max[1] - bbox.min[1]).toBeGreaterThan(12);
  });

  it('lowers a grid pattern into a fused 2D repeated solid', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.box(2, 2, 2).patternGrid({
      x: { count: 3, direction: [1, 0, 0], spacing: 4 },
      y: { count: 2, direction: [0, 1, 0], spacing: 5 },
    });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    expect(pattern).toBeDefined();
    if (!pattern) throw new Error('pattern did not lower');
    const bbox = pattern.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeGreaterThan(9);
    expect(bbox.max[1] - bbox.min[1]).toBeGreaterThan(6);
  });
});
