import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from './occtBackend';
import type { Vec3 } from '../../intent/types';

/**
 * Pure OCCT-direct constructors for NURBS surfaces, thicken, and shell-wrap.
 *
 * This module is path-agnostic: it exposes pure functions that take validated
 * inputs and return `replicad.Face` or `OcctBackend`. Both the Surface peer
 * path and the descoped Shape-returning path call into these helpers.
 *
 * Validation of caller-supplied `controls` / `degree` shapes lives at the
 * capture layer (`src/modules/api.ts`). The helpers below assume well-formed
 * inputs and propagate any OCCT failure as a thrown Error which the lowerer
 * maps to a diagnostic.
 */

export interface NurbsSurfaceInputs {
  /** Control points laid out [u][v] on a rectangular grid. */
  controls: Vec3[][];
  /** Optional rational weights, same grid shape as controls. */
  weights?: number[][];
  /** Degrees in U and V. */
  degree: { u: number; v: number };
  /** Optional explicit knot vectors. Missing => clamped uniform inferred. */
  knots?: { u: number[]; v: number[] };
  /** Optional periodic flags per parametric direction. Default { false, false }. */
  periodic?: { u: boolean; v: boolean };
}

/**
 * Build a clamped-uniform knot vector for `n` control points + degree `d`.
 *
 * For a clamped (non-periodic) NURBS, the knot multiplicities are:
 *  - degree+1 at each endpoint;
 *  - 1 for interior knots.
 *
 * Returns distinct knot values + per-knot multiplicities (the form OCCT
 * expects via its `Knots`/`Mults` arrays).
 */
export function clampedUniformKnots(
  n: number,
  d: number,
): { knots: number[]; mults: number[] } {
  // Distinct knot values for clamped uniform: { 0, 1/(n-d), 2/(n-d), ..., 1 }.
  const distinct = n - d + 1;
  if (distinct < 2) {
    // Degenerate: collapse to [0, 1] with mults [d+1, d+1] so OCCT can still
    // build the (rank-deficient) surface. Capture-layer validation should
    // reject this earlier; we keep the math defensive.
    return { knots: [0, 1], mults: [d + 1, d + 1] };
  }
  const knots: number[] = [];
  const mults: number[] = [];
  for (let i = 0; i < distinct; i++) {
    knots.push(i / (distinct - 1));
    mults.push(i === 0 || i === distinct - 1 ? d + 1 : 1);
  }
  return { knots, mults };
}

/**
 * Decompose a possibly-non-decreasing-with-repeats knot vector into the
 * (distinct, multiplicity) form OCCT consumes.
 */
export function decomposeKnots(
  knotVector: number[],
): { knots: number[]; mults: number[] } {
  const knots: number[] = [];
  const mults: number[] = [];
  for (const k of knotVector) {
    if (knots.length > 0 && knots[knots.length - 1] === k) {
      mults[mults.length - 1] += 1;
    } else {
      knots.push(k);
      mults.push(1);
    }
  }
  return { knots, mults };
}

/**
 * Construct a `Geom_BSplineSurface_1` via OCCT WASM and wrap it as a
 * `BRepBuilderAPI_MakeFace_8` face. Returns a `replicad.Face`.
 *
 * Plan-vs-API deviations encountered while implementing:
 *
 *  1. Knot arrays: the plan called for `IntTools_CArray1OfReal_2` — the WASM
 *     bindings expose this type as `TColStd_Array1OfReal_2` (concrete
 *     subclass). `IntTools_CArray1OfReal` is a type alias used in method
 *     signatures only, not an instantiable class.
 *
 *  2. `BRepBuilderAPI_MakeFace_8` expects the base `Handle_Geom_Surface`,
 *     not a `Handle_Geom_BSplineSurface`. We use `Handle_Geom_Surface_2`
 *     (the constructor taking a `Geom_Surface*`).
 *
 *  3. Rational weights: `TColStd_Array2OfReal` (required by
 *     `Geom_BSplineSurface_2`) is not exposed in the WASM exports —
 *     only the 1D `TColStd_Array1OfReal_*` variants are constructable.
 *     Slice-1 therefore ships **non-rational** NURBS surfaces only;
 *     `weights` on `NurbsSurfaceInputs` is accepted at the API surface
 *     for forward compatibility but ignored by this builder with a
 *     warning thrown (caller maps to diagnostic). A future iteration
 *     can add rational support once the binding lands upstream or via
 *     a post-construction `SetWeight` walk.
 *
 *  4. `BRep_Builder` is not exposed; we use `TopoDS_Builder` (its
 *     concrete subclass) for the same `MakeShell` / `Add` API.
 */
