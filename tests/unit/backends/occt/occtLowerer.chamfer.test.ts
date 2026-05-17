// tests/unit/backends/occt/occtLowerer.chamfer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });

describe('OcctLowerer chamfer', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers an all-edges chamfer on a box', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const r: FeatureRecord = {
      id: 'chamfer_1', kind: 'chamfer',
      inputs: { base: { kind: 'feature', id: 'box_1' } },
      params: { distance: mm(1.5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeLessThan(8000);
  });

  it('lowers a top-face chamfer on a box', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const r: FeatureRecord = {
      id: 'chamfer_2', kind: 'chamfer',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
      },
      params: { distance: mm(1.5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeLessThan(8000);
  });

  it('emits short-edges-skipped when distance exceeds half the edge length', async () => {
    // d=100 on a 10mm box: M2's pre-filter (2*d = 200mm) catches every edge
    // before OCCT does, surfacing a more specific code than kernel-failed.
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'chamfer_3', kind: 'chamfer',
      inputs: { base: { kind: 'feature', id: 'box_1' } },
      params: { distance: mm(100) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.edge-feature.short-edges-skipped');
  });
});
