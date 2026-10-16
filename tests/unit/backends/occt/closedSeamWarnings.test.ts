// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Two closed-curve paths that used to change the shape silently now say so:
//  - a closed nurbsCurve without knots is clamped and closed by repeating the
//    first pole, so its seam is a C0 corner unless the net's end legs are
//    collinear: feature.curve3d.closed-seam-kink (warn);
//  - a variableSweep on a closed spine keeps the t=0 profile at the seam and
//    drops the t=1 one; when they differ, the t=1 shape is lost:
//    feature.variable-sweep.closed-seam-section-dropped (warn).
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { lowerCurve3D } from '../../../../src/modeling/backends/occt/curve3dLowerer';
import { buildModel } from '../../../../src/modeling/buildModel';
import type { Curve3DMetadata } from '../../../../src/shared/intent/curve3dRecord';

beforeAll(async () => {
  await initOcct();
}, 60_000);

const curve = (pts: [number, number, number][], extra: Partial<Curve3DMetadata> = {}): Curve3DMetadata =>
  ({ controlPoints: pts, degree: 3, closed: true, ...extra }) as Curve3DMetadata;

describe('closed nurbsCurve seam', () => {
  it('warns when the end legs of the net meet at an angle', () => {
    const r = lowerCurve3D(curve([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]]));
    expect(r.edge).toBeDefined();
    expect(r.warnings?.map((w) => w.code)).toEqual(['feature.curve3d.closed-seam-kink']);
    expect(r.warnings?.[0].message).toMatch(/90\.0° corner \(C0\)/);
  });

  it('is quiet for collinear end legs, open curves, polylines and explicit knots', () => {
    expect(lowerCurve3D(curve([[0, 0, 0], [10, 0, 0], [10, 10, 0], [-10, 10, 0], [-10, 0, 0]])).warnings).toBeUndefined();
    expect(lowerCurve3D(curve([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]], { closed: false })).warnings).toBeUndefined();
    expect(lowerCurve3D(curve([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]], { degree: 1 })).warnings).toBeUndefined();
  });

  it('a closed spline3d (tangent-matched net) raises nothing', async () => {
    const m = await buildModel({
      fileName: 'ring.kcad.ts',
      code: `const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * Math.PI; pts.push([20 * Math.cos(a), 20 * Math.sin(a), 0]); }
const spine = spline3d(pts, { closed: true });
return variableSweep(spine, [{ t: 0, profile: path().circle(0, 0, 2) }, { t: 0.5, profile: path().circle(0, 0, 3) }, { t: 1, profile: path().circle(0, 0, 2) }]);`,
    });
    expect(m.diagnostics.filter((d) => d.severity !== 'info').map((d) => d.code)).toEqual([]);
  }, 120_000);
});

describe('variableSweep on a closed spine', () => {
  const ring = (t1Radius: number) => `const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * Math.PI; pts.push([20 * Math.cos(a), 20 * Math.sin(a), 0]); }
const spine = spline3d(pts, { closed: true });
return variableSweep(spine, [{ t: 0, profile: path().circle(0, 0, 2) }, { t: 0.5, profile: path().circle(0, 0, 3) }, { t: 1, profile: path().circle(0, 0, ${t1Radius}) }]);`;

  it('warns when the dropped t=1 section differs from t=0', async () => {
    const m = await buildModel({ fileName: 'ring.kcad.ts', code: ring(4) });
    const w = m.diagnostics.filter((d) => d.code === 'feature.variable-sweep.closed-seam-section-dropped');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warn');
    expect(w[0].message).toMatch(/t=1 profile was dropped/);
    expect(m.tailShape).toBeDefined(); // still built, on the t=0 profile
  }, 120_000);

  it('is quiet when t=1 repeats the t=0 profile', async () => {
    const m = await buildModel({ fileName: 'ring.kcad.ts', code: ring(2) });
    expect(m.diagnostics.some((d) => d.code === 'feature.variable-sweep.closed-seam-section-dropped')).toBe(false);
  }, 120_000);
});
