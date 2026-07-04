// tests/unit/backends/occt/occtLowerer.fillet.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });

describe('OcctLowerer fillet', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers an all-edges fillet on a box', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const r: FeatureRecord = {
      id: 'fillet_1', kind: 'fillet',
      inputs: { base: { kind: 'feature', id: 'box_1' } },
      params: { radius: mm(2) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeLessThan(8000);
  });

  it('lowers a top-face fillet on a box (returns smaller volume than all-edges fillet)', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const r: FeatureRecord = {
      id: 'fillet_2', kind: 'fillet',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
      },
      params: { radius: mm(2) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const v = result.shape.volume();
    expect(v).toBeLessThan(8000);
    expect(v).toBeGreaterThan(7900); // top-face fillet removes much less than all-edges
  });

  it('emits face-ref-not-resolvable for fillet on a transformed primitive', async () => {
    const base = OcctBackend.box(20, 20, 20).translate(5, 0, 0);
    const r: FeatureRecord = {
      id: 'fillet_3', kind: 'fillet',
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
      },
      params: { radius: mm(2) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.face-ref.not-applicable');
  });

  it('emits short-edges-skipped when radius exceeds half the edge length', async () => {
    // r=100 on a 10mm box: M2's pre-filter (2*r = 200mm) catches every edge
    // before OCCT does, surfacing a more specific code than kernel-failed.
    const base = OcctBackend.box(10, 10, 10);
    const r: FeatureRecord = {
      id: 'fillet_4', kind: 'fillet',
      inputs: { base: { kind: 'feature', id: 'box_1' } },
      params: { radius: mm(100) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: { base } });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.edge-feature.short-edges-skipped');
  });
});
