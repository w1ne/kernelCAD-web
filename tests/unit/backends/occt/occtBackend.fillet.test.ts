import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';

describe('OcctBackend.fillet / chamfer', () => {
  beforeAll(async () => { await initOcct(); });

  it('fillet on all edges of a box reduces volume (radius < edge/2)', () => {
    const box = OcctBackend.box(20, 20, 20);
    const baseV = box.volume();
    const all = box.getReplicadShape().edges;
    const filleted = box.fillet(all, 2);
    const v = filleted.volume();
    expect(v).toBeLessThan(baseV);
    expect(v).toBeGreaterThan(baseV - 12 * 20 * (4 - Math.PI)); // very loose lower bound
  });

  it('chamfer on all edges of a box reduces volume', () => {
    const box = OcctBackend.box(20, 20, 20);
    const baseV = box.volume();
    const all = box.getReplicadShape().edges;
    const chamfered = box.chamfer(all, 1.5);
    expect(chamfered.volume()).toBeLessThan(baseV);
  });

  it('fillet returned shape has no kind tag (it is no longer a raw primitive)', () => {
    const box = OcctBackend.box(20, 20, 20);
    const all = box.getReplicadShape().edges;
    expect(box.fillet(all, 2).kind).toBeUndefined();
    expect(box.chamfer(all, 1).kind).toBeUndefined();
  });

  it('fillet with too-large radius throws (caught by lowerer in Task 3)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const all = box.getReplicadShape().edges;
    expect(() => box.fillet(all, 100)).toThrow();
  });

  it('fillet on empty edge list throws', () => {
    const box = OcctBackend.box(20, 20, 20);
    expect(() => box.fillet([], 2)).toThrow();
  });
});
