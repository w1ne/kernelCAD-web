import { describe, it, expect, expectTypeOf } from 'vitest';
import type { FeatureRecord, FaceLabelsMap, CanonicalFace } from '../../../src/intent/featureRecord';
import type { Param } from '../../../src/intent/types';
import type { FaceQuery } from '../../../src/backends/occt/edgeQueries';

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

describe('FaceLabelsMap', () => {
  it('accepts canonical-alias entries', () => {
    const m: FaceLabelsMap = { lid: 'top', base: 'bottom' };
    expectTypeOf(m.lid).toEqualTypeOf<CanonicalFace | FaceQuery>();
  });
  it('accepts query entries', () => {
    const m: FaceLabelsMap = { rim: { atZ: 5, parallelTo: 'XY' } };
    expectTypeOf(m.rim).toEqualTypeOf<CanonicalFace | FaceQuery>();
  });
  it('CanonicalFace covers all six canonical names', () => {
    const all: CanonicalFace[] = ['top', 'bottom', 'left', 'right', 'front', 'back'];
    expect(all).toHaveLength(6);
  });
});