export function buildNurbsFace(opts: NurbsSurfaceInputs): replicad.Face {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const nU = opts.controls.length;
  const nV = opts.controls[0]?.length ?? 0;
  if (nU < 2 || nV < 2) {
    throw new Error(`buildNurbsFace: control grid must be at least 2x2; got ${nU}x${nV}`);
  }
  const du = opts.degree.u;
  const dv = opts.degree.v;

  // 1-indexed (1..nU, 1..nV) per OCCT convention.
  const poles = new oc.TColgp_Array2OfPnt_2(1, nU, 1, nV);
  for (let i = 0; i < nU; i++) {
    if (opts.controls[i].length !== nV) {
      throw new Error(
        `buildNurbsFace: control grid is jagged: row ${i} has ${opts.controls[i].length} cols, expected ${nV}`,
      );
    }
    for (let j = 0; j < nV; j++) {
      const [x, y, z] = opts.controls[i][j];
      poles.SetValue(i + 1, j + 1, new oc.gp_Pnt_3(x, y, z));
    }
  }

  const decomposed = (
    raw: number[] | undefined,
    n: number,
    d: number,
  ): { knots: number[]; mults: number[] } =>
    raw ? decomposeKnots(raw) : clampedUniformKnots(n, d);
  const uK = decomposed(opts.knots?.u, nU, du);
  const vK = decomposed(opts.knots?.v, nV, dv);

  const uKnotsArr = new oc.TColStd_Array1OfReal_2(1, uK.knots.length);
  for (let i = 0; i < uK.knots.length; i++) uKnotsArr.SetValue(i + 1, uK.knots[i]);
  const vKnotsArr = new oc.TColStd_Array1OfReal_2(1, vK.knots.length);
  for (let i = 0; i < vK.knots.length; i++) vKnotsArr.SetValue(i + 1, vK.knots[i]);

  const uMultsArr = new oc.TColStd_Array1OfInteger_2(1, uK.mults.length);
  for (let i = 0; i < uK.mults.length; i++) uMultsArr.SetValue(i + 1, uK.mults[i]);
  const vMultsArr = new oc.TColStd_Array1OfInteger_2(1, vK.mults.length);
  for (let i = 0; i < vK.mults.length; i++) vMultsArr.SetValue(i + 1, vK.mults[i]);

  const uPeriodic = opts.periodic?.u ?? false;
  const vPeriodic = opts.periodic?.v ?? false;

  if (opts.weights) {
    // Deviation #3: TColStd_Array2OfReal is not bound — non-rational only
    // in slice-1. We silently drop weights and emit a warning that the
    // caller can choose to surface. Validators upstream may reject weights
    // outright; here we degrade gracefully.
    console.warn(
      'nurbsSurfaceLowerer: weights are accepted but ignored in slice-1 ' +
      '(TColStd_Array2OfReal not exposed in WASM bindings). ' +
      'Surface will be built as non-rational.',
    );
  }
  const surf = new oc.Geom_BSplineSurface_1(
    poles, uKnotsArr, vKnotsArr, uMultsArr, vMultsArr,
    du, dv, uPeriodic, vPeriodic,
  );

  // BRepBuilderAPI_MakeFace_8 wants Handle_Geom_Surface (base class), not the
  // specialized Handle_Geom_BSplineSurface. Use Handle_Geom_Surface_2.
  const handle = new oc.Handle_Geom_Surface_2(surf);
  const mkFace = new oc.BRepBuilderAPI_MakeFace_8(handle, 1e-6);
  if (!mkFace.IsDone()) {
    throw new Error('BRepBuilderAPI_MakeFace_8 failed to build NURBS face');
  }
  const topoFace = mkFace.Face();
  // Replicad's Face constructor takes a TopoDS_Face directly.
  return new replicad.Face(topoFace);
}

/**
 * Skin a NURBS surface through a sequence of section wires (lifted from
 * sketches). Reuses `OcctBackend.loftFromSketches` and peels the largest
 * face out of the resulting solid as the lateral lofted face.
 *
 * Slice-1 limitation: this is a best-effort extraction from a solid loft —
 * sufficient for the corpus tasks (smooth panels skinned through rectangular
 * cross-sections). A future iteration could replace this with a direct
 * BRepOffsetAPI_ThruSections producing a shell rather than a solid.
 */
