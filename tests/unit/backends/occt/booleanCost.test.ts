// Cost regression for multi-tool booleans. One record carrying N tools (a
// single `.subtract(h1, …, hN)` call) must run ONE OCCT boolean build, not N
// pairwise cuts of the growing accumulator. Counts are deterministic; the
// wall-clock comparison lives in the PR evidence (warm 8-hole plate:
// ~570 ms one build vs ~1050 ms eight).
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { booleanBuildStats } from '../../../../src/kernel/backends/occt/historyAwareBooleans';
import { createModelingApi } from '../../../../src/modeling/api';

async function lower(build: (kcad: ReturnType<typeof createModelingApi>) => void) {
  const session = new CaptureSession();
  build(createModelingApi({ session }));
  booleanBuildStats.builds = 0;
  const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
  const out = [...result.shapes.values()].pop() as OcctBackend;
  return { result, builds: booleanBuildStats.builds, out };
}

describe('multi-tool boolean cost', () => {
  beforeAll(async () => { await initOcct(); });

  it('cuts a plate with eight hole tools in ONE boolean build', async () => {
    const { result, builds, out } = await lower((kcad) => {
      const holes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        kcad.cylinder(14, 2.5).translate(8 + i * 7, 20, 0),
      );
      kcad.box(60, 40, 10).subtract(...holes);
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // Pairwise folding cost one cut per hole — 8 builds of a growing solid.
    expect(builds).toBe(1);
    expect(out.volume()).toBeCloseTo(60 * 40 * 10 - 8 * Math.PI * 2.5 * 2.5 * 10, 1);
  });

  it('still costs one build per separate subtract record', async () => {
    const { result, builds } = await lower((kcad) => {
      let plate = kcad.box(60, 40, 10);
      for (let i = 0; i < 3; i++) {
        plate = plate.subtract(kcad.cylinder(14, 2.5).translate(8 + i * 7, 20, 0));
      }
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // A chain of records is still a chain of booleans; the one-build form is
    // one `.subtract(...tools)` call.
    expect(builds).toBe(3);
  });

  it('unions every tool in one build; intersection keeps the sequential fold', async () => {
    const union = await lower((kcad) => {
      kcad.box(10, 10, 10).union(
        kcad.box(10, 10, 10).translate(10, 0, 0),
        kcad.box(10, 10, 10).translate(20, 0, 0),
        kcad.box(10, 10, 10).translate(30, 0, 0),
      );
    });
    expect(union.builds).toBe(1);
    expect(union.out.volume()).toBeCloseTo(4 * 1000, 6);

    // OCCT's multi-tool Common computes a ∩ (b ∪ c) (750 here); the record
    // semantics are a ∩ b ∩ c, so intersection still folds pairwise.
    const intersection = await lower((kcad) => {
      kcad.box(10, 10, 10).intersect(
        kcad.box(10, 10, 10).translate(5, 0, 0),
        kcad.box(10, 10, 10).translate(0, 5, 0),
      );
    });
    expect(intersection.builds).toBe(2);
    // x 5..10 ∩ y 5..10 ∩ z 0..10 = 5 × 5 × 10.
    expect(intersection.out.volume()).toBeCloseTo(5 * 5 * 10, 6);
  });
});
