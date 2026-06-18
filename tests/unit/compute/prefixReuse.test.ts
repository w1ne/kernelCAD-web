// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  computePrefixReuse,
  structuralHashRecord,
  type PrefixReuseInput,
  type RecordHealth,
} from '../../../src/modeling/compute/prefixReuse';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

function rec(id: string, kind = 'box', extra: Partial<FeatureRecord> = {}): FeatureRecord {
  return {
    id,
    kind: kind as FeatureRecord['kind'],
    inputs: {},
    params: {},
    transforms: [],
    suppressed: false,
    ...extra,
  };
}

function baseInput(
  prev: FeatureRecord[],
  next: FeatureRecord[],
  overrides: Partial<PrefixReuseInput> = {},
): PrefixReuseInput {
  const health = new Map<string, RecordHealth>(prev.map(r => [r.id, 'healthy']));
  return {
    prevRecords: prev,
    nextRecords: next,
    prevParamTable: undefined,
    nextParamTable: undefined,
    hasCachedShape: () => true,
    prevHealth: health,
    ...overrides,
  };
}

describe('computePrefixReuse', () => {
  it('reuses when the new list is a pure append of the previous one', () => {
    const prev = [rec('box_1'), rec('fillet_1', 'fillet')];
    const next = [rec('box_1'), rec('fillet_1', 'fillet'), rec('box_2')];
    const d = computePrefixReuse(baseInput(prev, next));
    expect(d.reusable).toBe(true);
    expect(d.matchedPrefixLength).toBe(2);
    expect(d.reusableIds).toEqual(['box_1', 'fillet_1']);
  });

  it('reuses when the record list is byte-identical (no new tail)', () => {
    const prev = [rec('box_1')];
    const next = [rec('box_1')];
    const d = computePrefixReuse(baseInput(prev, next));
    expect(d.reusable).toBe(true);
    expect(d.reusableIds).toEqual(['box_1']);
  });

  it('does NOT reuse on a shrink/delete (next shorter than prev)', () => {
    const prev = [rec('box_1'), rec('fillet_1', 'fillet')];
    const next = [rec('box_1')];
    const d = computePrefixReuse(baseInput(prev, next));
    expect(d.reusable).toBe(false);
  });

  it('does NOT reuse on a mid-prefix param edit (structural hash mismatch)', () => {
    const prev = [rec('box_1', 'box', { params: { x: param(10) } }), rec('box_2')];
    const next = [rec('box_1', 'box', { params: { x: param(99) } }), rec('box_2'), rec('box_3')];
    const d = computePrefixReuse(baseInput(prev, next));
    expect(d.reusable).toBe(false);
    expect(d.matchedPrefixLength).toBe(0);
  });

  it('does NOT reuse when an id diverges in the prefix', () => {
    const prev = [rec('box_1'), rec('box_2')];
    const next = [rec('box_1'), rec('cylinder_1', 'cylinder'), rec('box_2')];
    const d = computePrefixReuse(baseInput(prev, next));
    expect(d.reusable).toBe(false);
  });

  it('does NOT reuse when a prefix record has no cached shape', () => {
    const prev = [rec('box_1'), rec('box_2')];
    const next = [rec('box_1'), rec('box_2'), rec('box_3')];
    const d = computePrefixReuse(
      baseInput(prev, next, { hasCachedShape: id => id !== 'box_2' }),
    );
    expect(d.reusable).toBe(false);
  });

  it('does NOT reuse when a prefix record was not healthy', () => {
    const prev = [rec('box_1'), rec('box_2')];
    const next = [rec('box_1'), rec('box_2'), rec('box_3')];
    const health = new Map<string, RecordHealth>([
      ['box_1', 'healthy'],
      ['box_2', 'error'],
    ]);
    const d = computePrefixReuse(baseInput(prev, next, { prevHealth: health }));
    expect(d.reusable).toBe(false);
  });

  it('does NOT reuse when there was no previous build', () => {
    const d = computePrefixReuse(baseInput([], [rec('box_1')]));
    expect(d.reusable).toBe(false);
  });
});

describe('structuralHashRecord', () => {
  it('is stable across object key order', () => {
    const a = rec('box_1', 'box', { inputs: { a: fref('x_1'), b: fref('y_1') } });
    const b = rec('box_1', 'box', { inputs: { b: fref('y_1'), a: fref('x_1') } });
    expect(structuralHashRecord(a, undefined)).toBe(structuralHashRecord(b, undefined));
  });

  it('differs when a geometry-relevant param changes', () => {
    const a = rec('box_1', 'box', { params: { x: param(10) } });
    const b = rec('box_1', 'box', { params: { x: param(11) } });
    expect(structuralHashRecord(a, undefined)).not.toBe(structuralHashRecord(b, undefined));
  });

  it('ignores the derived paramRefs metadata index', () => {
    const a = rec('box_1', 'box', { metadata: { color: '#fff', paramRefs: ['w'] } });
    const b = rec('box_1', 'box', { metadata: { color: '#fff' } });
    expect(structuralHashRecord(a, undefined)).toBe(structuralHashRecord(b, undefined));
  });
});

function param(evaluated: number): FeatureRecord['params'][string] {
  return { expression: String(evaluated), unit: 'mm', evaluated };
}

function fref(id: string): FeatureRecord['inputs'][string] {
  return { kind: 'feature', id };
}
