import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';

describe('OcctBackend.shell', () => {
  beforeAll(async () => { await initOcct(); });

  it('top-face shell on a 20x20x20 box reduces volume to <20% of solid', () => {
    // Solid box: 20 * 20 * 20 = 8000 mm³.
    // Shell with 0.5 mm walls (top face removed): ~780 mm³ — well under 20% = 1600 mm³.
    const box = OcctBackend.box(20, 20, 20);
    const solidVolume = box.volume();
    const topFace = box.getReplicadShape().faces.find(
      (f) => Math.abs(f.center.z - 20) < 0.01,
    );
    expect(topFace).toBeDefined();
    const shelled = box.shell(topFace!, 0.5);
    const shelledVolume = shelled.volume();
    expect(shelledVolume).toBeLessThan(solidVolume * 0.2);
  });

  it('shelled shape has kind undefined (no longer a raw primitive)', () => {
    const box = OcctBackend.box(20, 20, 20);
    const topFace = box.getReplicadShape().faces.find(
      (f) => Math.abs(f.center.z - 20) < 0.01,
    );
    expect(topFace).toBeDefined();
    const shelled = box.shell(topFace!, 0.5);
    expect(shelled.kind).toBeUndefined();
  });

  it('shell with too-large thickness throws (lowerer catches in Task 3)', () => {
    const box = OcctBackend.box(10, 10, 10);
    const topFace = box.getReplicadShape().faces.find(
      (f) => Math.abs(f.center.z - 10) < 0.01,
    );
    expect(topFace).toBeDefined();
    // thickness larger than the box half-dimension — OCCT must fail
    expect(() => box.shell(topFace!, 100)).toThrow();
  });

  it('shell with zero thickness throws', () => {
    const box = OcctBackend.box(20, 20, 20);
    const topFace = box.getReplicadShape().faces.find(
      (f) => Math.abs(f.center.z - 20) < 0.01,
    );
    expect(topFace).toBeDefined();
    expect(() => box.shell(topFace!, 0)).toThrow();
  });
});