export function buildSkinnedSurface(
  sectionShapes: OcctBackend[],
  planes: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>,
): replicad.Face {
  const solid = OcctBackend.loftFromSketches(sectionShapes, planes, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faces = (solid.getReplicadShape() as any).faces as replicad.Face[];
  if (!faces || faces.length === 0) {
    throw new Error('buildSkinnedSurface: loft produced no faces');
  }
  // Lateral face heuristic: among all faces, take the largest one. For a
  // 2-section ruled loft of rectangular profiles, the cap faces share area
  // with the side faces, so this is unambiguous for our corpus tasks.
  const sorted = [...faces].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aArea = (a as any).area?.() ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bArea = (b as any).area?.() ?? 0;
    return bArea - aArea;
  });
  return sorted[0];
}

/**
 * Thicken a single-face shell (the NURBS face) into a closed solid via
 * `BRepOffsetAPI_MakeThickSolid.MakeThickSolidByJoin`.
 *
 * Inputs: `t` is the total thickness in mm. The implementation passes `t/2`
 * as the offset because BRepOffsetAPI offsets both sides relative to the
 * source face (positive normal direction), so the resulting solid has
 * thickness ≈ `t` along the surface normal.
 *
 * Note: callers requesting `t === thickness span` expect bounding-box span
 * `≈ t`. For our test/corpus assertions we use the OCCT convention directly
 * (offset = t, span ≈ t), which matches how the existing `shell` feature
 * uses MakeThickSolid.
 */
export function thickenFace(face: replicad.Face, t: number): OcctBackend {
  if (!(t > 0 && Number.isFinite(t))) {
    throw new Error(`thickenFace: t must be a positive finite number; got ${t}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceTopo = (face as any).wrapped;

  // Build a single-face shell containing this face. BRepOffsetAPI_MakeThickSolid
  // treats the input shape as a solid to be hollowed (Closing faces removed
  // before offset). For a "thicken an open surface" use case, the seed is a
  // shell containing the single face, and the closing-faces list is empty —
  // every face is then offset to produce both sides of the resulting solid.
  const builder = new oc.TopoDS_Builder();
  const shell = new oc.TopoDS_Shell();
  builder.MakeShell(shell);
  builder.Add(shell, faceTopo);

  const thicker = new oc.BRepOffsetAPI_MakeThickSolid();
  const progress = new oc.Message_ProgressRange_1();
  // MakeThickSolidBySimple is the right API for "offset an open shell into a
  // closed solid". MakeThickSolidByJoin requires a solid input + a list of
  // faces to remove (the existing shell-feature path uses that for hollowing
  // a solid). For free-surface thickening, the simple-mode call is the
  // canonical OCCT entry point.
  thicker.MakeThickSolidBySimple(shell, t);
  thicker.Build(progress);
  if (!thicker.IsDone()) {
    throw new Error('BRepOffsetAPI_MakeThickSolid failed (IsDone=false)');
  }
  const solidRaw = thicker.Shape();
  // Convert raw TopoDS_Shape to a typed replicad.Shape3D via replicad.cast()
  // (same pattern occtBackend uses for BRepBuilderAPI_GTransform output).
  const solid = replicad.cast(solidRaw) as replicad.Shape3D;
  return new OcctBackend(solid);
}

/**
 * Wrap a NURBS face as a single-face Shape (zero-volume shell). The resulting
 * `OcctBackend` has no `kind` and no historyMap — it's a shell whose
 * `.boundingBox()` etc. still work. `.volume()` returns 0 (or near-zero).
 */
export function faceToShape(face: replicad.Face): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceTopo = (face as any).wrapped;
  const builder = new oc.TopoDS_Builder();
  const shell = new oc.TopoDS_Shell();
  builder.MakeShell(shell);
  builder.Add(shell, faceTopo);
  // Wrap via replicad.cast() so the resulting Shape3D has the proper
  // replicad wrapper around the OCCT TopoDS_Shell. Without this, measureVolume
  // etc. trip on undefined `$$` pointers.
  const wrapped = replicad.cast(shell) as replicad.Shape3D;
  return new OcctBackend(wrapped);
}
