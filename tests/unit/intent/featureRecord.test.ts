import { describe, it, expect } from 'vitest';
import type { FeatureRecord } from '../../../src/intent/featureRecord';
import type { Param } from '../../../src/intent/types';

describe('FeatureRecord', () => {
  it('has expected shape', () => {
    const w: Param = { expression: '100 mm', unit: 'mm', evaluated: 100 };
    const r: FeatureRecord = {
      id: 'box_1',
      kind: 'box',
      inputs: {},
      params: { width: w, height: w, depth: w },
      transforms: [],
      suppressed: false,
    };
    expect(r.id).toBe('box_1');
    expect(r.params.width.evaluated).toBe(100);
  });
});
