import { describe, it, expect, beforeAll } from 'vitest';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { Param } from '../../../src/shared/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });

describe('RecomputeEngine', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a single-feature graph and returns shape by id', async () => {
    const records: FeatureRecord[] = [{
      id: 'box_1', kind: 'box',
      params: { x: mm(10), y: mm(10), z: mm(10), centered: ul(0) },
      inputs: {}, transforms: [], suppressed: false,
    }];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.shapes.has('box_1')).toBe(true);
    expect(result.shapes.get('box_1')!.volume()).toBeCloseTo(1000, 1);
  });

  it('resolves boolean inputs from prior features', async () => {
    const records: FeatureRecord[] = [
      { id: 'box_1', kind: 'box',
        params: { x: mm(20), y: mm(20), z: mm(20), centered: ul(0) },
        inputs: {}, transforms: [], suppressed: false },
      { id: 'cyl_1', kind: 'cylinder',
        params: { h: mm(20), r: mm(5) },
        inputs: {},
        transforms: [{ op: 'translate', vec: { x: mm(10), y: mm(10), z: mm(0) } }],
        suppressed: false },
      { id: 'bool_1', kind: 'boolean',
        params: { op: { expression: "'difference'", unit: 'unitless', evaluated: 0 } },
        inputs: {
          base: { kind: 'feature', id: 'box_1' },
          cutter_0: { kind: 'feature', id: 'cyl_1' },
        },
        transforms: [], suppressed: false },
    ];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const expected = 8000 - Math.PI * 25 * 20;
    expect(result.shapes.get('bool_1')!.volume()).toBeCloseTo(expected, 0);
  });

  it('skips suppressed features and errors when downstream depends on them', async () => {
    const records: FeatureRecord[] = [
      { id: 'box_1', kind: 'box',
        params: { x: mm(10), y: mm(10), z: mm(10), centered: ul(0) },
        inputs: {}, transforms: [], suppressed: true },
    ];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    expect(result.shapes.has('box_1')).toBe(false);
  });
});
