// tests/unit/backends/occt/occtLowerer.extrudeRoundedRect.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/kernel/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const str = (s: string): Param => ({ expression: `'${s}'`, unit: 'unitless', evaluated: 0 });

describe('OcctLowerer extrude rounded-rect', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a rounded-rect record', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      inputs: {},
      params: { profileKind: str('rounded-rect'), width: mm(20), height: mm(20), radius: mm(2), depth: mm(5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeLessThan(2000);
    expect(result.shape.volume()).toBeGreaterThan(1975);
  });

  it('emits feature.extrude.bad-params when width/height/radius are missing', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      inputs: {},
      params: { profileKind: str('rounded-rect'), depth: mm(5) },  // missing width, height, radius
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    expect(result.diagnostics.filter(d => d.severity === 'error').length).toBeGreaterThan(0);
  });

  it('handles zero radius (= sharp rect)', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      inputs: {},
      params: { profileKind: str('rounded-rect'), width: mm(10), height: mm(10), radius: mm(0), depth: mm(5) },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeCloseTo(500, 1);
  });
});
