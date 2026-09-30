// Cost regression for patterns and history-aware booleans. It counts OCCT
// boolean builds instead of timing them, so it is deterministic.
//
// Found on a real part (a hinge with four 36-tooth serration rings): the
// pattern lowerer folded N instances with N-1 pairwise fuses (quadratic),
// and every history-aware boolean ran its OCCT build twice (the shape-taking
// BRepAlgoAPI_* constructors already build; a second Build() re-ran it).
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import {
  booleanBuildStats,
  fuseWithHistory,
} from '../../../../src/kernel/backends/occt/historyAwareBooleans';
import { createModelingApi } from '../../../../src/modeling/api';

async function lower(build: (kcad: ReturnType<typeof createModelingApi>) => void) {
  const session = new CaptureSession();
  build(createModelingApi({ session }));
  booleanBuildStats.builds = 0;
  const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
  return { result, builds: booleanBuildStats.builds };
}

describe('pattern boolean cost', () => {
  beforeAll(async () => { await initOcct(); });

  it('fuses every instance of a circular pattern in ONE boolean build', async () => {
    const { result, builds } = await lower((kcad) => {
      kcad.box(2, 2, 2).translate(6, 0, 0).patternCircular({ count: 12, axis: [0, 0, 1] });
    });
    expect(result.diagnostics).toEqual([]);
    // Pairwise folding cost count-1 = 11 builds (22 with the double build).
    expect(builds).toBe(1);
    const pattern = result.shapes.get('pattern_1') as OcctBackend;
    expect(pattern.volume()).toBeCloseTo(12 * 8, 6);
  });

  it('fuses a linear and a grid pattern in ONE boolean build each', async () => {
    const linear = await lower((kcad) => {
      kcad.box(2, 2, 2).patternLinear({ count: 5, direction: [1, 0, 0], spacing: 4 });
    });
    expect(linear.builds).toBe(1);
    expect((linear.result.shapes.get('pattern_1') as OcctBackend).volume()).toBeCloseTo(5 * 8, 6);

    const grid = await lower((kcad) => {
      kcad.box(2, 2, 2).patternGrid({
        x: { count: 3, direction: [1, 0, 0], spacing: 4 },
        y: { count: 2, direction: [0, 1, 0], spacing: 5 },
      });
    });
    expect(grid.builds).toBe(1);
    expect((grid.result.shapes.get('pattern_1') as OcctBackend).volume()).toBeCloseTo(6 * 8, 6);
  });

  it('runs a pairwise history-aware boolean exactly once', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    kcad.box(4, 4, 4);
    kcad.box(4, 4, 4).translate(2, 0, 0);
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    const [a, b] = [...result.shapes.values()] as OcctBackend[];
    booleanBuildStats.builds = 0;
    const fused = fuseWithHistory(a, b);
    expect(booleanBuildStats.builds).toBe(1);
    expect(fused.shape).toBeDefined();
  });

  it('touching teeth (serration ring) fuse to the same solid as a pairwise fold', async () => {
    // Hirth-style teeth: adjacent teeth share an edge and all meet near the
    // axis — the hard case for a one-shot general fuse.
    const TEETH = 12, R = 8, H = 0.7;
    const tooth = (kcad: ReturnType<typeof createModelingApi>) => {
      const w = R * Math.tan(Math.PI / TEETH), s = 0.05;
      const big = kcad.path().moveTo(0, -w).lineTo(H, 0).lineTo(0, w).close();
      const small = kcad.path().moveTo(0, -w * s).lineTo(H * s, 0).lineTo(0, w * s).close();
      return small.loft(big, {
        planes: [{ plane: 'XZ', origin: [0, R * s, 0] }, { plane: 'XZ', origin: [0, R, 0] }],
        ruled: true,
      });
    };
    const patterned = await lower((kcad) => {
      tooth(kcad).patternCircular({ count: TEETH, axis: [1, 0, 0] });
    });
    expect(patterned.result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ring = patterned.result.shapes.get('pattern_1') as OcctBackend;

    const single = await lower((kcad) => { tooth(kcad); });
    const toothVolume = ([...single.result.shapes.values()].pop() as OcctBackend).volume();

    // Teeth touch only along edges, so the fused volume is exactly the sum.
    expect(toothVolume).toBeGreaterThan(3.9);
    expect(ring.volume()).toBeCloseTo(TEETH * toothVolume, 6);
    // One connected solid, axis along X: x spans the tooth height, y/z the radius.
    // Teeth that meet only along an edge stay separate solids — as they did
    // when the pattern was folded pairwise.
    expect(ring.solidComponents().length).toBe(TEETH);
    const bb = ring.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 4);
    expect(bb.max[0]).toBeCloseTo(H, 4);
    expect(bb.max[1]).toBeCloseTo(R, 3);
    expect(bb.min[1]).toBeCloseTo(-R, 3);
  });
});
