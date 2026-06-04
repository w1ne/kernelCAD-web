import { describe, it, expect } from 'vitest';
import type { PartRecord } from './types';
import { isPartRecord } from './types';

describe('PartRecord type guard', () => {
  it('accepts a complete bundled record', () => {
    const r: PartRecord = {
      id: 'iso-4762-m3x12',
      name: 'M3 × 12 socket head cap screw (ISO 4762)',
      category: 'fastener',
      family: 'socket-head-cap-screw',
      standard: 'ISO 4762',
      tags: ['screw', 'metric', 'DIN 912'],
      attributes: { thread: 'M3', lengthMm: 12, material: 'A2-70' },
      sha256: '0'.repeat(64),
      source: 'local-catalog',
      license: 'MIT',
      connectors: ['head-bearing', 'thread-tip', 'head-top'],
    };
    expect(isPartRecord(r)).toBe(true);
  });

  it('rejects a record missing required fields', () => {
    expect(isPartRecord({ id: 'x' })).toBe(false);
  });

  it('rejects a record with source !== local-catalog | remote', () => {
    expect(
      isPartRecord({
        id: 'x',
        name: 'x',
        category: 'x',
        family: 'x',
        tags: [],
        attributes: {},
        sha256: 'x',
        source: 'invalid',
        license: 'MIT',
        connectors: [],
      }),
    ).toBe(false);
  });
});
