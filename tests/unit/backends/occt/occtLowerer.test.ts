import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });

describe('OcctLowerer', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a box record', async () => {
    const r: FeatureRecord = {
      id: 'box_1', kind: 'box',
      params: { x: mm(10), y: mm(20), z: mm(30), centered: ul(0) },
      inputs: {}, transforms: [], suppressed: false,
    };
    const lowerer = new OcctLowerer();
    const res = await lowerer.lower(r, { byKey: {} });
    expect(res.diagnostics).toHaveLength(0);
    expect(res.shape.volume()).toBeCloseTo(6000, 1);
  });

  it('lowers a cylinder record', async () => {
    const r: FeatureRecord = {
      id: 'cyl_1', kind: 'cylinder',
      params: { h: mm(20), r: mm(5) },
      inputs: {}, transforms: [], suppressed: false,
    };
    const lowerer = new OcctLowerer();
    const res = await lowerer.lower(r, { byKey: {} });
    expect(res.shape.volume()).toBeCloseTo(Math.PI * 25 * 20, 0);
  });

  it('applies transforms in order', async () => {
    const r: FeatureRecord = {
      id: 'box_1', kind: 'box',
      params: { x: mm(10), y: mm(10), z: mm(10), centered: ul(0) },
      inputs: {},
      transforms: [{ op: 'translate', x: 5, y: 0, z: 0 }],
      suppressed: false,
    };
    const lowerer = new OcctLowerer();
    const res = await lowerer.lower(r, { byKey: {} });
    expect(res.shape.boundingBox().min[0]).toBe(5);
  });

  it('lowers boolean difference with two operand inputs', async () => {
    const lowerer = new OcctLowerer();
    const baseRec: FeatureRecord = {
      id: 'box_1', kind: 'box',
      params: { x: mm(20), y: mm(20), z: mm(20), centered: ul(0) },
      inputs: {}, transforms: [], suppressed: false,
    };
    const cylRec: FeatureRecord = {
      id: 'cyl_1', kind: 'cylinder',
      params: { h: mm(20), r: mm(5) },
      inputs: {},
      transforms: [{ op: 'translate', x: 10, y: 10, z: 0 }],
      suppressed: false,
    };
    const baseRes = await lowerer.lower(baseRec, { byKey: {} });
    const cylRes  = await lowerer.lower(cylRec, { byKey: {} });
    const boolRec: FeatureRecord = {
      id: 'bool_1', kind: 'boolean',
      params: { op: { expression: "'difference'", unit: 'unitless', evaluated: 0 } },
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        cutter_0: { kind: 'feature', id: 'cyl_1' },
      },
      transforms: [], suppressed: false,
    };
    const res = await lowerer.lower(boolRec, {
      byKey: { base: baseRes.shape, cutter_0: cylRes.shape },
    });
    const expected = 8000 - Math.PI * 25 * 20;
    expect(res.shape.volume()).toBeCloseTo(expected, 0);
  });
});
