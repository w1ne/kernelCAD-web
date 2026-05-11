import { describe, it, expect } from 'vitest';
import {
  MATE_TYPES,
  dofRemovedFor,
  isCompatiblePair,
  type MateType,
} from './mateTypes';

describe('mate type vocabulary', () => {
  it('exports exactly the 7 URDF/Fusion/OnShape mate types', () => {
    expect([...MATE_TYPES]).toEqual([
      'fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot',
    ]);
  });

  it('reports DOF removed per type', () => {
    expect(dofRemovedFor('fastened')).toBe(6);
    expect(dofRemovedFor('revolute')).toBe(5);
    expect(dofRemovedFor('prismatic')).toBe(5);
    expect(dofRemovedFor('cylindrical')).toBe(4);
    expect(dofRemovedFor('planar')).toBe(3);
    expect(dofRemovedFor('ball')).toBe(3);
    expect(dofRemovedFor('pin_slot')).toBe(4);
  });
});

describe('connector-pair compatibility', () => {
  it('accepts frame-frame for fastened', () => {
    expect(isCompatiblePair('fastened', 'frame', 'frame')).toBe(true);
  });

  it('rejects frame-axis for revolute', () => {
    expect(isCompatiblePair('revolute', 'frame', 'axis')).toBe(false);
  });

  it('accepts axis-axis for revolute, prismatic, cylindrical, pin_slot', () => {
    for (const t of ['revolute', 'prismatic', 'cylindrical', 'pin_slot'] as const) {
      expect(isCompatiblePair(t, 'axis', 'axis')).toBe(true);
    }
  });

  it('accepts planar-planar for planar; ball-ball for ball', () => {
    expect(isCompatiblePair('planar', 'planar', 'planar')).toBe(true);
    expect(isCompatiblePair('ball', 'ball', 'ball')).toBe(true);
  });

  it('rejects every other pair as a sanity sweep', () => {
    expect(isCompatiblePair('fastened', 'axis', 'axis')).toBe(false);
    expect(isCompatiblePair('ball', 'frame', 'frame')).toBe(false);
    expect(isCompatiblePair('planar', 'axis', 'planar')).toBe(false);
  });
});
