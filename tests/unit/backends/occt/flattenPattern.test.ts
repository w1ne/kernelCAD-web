import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { flattenPattern } from '../../../../src/kernel/backends/occt/flattenPattern';
import type { OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';

describe('flattenPattern — single-bend roundtrip', () => {
  beforeAll(async () => { await initOcct(); });

  it('L-bracket flatten recovers the original sketch bounding box (within 1e-3 mm)', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
        return blank.bend({ atX: 50 }, 90, 3);
      `,
      fileName: 'test.kcad.ts',
    });
    const engine = new RecomputeEngine(new OcctLowerer());
    await engine.run(records);
    const region = flattenPattern(records);
    // 1 bend → 1 bend line
    expect(region.bendLines.length).toBe(1);
    expect(region.bendLines[0].angle).toBeCloseTo(90, 6);
    expect(region.bendLines[0].radius).toBe(3);
    // Bounding box matches original sketch (100 × 60) within 1e-3 mm.
    const xs = region.outer.map(p => p[0]);
    const ys = region.outer.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(w).toBeCloseTo(100, 3);
    expect(h).toBeCloseTo(60, 3);
  });

  it('two-bend chain returns 2 bendLines and succeeds', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 80).lineTo(0, 80).close();
        const blank = sheetMetal(s, { thickness: 2, kFactor: 0.4 });
        return blank
          .bend({ atX: 20 }, 90, 2.5)
          .bend({ atX: 100 }, 90, 2.5);
      `,
      fileName: 'test.kcad.ts',
    });
    const engine = new RecomputeEngine(new OcctLowerer());
    await engine.run(records);
    const region = flattenPattern(records);
    expect(region.bendLines.length).toBe(2);
  });

  it('three-bend chain throws feature.flattenPattern.multi-bend-unsupported', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(150, 0).lineTo(150, 60).lineTo(0, 60).close();
        const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
        return blank
          .bend({ atX: 40 }, 90, 3)
          .bend({ atX: 80 }, 90, 3)
          .bend({ atX: 120 }, 90, 3);
      `,
      fileName: 'test.kcad.ts',
    });
    const engine = new RecomputeEngine(new OcctLowerer());
    await engine.run(records);
    expect(() => flattenPattern(records))
      .toThrow();
    try {
      flattenPattern(records);
    } catch (e) {
      expect((e as { code?: string }).code).toBe('feature.flattenPattern.multi-bend-unsupported');
    }
  });

  it('round-trips a folded U-channel: flat length = flange lengths + bend allowances', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 2, kFactor: 0.4 }).bend({ atX: 25 }, 90, 2).bend({ atX: 75 }, 90, 2);
      `,
      fileName: 'test.kcad.ts',
    });
    const r = await new RecomputeEngine(new OcctLowerer()).run(records);
    const folded = r.shapes.get(records[records.length - 1].id) as OcctBackend;
    const bb = folded.boundingBox();
    const t = 2, radius = 2;
    // Flange lengths measured on the FOLDED solid: each flat run is the outer
    // extent minus the outer bend corner(s) (inner radius + thickness).
    const web = (bb.max[0] - bb.min[0]) - 2 * (radius + t);
    const flange = (bb.max[2] - bb.min[2]) - (radius + t);
    const ba = (Math.PI / 2) * (radius + 0.4 * t);
    const region = flattenPattern(records);
    const xs = region.outer.map(p => p[0]);
    const flatLength = Math.max(...xs) - Math.min(...xs);
    expect(web + 2 * flange + 2 * ba).toBeCloseTo(flatLength, 3);
    expect(flatLength).toBeCloseTo(100, 6);
    expect(region.bendLines.map(l => l.start[0])).toEqual([25, 75]);
    expect(region.bendLines.every(l => l.end[0] === l.start[0])).toBe(true);
  });

  it('flattens a blank that was drilled before bending (lineage through hole records)', async () => {
    const { records } = await runScript({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 2, kFactor: 0.38 })
          .hole({ byNormal: 'Z' }, { u: 30, v: 0, diameter: 6, depth: 'through' })
          .bend({ atX: 50 }, 90, 3);
      `,
      fileName: 'test.kcad.ts',
    });
    await new RecomputeEngine(new OcctLowerer()).run(records);
    const region = flattenPattern(records);
    expect(region.bendLines).toHaveLength(1);
    expect(region.bendLines[0].start[0]).toBe(50);
  });
});
