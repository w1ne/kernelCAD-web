import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/kernel/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
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

  it('linear pattern historyMap carries <sourceId>_pattern_<i> retags', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // Disjoint plates (spacing 10 > plate width 6) so each instance's
    // bore wall survives the cumulative boolean union — confirms that the
    // pattern lowerer threads per-instance retags through the historyMap.
    kcad.box(6, 6, 6)
      .hole('top', { u: 0, v: 0, diameter: 2, depth: 'through', name: 'b' })
      .patternLinear({ count: 3, direction: [1, 0, 0], spacing: 10 });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const pattern = result.shapes.get('pattern_1');
    expect(pattern).toBeDefined();
    if (!pattern) throw new Error('pattern did not lower');
    // The hole's FeatureId is 'hole_1' in this session. Pattern lowerer
    // retags lineage entries to 'hole_1_pattern_0'..'hole_1_pattern_2'.
    const historyMap = (pattern as import('../../../../src/kernel/backends/occt/occtBackend').OcctBackend).historyMap;
    expect(historyMap).toBeDefined();
    const taggedIds = new Set<string>();
    for (const lineage of historyMap!.values()) {
      if (lineage.featureId?.startsWith('hole_1_pattern_')) {
        taggedIds.add(lineage.featureId);
      }
    }
    expect(taggedIds.has('hole_1_pattern_0')).toBe(true);
    expect(taggedIds.has('hole_1_pattern_1')).toBe(true);
    expect(taggedIds.has('hole_1_pattern_2')).toBe(true);
  });
});
