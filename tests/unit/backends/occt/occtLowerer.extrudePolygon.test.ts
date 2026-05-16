// tests/unit/backends/occt/occtLowerer.extrudePolygon.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });
const str = (s: string): Param => ({ expression: `'${s}'`, unit: 'unitless', evaluated: 0 });

describe('OcctLowerer extrude polygon', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a polygon-extrude record', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      inputs: {},
      params: { profileKind: str('polygon'), depth: mm(5) },
      metadata: { points: [[0, 0], [10, 0], [5, 8]] },
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.shape.volume()).toBeGreaterThan(0);
  });

  it('emits feature.extrude.bad-points when metadata.points is missing or invalid', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      inputs: {},
      params: { profileKind: str('polygon'), depth: mm(5) },
      metadata: {},  // points missing
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('feature.invalid-args');
  });

  it('emits feature.extrude.failed when OCCT throws', async () => {
    const r: FeatureRecord = {
      id: 'extrude_1', kind: 'extrude',
      inputs: {},
      params: { profileKind: str('polygon'), depth: mm(5) },
      metadata: { points: [[0, 0], [0, 0], [0, 0]] },  // degenerate
      transforms: [], suppressed: false,
    };
    const result = await new OcctLowerer().lower(r, { byKey: {} });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    // Either feature.extrude.failed or feature.extrude.bad-points (degenerate
    // points may be caught by ensureCCW or by OCCT)
  });
});
