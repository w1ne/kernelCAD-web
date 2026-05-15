import { describe, it, expect } from 'vitest';
import { makeRegion, isValidRegion, type Region, type BendLineRecord } from '../../../src/intent/region';

describe('Region — closed planar outline with bend-line metadata', () => {
  it('rectangular region from outer wire only', () => {
    const r: Region = makeRegion({
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [100, 0], [100, 60], [0, 60]],
      holes: [],
      bendLines: [],
    });
    expect(r.outer.length).toBe(4);
    expect(r.holes).toEqual([]);
    expect(isValidRegion(r)).toBe(true);
  });

  it('rejects a Region with a degenerate outer wire', () => {
    expect(() =>
      makeRegion({
        plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
        outer: [[0, 0], [100, 0]],
        holes: [],
        bendLines: [],
      }),
    ).toThrowError(/outer.*at least 3/i);
  });

  it('preserves bend-line metadata exactly', () => {
    const bend: BendLineRecord = {
      start: [50, 0],
      end: [50, 60],
      angle: 90,
      radius: 3,
      ordinal: 0,
    };
    const r = makeRegion({
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [100, 0], [100, 60], [0, 60]],
      holes: [],
      bendLines: [bend],
    });
    expect(r.bendLines).toEqual([bend]);
  });
});
