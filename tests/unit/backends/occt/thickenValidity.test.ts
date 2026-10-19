// Roadster front-clip repro: the hood is a G2-boundary patch. Thickening it
// must produce a BRepCheck-valid solid whose volume is physically related to
// panel area x thickness — not the 3.46e9 mm3 phantom overlap reported for a
// 2.0e6 mm3 panel.
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';

const v3 = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

function isValidSolid(shape: unknown): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(shape, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

function hoodFixture() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const hoodFront = kcad.spline3d([v3(26, -650, 355), v3(22, -360, 366), v3(20, 0, 372), v3(22, 360, 366), v3(26, 650, 355)]);
  const creaseR = kcad.hermiteG2(
    { point: v3(26, 650, 355), tangent: v3(1200, 0, 420), curvature: v3(0, 0, 0.0002) },
    { point: v3(1650, 600, 840), tangent: v3(700, 0, 300), curvature: v3(0, 0, 0.0001) },
  );
  const cowl = kcad.spline3d([v3(1650, 600, 840), v3(1650, 320, 852), v3(1650, 0, 860), v3(1650, -320, 852), v3(1650, -600, 840)]);
  const creaseLRev = kcad.hermiteG2(
    { point: v3(1650, -600, 840), tangent: v3(-1200, 0, -420), curvature: v3(0, 0, 0.0001) },
    { point: v3(26, -650, 355), tangent: v3(-700, 0, -300), curvature: v3(0, 0, 0.0002) },
  );
  const hoodSurf = kcad.surfaceFromBoundary([hoodFront, creaseR, cowl, creaseLRev], { continuity: 'G2' });
  return { session, kcad, hoodSurf };
}

describe('thicken validity (roadster G2 hood)', () => {
  beforeAll(async () => { await initOcct(); });

  it('produces a valid solid with volume near panel area * t', async () => {
    const { hoodSurf } = hoodFixture();
    const shell = await hoodSurf.toShape().lower();
    const area = shell.surfaceArea();
    const solid = await hoodSurf.thicken(5).lower();
    const shape = (solid.getReplicadShape() as any).wrapped;
    expect(isValidSolid(shape)).toBe(true);
    expect(Number.isFinite(solid.volume())).toBe(true);
    expect(solid.volume()).toBeGreaterThan(0);
    // A single-sided offset of an open panel is ~area * thickness.
    expect(solid.volume()).toBeLessThan(area * 5 * 1.5);
    expect(solid.volume()).toBeGreaterThan(area * 5 * 0.5);
    // The impossible overlap in the roadster report: more material than the
    // panel itself. Guard the producer side.
    expect(solid.volume()).toBeLessThan(area * 50);
  }, 120_000);

  it('rejects a self-intersecting offset instead of publishing a phantom solid', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    // Half-cylinder radius 2: thickness 50 is far past the local curvature,
    // so OCCT returns a topologically valid solid with ~10x the physical volume.
    const controls: [number, number, number][][] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const theta = (Math.PI * i) / (n - 1);
      controls.push([
        [Math.cos(theta) * 2, 0, Math.sin(theta) * 2],
        [Math.cos(theta) * 2, 10, Math.sin(theta) * 2],
      ]);
    }
    const surf = kcad.nurbsSurface({ controls, degree: { u: 2, v: 1 } });
    surf.thicken(50);
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(session.getRecords());
    expect(result.diagnostics.some((d) => d.code === 'feature.surface-thicken.invalid-solid')).toBe(true);
    expect([...result.shapes.keys()].some((id) => id.startsWith('surfaceThicken_'))).toBe(false);
  }, 120_000);

  it('solidifies a sewn multi-patch shell', async () => {
    const { kcad, hoodSurf } = hoodFixture();
    const fasciaBottom = kcad.spline3d([v3(-2, -800, 105), v3(-2, -400, 100), v3(-2, 0, 98), v3(-2, 400, 100), v3(-2, 800, 105)]);
    const fasciaRight = kcad.spline3d([v3(-2, 800, 105), v3(8, 790, 200), v3(20, 755, 300), v3(26, 650, 355)]);
    const fasciaTop = kcad.spline3d([v3(26, 650, 355), v3(22, 360, 366), v3(20, 0, 372), v3(22, -360, 366), v3(26, -650, 355)]);
    const fasciaLeft = kcad.spline3d([v3(26, -650, 355), v3(20, -755, 300), v3(8, -790, 200), v3(-2, -800, 105)]);
    const fasciaSurf = kcad.surfaceFromBoundary([fasciaBottom, fasciaRight, fasciaTop, fasciaLeft], { continuity: 'G1' });
    const sewn = kcad.sew([fasciaSurf, hoodSurf], { tolerance: 0.05 });
    const solid = await sewn.thicken(5).lower();
    const shape = (solid.getReplicadShape() as any).wrapped;
    expect(isValidSolid(shape)).toBe(true);
    expect(solid.volume()).toBeGreaterThan(0);
    const shell = await sewn.lower();
    const area = shell.surfaceArea();
    expect(solid.volume()).toBeLessThan(area * 5 * 5);
    expect(solid.volume()).toBeGreaterThan(area * 5 * 0.2);
  }, 120_000);
});
