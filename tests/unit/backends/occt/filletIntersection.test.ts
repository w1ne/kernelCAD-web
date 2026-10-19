// Reduced roadster case: a plate with a through-cylinder is the wheel-arch
// seam analogue. After subtract, the circular seam has no durable edge ID;
// filletIntersection selects it from the exact body ∩ cutter section.
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

function archFixture() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const plate = kcad.box(40, 30, 20);
  const cutter = kcad.cylinder(30, 5).translate(20, 15, -5);
  const cut = plate.subtract(cutter);
  return { session, kcad, plate, cutter, cut };
}

describe('filletIntersection', () => {
  beforeAll(async () => { await initOcct(); });

  it('fillets the circular subtract seam at r = 0.5, 1, 2 and 5 mm', async () => {
    const volumes = 3.141592653589793 * 25 * 20;
    const baseVolume = 40 * 30 * 20 - volumes;
    for (const r of [0.5, 1, 2, 5]) {
      const { cut, cutter } = archFixture();
      const filleted = cut.filletIntersection(cutter, r);
      const backend = await filleted.lower();
      const volume = backend.volume();
      expect(volume, `r=${r}`).toBeGreaterThan(0);
      expect(Math.abs(volume - baseVolume), `r=${r}`).toBeGreaterThan(0.01);
      expect(Math.abs(volume - baseVolume) / baseVolume, `r=${r}`).toBeLessThan(0.05);
      const bb = backend.boundingBox();
      for (const v of bb.min) expect(Number.isFinite(v)).toBe(true);
      for (const v of bb.max) expect(Number.isFinite(v)).toBe(true);
    }
  }, 120_000);

  it('reports no-section when the cutter missed the body', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const plate = kcad.box(20, 20, 10);
    const far = kcad.cylinder(10, 2).translate(100, 100, 0);
    plate.filletIntersection(far, 1);
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.some((d) => d.code === 'feature.fillet-intersection.no-section')).toBe(true);
  });

  it('fails the oversized-radius case without returning an invalid solid', async () => {
    const { session, cut, cutter } = archFixture();
    cut.filletIntersection(cutter, 20);
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.some((d) =>
      d.code === 'feature.fillet-intersection.fillet-failed'
      || d.code === 'feature.fillet-intersection.short-edge')).toBe(true);
    // A rejected blend is a failed feature: no shape is published, so the
    // invalid/partial solid can never reach interference or export.
    const filletId = session.getRecords().find((r) => r.kind === 'filletIntersection')?.id;
    expect(filletId).toBeDefined();
    expect(result.shapes.has(filletId!)).toBe(false);
  }, 120_000);

  it('reports the reserved both-sides mode at lower time', async () => {
    const { session, cut, cutter } = archFixture();
    cut.filletIntersection(cutter, 1, { sides: 'both' });
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    const diagnostic = result.diagnostics.find((d) => d.code === 'feature.invalid-args');
    expect(diagnostic?.message).toMatch(/sides 'both' is reserved/i);
  });
});
