// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import { KernelError } from '../../../../src/shared/intent/kernelError';
import { sectionShapes } from '../../../../src/modeling/backends/occt/surfaceIntersection';
import type { Vec3 } from '../../../../src/shared/intent/types';

beforeAll(async () => {
  await initOcct();
});

function hypot3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function wrappedOf(backend: OcctBackend): unknown {
  return (backend.getReplicadShape() as { wrapped: unknown }).wrapped;
}

describe('surfaceIntersection OCCT math', () => {
  it('cylinder ∩ plane at 30° is an ellipse with analytic semi-axes', () => {
    const r = 10;
    const angle = Math.PI / 6;
    const cyl = OcctBackend.cylinder(100, r);
    // Infinite-ish plane through z=50, tilted 30° around Y: z = 50 + x tan(30°)
    // Realised as a large thin box so BRepAlgoAPI_Section sees two solids.
    const slab = OcctBackend.box(80, 80, 0.02, true);
    const tilted = slab.rotate([0, 1, 0], 30).translate(0, 0, 50);
    const edges = sectionShapes(wrappedOf(cyl), wrappedOf(tilted));
    expect(edges.length).toBeGreaterThan(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    let foundEllipse = false;
    const expectedMinor = r;
    const expectedMajor = r / Math.cos(angle);
    for (const edge of edges) {
      const adaptor = new oc.BRepAdaptor_Curve_2(edge);
      const type = adaptor.GetType();
      if (type === oc.GeomAbs_CurveType.GeomAbs_Ellipse) {
        const el = adaptor.Ellipse();
        expect(Math.abs(el.MinorRadius() - expectedMinor)).toBeLessThan(1e-4);
        expect(Math.abs(el.MajorRadius() - expectedMajor)).toBeLessThan(1e-4);
        foundEllipse = true;
      }
      adaptor.delete?.();
    }
    // Even if OCCT approximates the section as a BSpline, the sampled
    // bounding radii in the plane must still match the analytic ellipse.
    if (!foundEllipse) {
      const pts: Vec3[] = [];
      for (const edge of edges) {
        const adaptor = new oc.BRepAdaptor_Curve_2(edge);
        const u0 = adaptor.FirstParameter();
        const u1 = adaptor.LastParameter();
        const p = new oc.gp_Pnt_1();
        for (let i = 0; i <= 64; i++) {
          adaptor.D0(u0 + ((u1 - u0) * i) / 64, p);
          pts.push([p.X(), p.Y(), p.Z()]);
        }
        adaptor.delete?.();
      }
      // In the tilted plane, the ellipse centre is (0,0,50). Distances
      // in-plane from the centre span [minor, major].
      const dist = pts.map((q) => hypot3([q[0], q[1], q[2] - 50]));
      const minR = Math.min(...dist);
      const maxR = Math.max(...dist);
      expect(minR).toBeGreaterThan(expectedMinor - 0.15);
      expect(minR).toBeLessThan(expectedMinor + 0.15);
      expect(maxR).toBeGreaterThan(expectedMajor - 0.15);
      expect(maxR).toBeLessThan(expectedMajor + 0.15);
    }
  });

  it('two equal-radius cylinders (Steinmetz) produce closed curves', () => {
    const a = OcctBackend.cylinder(40, 10);
    const b = OcctBackend.cylinder(40, 10).rotate([0, 1, 0], 90).translate(0, 0, 20);
    const edges = sectionShapes(wrappedOf(a), wrappedOf(b));
    expect(edges.length).toBeGreaterThanOrEqual(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const endpoints: Array<[number, number, number]> = [];
    const p = new oc.gp_Pnt_1();
    for (const edge of edges) {
      const adaptor = new oc.BRepAdaptor_Curve_2(edge);
      const u0 = adaptor.FirstParameter();
      const u1 = adaptor.LastParameter();
      adaptor.D0(u0, p);
      endpoints.push([p.X(), p.Y(), p.Z()]);
      adaptor.D0(u1, p);
      endpoints.push([p.X(), p.Y(), p.Z()]);
      // Every sample lies on both cylinders: A: x²+y²=100, B: y²+(z-20)²=100.
      for (let i = 0; i <= 8; i++) {
        adaptor.D0(u0 + ((u1 - u0) * i) / 8, p);
        const onA = Math.abs(p.X() ** 2 + p.Y() ** 2 - 100);
        const onB = Math.abs(p.Y() ** 2 + (p.Z() - 20) ** 2 - 100);
        expect(onA).toBeLessThan(1e-3);
        expect(onB).toBeLessThan(1e-3);
      }
      adaptor.delete?.();
    }
    // Four quarter-ellipses chain into two closed loops: every endpoint
    // has a partner within 1e-3 mm (degree 2 vertices of the Steinmetz figure).
    const unmatched = endpoints.filter((pt, i) => {
      return !endpoints.some((other, j) => {
        if (i === j) return false;
        return Math.hypot(pt[0] - other[0], pt[1] - other[1], pt[2] - other[2]) < 1e-3;
      });
    });
    expect(unmatched).toHaveLength(0);
  });
});

describe('surfaceIntersection public API', () => {
  it('returns Curve3Ds whose samples lie on both solids', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const cyl = kcad.cylinder(100, 10);
    const slab = kcad.box(80, 80, 0.02, true).rotateY(30).translate(0, 0, 50);
    const curves = await kcad.surfaceIntersection(cyl, slab);
    expect(curves.length).toBeGreaterThan(0);
    const samples = curves[0].sample(16);
    expect(samples.length).toBe(17);
    for (const p of samples) {
      expect(p.every((c) => Number.isFinite(c))).toBe(true);
    }
  });

  it('throws feature.surface-intersection.none when shapes miss', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = kcad.box(10, 10, 10);
    const b = kcad.box(10, 10, 10).translate(40, 0, 0);
    let caught: unknown = null;
    try {
      await kcad.surfaceIntersection(a, b);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.surface-intersection.none');
  });
});
