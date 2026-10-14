import { describe, expect, it, vi } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
async function boxes(angle: number, gap: number, axis: string) {
  const model = await buildModel({
    fileName: 'rotated-contact.kcad.ts',
    code: `
  const a=assembly('boxes');
  a.part('left',box(10,10,10,true).translate(0,0,-5).rotate${axis}(${angle}));
  a.part('right',box(10,10,10,true).translate(0,0,${5 + gap}).rotate${axis}(${angle}));
  return a.model();
 `,
  });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return model.rootShape as SceneBackend;
}
describe('conservative interference bounds', () => {
  it.each([
    ['X', 45],
    ['X', -45],
    ['Y', 45],
    ['Y', -45],
  ])(
    'skips native intersection for touching %s %s-degree boxes',
    async (axis, angle) => {
      const scene = await boxes(Number(angle), 0, String(axis));
      const before = scene.parts.map((p) => (p.shape as OcctBackend).volume());
      const spy = vi
        .spyOn(OcctBackend.prototype, 'intersect')
        .mockImplementation(() => {
          throw new Error(
            'Contact is bounded below threshold; avoid the expensive native Boolean.',
          );
        });
      try {
        const result = detectInterferences(scene, 0.01, new Set());
        expect(result.pairs).toEqual([]);
        expect(result.comparisonCount).toBe(1);
        expect(spy.mock.calls.length).toBe(0);
        expect(
          scene.parts.map((p) => (p.shape as OcctBackend).volume()),
        ).toEqual(before);
      } finally {
        spy.mockRestore();
      }
    },
  );

  it('uses the supplied threshold for a small positive overlap', async () => {
    const scene = await boxes(45, -0.01, 'Y');
    const spy = vi.spyOn(OcctBackend.prototype, 'intersectionVolume');
    try {
      expect(detectInterferences(scene, 20, new Set()).pairs).toEqual([]);
      expect(spy.mock.calls.length).toBe(0);
      const result = detectInterferences(scene, 0.5, new Set());
      expect(spy.mock.calls.length).toBe(1);
      expect(result.pairs[0].volumeMm3).toBeCloseTo(1);
    } finally {
      spy.mockRestore();
    }
  });
  it('falls back to native intersection when padded bounds are unavailable', async () => {
    const scene = await boxes(45, -1, 'Y');
    const getter = vi
      .spyOn(OcctBackend.prototype, 'getReplicadShape')
      .mockImplementation(() => {
        throw new Error('unavailable bounds');
      });
    const intersect = vi.spyOn(OcctBackend.prototype, 'intersectionVolume');
    try {
      const result = detectInterferences(scene, 20, new Set());
      expect(intersect.mock.calls.length).toBe(1);
      expect(result.pairs[0].volumeMm3).toBeCloseTo(100);
    } finally {
      getter.mockRestore();
      intersect.mockRestore();
    }
  });
  it('retains a real above-threshold overlap', async () => {
    const scene = await boxes(45, -1, 'Y');
    const spy = vi.spyOn(OcctBackend.prototype, 'intersectionVolume');
    try {
      const result = detectInterferences(scene, 20, new Set());
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.pairs).toHaveLength(1);
      expect(result.pairs[0].volumeMm3).toBeCloseTo(100);
    } finally {
      spy.mockRestore();
    }
  });
});
