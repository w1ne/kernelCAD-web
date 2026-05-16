// tests/unit/runtime/dispatcherResolve.test.ts
//
// Phase-2 unit test: RecomputeEngine pre-resolves Param.paramRef before
// dispatching to the lowerer; lowerers always see resolved Params.

import { describe, it, expect } from 'vitest';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { ParamTable } from '../../../src/shared/runtime/paramTable';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { FeatureLowerer, ResolvedInputs, LowerResult } from '../../../src/kernel/backends/backend';

class CapturingLowerer implements FeatureLowerer {
  readonly target = 'export-occt' as const;
  readonly supports = new Set(['box'] as const);
  capturedRecords: FeatureRecord[] = [];

  async lower(record: FeatureRecord, _inputs: ResolvedInputs): Promise<LowerResult> {
    this.capturedRecords.push(record);
    return {
      shape: {
        target: 'export-occt',
        translate: () => null as never, rotate: () => null as never, scale: () => null as never,
        union: () => null as never, subtract: () => null as never, intersect: () => null as never,
        splitByPlane: () => null as never,
        boundingBox: () => ({ min: [0, 0, 0], max: [0, 0, 0] }),
        volume: () => 0, surfaceArea: () => 0, isEmpty: () => false,
        getMesh: () => null as never, exportSTL: () => new Uint8Array(), exportSTEP: () => new Uint8Array(),
      } as never,
      diagnostics: [],
    };
  }
}

describe('RecomputeEngine pre-resolve', () => {
  it('substitutes Param.paramRef with current table value before lower()', async () => {
    const lowerer = new CapturingLowerer();
    const engine = new RecomputeEngine(lowerer);
    const table = new ParamTable();
    table.declare('boltDia', 'number', 5);
    table.set('boltDia', 8);

    const record: FeatureRecord = {
      id: 'box-1',
      kind: 'box',
      inputs: {},
      params: {
        x: { expression: '{$param:boltDia}', unit: 'mm', evaluated: 0, paramRef: 'boltDia' },
        y: { expression: '40', unit: 'mm', evaluated: 40 },
        z: { expression: '5', unit: 'mm', evaluated: 5 },
      },
      transforms: [],
      suppressed: false,
    };

    await engine.run([record], { paramTable: table });

    expect(lowerer.capturedRecords).toHaveLength(1);
    const seen = lowerer.capturedRecords[0];
    expect(seen.params.x.evaluated).toBe(8); // resolved
    expect(seen.params.x.paramRef).toBe('boltDia'); // ref preserved on the resolved copy
    expect(seen.params.y.evaluated).toBe(40); // literal untouched
  });

  it('without paramTable, records pass through unchanged (slice-1/2 path)', async () => {
    const lowerer = new CapturingLowerer();
    const engine = new RecomputeEngine(lowerer);

    const record: FeatureRecord = {
      id: 'box-1',
      kind: 'box',
      inputs: {},
      params: {
        x: { expression: '60', unit: 'mm', evaluated: 60 },
        y: { expression: '40', unit: 'mm', evaluated: 40 },
        z: { expression: '5', unit: 'mm', evaluated: 5 },
      },
      transforms: [],
      suppressed: false,
    };

    await engine.run([record], {});
    expect(lowerer.capturedRecords[0].params.x.evaluated).toBe(60);
  });
});
