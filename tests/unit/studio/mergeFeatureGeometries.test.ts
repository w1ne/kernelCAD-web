// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../../src/shared/worker/geometryEngine';
import { mergeFeatureGeometries } from '../../../src/studio/context/geometry/mergeFeatureGeometries';

function geo(featureId: string, volume: number): GeometryResult {
  return { faces: [], featureId, volume };
}

describe('mergeFeatureGeometries', () => {
  it('replaces only the re-lowered feature and keeps the others', () => {
    const previous = [geo('body', 1), geo('knob', 2)];
    const incoming = [geo('body', 9)];
    expect(mergeFeatureGeometries(previous, incoming, ['body']).map((g) => [g.featureId, g.volume])).toEqual([
      ['body', 9],
      ['knob', 2],
    ]);
  });

  it('appends a feature the previous picture did not have', () => {
    const merged = mergeFeatureGeometries([geo('body', 1)], [geo('lug', 3)], ['lug']);
    expect(merged.map((g) => g.featureId)).toEqual(['body', 'lug']);
  });
});
