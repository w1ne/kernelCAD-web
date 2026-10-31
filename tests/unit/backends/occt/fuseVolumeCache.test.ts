// The fuse "lost material" guard measures every operand and the result. A
// modelling run fuses the same growing body again and again, so the guard
// caches each solid's volume by OCCT identity: the result of one fuse is the
// body of the next and must not be measured twice.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { fuseLostMaterial } from '../../../../src/kernel/backends/occt/historyAwareBooleans';

const raw = (s: OcctBackend) => (s.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;

describe('fuseLostMaterial volume cache', () => {
  beforeAll(async () => { await initOcct(); });

  it('measures a solid once across repeated checks and keeps the verdict', () => {
    const oc = getOC();
    const body = OcctBackend.box(20, 20, 20);
    const tool = OcctBackend.box(10, 10, 10).translate(15, 0, 0);
    const spy = vi.spyOn((oc as any).BRepGProp, 'VolumeProperties_1');
    try {
      // A "result" smaller than the body: material was lost.
      const small = OcctBackend.box(5, 5, 5);
      const first = fuseLostMaterial(oc, [raw(body), raw(tool)], raw(small));
      const callsAfterFirst = spy.mock.calls.length;
      const second = fuseLostMaterial(oc, [raw(body), raw(tool)], raw(small));
      expect(first).toEqual(second);
      expect(first?.largestSolid).toBeCloseTo(8000, 3);
      expect(first?.resultVolume).toBeCloseTo(125, 3);
      expect(callsAfterFirst).toBe(3);
      expect(spy.mock.calls.length).toBe(callsAfterFirst);
    } finally {
      spy.mockRestore();
    }
  });

  it('does not reuse a volume across different solids', () => {
    const oc = getOC();
    const a = OcctBackend.box(10, 10, 10);
    const b = OcctBackend.box(10, 10, 20);
    const lost = fuseLostMaterial(oc, [raw(a)], raw(b));
    expect(lost).toBeUndefined();
    const lost2 = fuseLostMaterial(oc, [raw(b)], raw(a));
    expect(lost2?.largestSolid).toBeCloseTo(2000, 3);
    expect(lost2?.resultVolume).toBeCloseTo(1000, 3);
  });
});
