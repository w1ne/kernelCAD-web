// Roadster front-clip need: trim a patch against the BRep body boundary, not
// only against another Surface. A whole body is used as the section cutter.
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

function patch(kcad: ReturnType<typeof createModelingApi>) {
  return kcad.nurbsSurface({
    controls: [
      [[0, 0, 0], [0, 10, 0]],
      [[10, 0, 0], [10, 10, 0]],
    ],
    degree: { u: 1, v: 1 },
  });
}

describe('surface trim against a BRep body', () => {
  beforeAll(async () => { await initOcct(); });

  it('trims a patch to the body boundary and keeps the largest piece', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const base = patch(kcad);
    // Crosses the patch through x=5 and extends past its x=10 edge, leaving
    // two pieces (50 and 20 mm²); trim keeps the larger.
    const body = kcad.box(10, 6, 4).translate(5, 2, -2);
    const trimmed = base.trimTo(body).toShape();
    const backend = await trimmed.lower();
    const area = backend.surfaceArea();
    // The body removes a 5 × 6 mm bite (30 mm²), leaving 70 and 30 mm²;
    // trim keeps the 70 mm² piece.
    expect(area).toBeGreaterThan(65);
    expect(area).toBeLessThan(75);
  }, 120_000);

  it('splits a patch at the body boundary into two non-empty pieces', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const base = patch(kcad);
    const body = kcad.box(10, 6, 4).translate(5, 2, -2);
    const [a, b] = base.split(body);
    const areaA = (await a.toShape().lower()).surfaceArea();
    const areaB = (await b.toShape().lower()).surfaceArea();
    expect(areaA).toBeGreaterThan(0);
    expect(areaB).toBeGreaterThan(0);
    expect(areaA + areaB).toBeGreaterThan(99);
    expect(areaA + areaB).toBeLessThan(101);
  }, 120_000);

  it('emits no-intersection when the body misses the patch', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const base = patch(kcad);
    const far = kcad.box(2, 2, 2).translate(100, 100, 100);
    base.trimTo(far).toShape();
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(session.getRecords());
    expect(result.diagnostics.some((d) => d.code === 'feature.surface-trim.no-intersection')).toBe(true);
  }, 120_000);
});
