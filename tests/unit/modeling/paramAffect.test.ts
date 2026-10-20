// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import { affectedFeatureIds } from '../../../src/modeling/paramAffect';

function rec(
  id: string,
  paramRefs: string[] | undefined,
  inputs: FeatureRecord['inputs'] = {},
): FeatureRecord {
  return {
    id,
    kind: 'box',
    inputs,
    params: {},
    transforms: [],
    suppressed: false,
    ...(paramRefs ? { metadata: { paramRefs } } : {}),
  };
}

describe('affectedFeatureIds', () => {
  it('re-lowers a changed solid and its dependents, and leaves an independent later solid alone', () => {
    const body = rec('body', ['width']);
    const fillet = rec('fillet', undefined, { shape: { kind: 'feature', id: 'body' } });
    const knob = rec('knob');
    const affected = affectedFeatureIds([body, fillet, knob], new Set(['width']));
    expect([...affected]).toEqual(['body', 'fillet']);
  });

  it('does not re-lower features that sit before a param they do not read', () => {
    const plate = rec('plate');
    const hole = rec('hole', ['boltDia'], { plate: { kind: 'face', featureId: 'plate', role: 'top' } as FeatureRecord['inputs'][string] });
    const affected = affectedFeatureIds([plate, hole], new Set(['boltDia']));
    expect([...affected]).toEqual(['hole']);
  });

  it('follows a face reference the same way the recompute graph does', () => {
    const plate = rec('plate', ['width']);
    const hole = rec('hole', undefined, {
      plate: { kind: 'face', featureId: 'plate', role: 'top' } as FeatureRecord['inputs'][string],
    });
    expect([...affectedFeatureIds([plate, hole], new Set(['width']))]).toEqual(['plate', 'hole']);
  });

  it('re-lowers nothing when no record reads the edited name', () => {
    const plate = rec('plate', ['width']);
    expect([...affectedFeatureIds([plate], new Set(['orphan']))]).toEqual([]);
  });
});
