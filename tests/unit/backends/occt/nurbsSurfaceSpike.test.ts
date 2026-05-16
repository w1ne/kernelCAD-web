import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

/**
 * Phase-0 spike for W1.3 NURBS surfaces.
 *
 * Confirms the OCCT WASM primitives in `replicad-opencascadejs` are reachable
 * via `getOC()` with usable signatures:
 *  - Geom_BSplineSurface_1 — non-rational NURBS surface from a control net.
 *  - BRepBuilderAPI_MakeFace_8 — wrap a Handle_Geom_Surface as a TopoDS_Face.
 *  - GeomAPI_PointsToBSplineSurface_2 — fit a NURBS surface to a point grid.
 *
 * If any test fails, STOP and surface to the controller — the W1.3 plan
 * cannot proceed without these.
 */
describe('OCCT NURBS spike (Phase 0)', () => {
  beforeAll(async () => { await initOcct(); });

  it('Geom_BSplineSurface_1 constructor accepts a 2x2 control net', () => {
    const oc = getOC() as any;

    // 2x2 control net: planar quad at z=0, spanning [0,10] x [0,10].
    const poles = new oc.TColgp_Array2OfPnt_2(1, 2, 1, 2);
    const pt = (x: number, y: number, z: number) => new oc.gp_Pnt_3(x, y, z);
    poles.SetValue(1, 1, pt(0, 0, 0));
    poles.SetValue(1, 2, pt(0, 10, 0));
    poles.SetValue(2, 1, pt(10, 0, 0));
    poles.SetValue(2, 2, pt(10, 10, 0));

    // Clamped uniform knots [0, 1] with mults [2, 2] for degree 1.
    const uKnots = new oc.TColStd_Array1OfReal_2(1, 2);
    uKnots.SetValue(1, 0); uKnots.SetValue(2, 1);
    const vKnots = new oc.TColStd_Array1OfReal_2(1, 2);
    vKnots.SetValue(1, 0); vKnots.SetValue(2, 1);

    const uMults = new oc.TColStd_Array1OfInteger_2(1, 2);
    uMults.SetValue(1, 2); uMults.SetValue(2, 2);
    const vMults = new oc.TColStd_Array1OfInteger_2(1, 2);
    vMults.SetValue(1, 2); vMults.SetValue(2, 2);

    const surf = new oc.Geom_BSplineSurface_1(
      poles, uKnots, vKnots, uMults, vMults, 1, 1, false, false,
    );
    expect(surf).toBeTruthy();
    expect(surf.UDegree()).toBe(1);
    expect(surf.VDegree()).toBe(1);
  });

  it('BRepBuilderAPI_MakeFace_8 wraps a Handle_Geom_Surface', () => {
    const oc = getOC() as any;
    const poles = new oc.TColgp_Array2OfPnt_2(1, 2, 1, 2);
    poles.SetValue(1, 1, new oc.gp_Pnt_3(0, 0, 0));
    poles.SetValue(1, 2, new oc.gp_Pnt_3(0, 10, 0));
    poles.SetValue(2, 1, new oc.gp_Pnt_3(10, 0, 0));
    poles.SetValue(2, 2, new oc.gp_Pnt_3(10, 10, 0));
    const knots = (n: number) => {
      const k = new oc.TColStd_Array1OfReal_2(1, n);
      for (let i = 1; i <= n; i++) k.SetValue(i, i - 1);
      return k;
    };
    const mults = (n: number, m: number) => {
      const a = new oc.TColStd_Array1OfInteger_2(1, n);
      for (let i = 1; i <= n; i++) a.SetValue(i, m);
      return a;
    };
    const surf = new oc.Geom_BSplineSurface_1(
      poles, knots(2), knots(2), mults(2, 2), mults(2, 2), 1, 1, false, false,
    );
    // BRepBuilderAPI_MakeFace_8 wants Handle_Geom_Surface, not the
    // specialized Handle_Geom_BSplineSurface — wrap with the base-class
    // handle constructor (Handle_Geom_Surface_2 takes a Geom_Surface ptr).
    const handle = new oc.Handle_Geom_Surface_2(surf);
    const mkFace = new oc.BRepBuilderAPI_MakeFace_8(handle, 1e-6);
    expect(mkFace.IsDone()).toBe(true);
    const face = mkFace.Face();
    expect(face).toBeTruthy();
  });

  it('GeomAPI_PointsToBSplineSurface_2 builds a surface from a point grid', () => {
    const oc = getOC() as any;
    const poles = new oc.TColgp_Array2OfPnt_2(1, 3, 1, 3);
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        poles.SetValue(i, j, new oc.gp_Pnt_3((i - 1) * 5, (j - 1) * 5, 0));
      }
    }
    // Continuity 'C2' is enum GeomAbs_Shape.GeomAbs_C2 (value 2).
    const builder = new oc.GeomAPI_PointsToBSplineSurface_2(
      poles, 3, 8, oc.GeomAbs_Shape.GeomAbs_C2, 1e-3,
    );
    expect(builder.IsDone()).toBe(true);
    const handle = builder.Surface();
    expect(handle).toBeTruthy();
  });
});
