// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { FeatureRecord } from './featureRecord';
import { __recordIndexBuildsForTests, getRecordIndex, recordById } from './recordIndex';

function rec(id: string): FeatureRecord {
  return { id, kind: 'box', inputs: {}, params: {}, transforms: [], suppressed: false } as unknown as FeatureRecord;
}

describe('recordIndex', () => {
  it('finds records by id and returns undefined for unknown ids', () => {
    const records = [rec('box_1'), rec('box_2')];
    expect(recordById(records, 'box_2')).toBe(records[1]);
    expect(recordById(records, 'nope')).toBeUndefined();
  });

  it('reuses one index per array and extends it on append (no rebuild)', () => {
    const records: FeatureRecord[] = [rec('box_1')];
    const before = __recordIndexBuildsForTests();
    getRecordIndex(records);
    records.push(rec('box_2'));
    expect(recordById(records, 'box_2')).toBe(records[1]);
    expect(__recordIndexBuildsForTests() - before).toBe(1);
  });

  it('rebuilds when the array shrank or was reset in place', () => {
    const records: FeatureRecord[] = [rec('box_1'), rec('box_2')];
    getRecordIndex(records);
    records.length = 0;
    records.push(rec('box_9'));
    expect(recordById(records, 'box_1')).toBeUndefined();
    expect(recordById(records, 'box_9')).toBe(records[0]);
  });

  it('keeps the first occurrence of a duplicated id, like Array.find', () => {
    const a = rec('dup');
    const b = rec('dup');
    expect(recordById([a, b], 'dup')).toBe(a);
  });
});
