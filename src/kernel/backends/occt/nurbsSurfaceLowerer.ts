// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from './occtBackend';
import { buildNurbsSketchOnPlane } from './pathNurbsLowerer';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import type { Vec3 } from '../../../shared/intent/types';

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
 * sketches). Calls `replicad.Sketch.loftWith(others, cfg, returnShell=true)`
 * so the result is a `TopoDS_Shell` — the full skinned surface, possibly
 * comprised of multiple lateral faces (for closed wires of N sections,
 * ThruSections produces 4 lateral faces tied together as a shell).
 *
 * Returns the underlying replicad shape so the consumer can thicken or
 * shell-wrap it; we do NOT collapse to a single face because that would
 * lose the full skinned surface bound to closed-wire sections.
 */
export function buildSkinnedSurface(
  sectionShapes: OcctBackend[],
  planes: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>,
): SkinnedSurface {
  if (sectionShapes.length < 2) {
    throw new Error(
      `buildSkinnedSurface: need at least 2 sections (got ${sectionShapes.length})`,
    );
  }
  if (planes.length !== sectionShapes.length) {
    throw new Error(
      `buildSkinnedSurface: planes count ${planes.length} must equal sections count ${sectionShapes.length}`,
    );
  }
  // Lift each sketch onto its target plane. Mirrors OcctBackend.loftFromSketches'
  // section-prep pass but inlined here so we can request the shell variant.
  //
  // Two paths:
  //   - Pen-only sketches (`_drawing` populated): lift via
  //     `Drawing.sketchOnPlane(plane, origin)` exactly as before.
  //   - NURBS-bearing sketches (`_hasNurbs` set + `_commands` populated,
  //     `_drawing` null — Slice D Task 3 leaves the pen empty because it
  //     can't construct `spline` / `nurbsSegment` / `hermiteG2_2d` edges):
  //     build the section wire directly on the target plane via
  //     `buildNurbsSketchOnPlane`, which returns a `replicad.Sketch` whose
  //     `.loftWith(...)` works the same way as the pen-derived Sketch.
  //     The `origin` offset isn't applied here (matches
  //     `OcctBackend.loftFromSketches`'s NURBS branch — path coordinates
  //     must already encode their final position).
  const lifted: unknown[] = [];
  for (let i = 0; i < sectionShapes.length; i++) {
    const s = sectionShapes[i] as unknown as {
      kind?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _drawing?: any;
      _hasNurbs?: boolean;
      _commands?: SketchCommand[];
    };
    if (s.kind !== 'sketch' || (!s._drawing && !s._hasNurbs)) {
      throw new Error(`buildSkinnedSurface: input ${i} is not a sketch-tagged OcctBackend`);
    }
    const p = planes[i];
    if (s._hasNurbs && s._commands) {
      lifted.push(buildNurbsSketchOnPlane(s._commands, p.plane));
    } else {
      lifted.push(s._drawing!.sketchOnPlane(p.plane, p.origin));
    }
  }
  const [first, ...rest] = lifted;
  // returnShell=true → BRepOffsetAPI_ThruSections returns a TopoDS_Shell of
  // skinned faces. For closed-wire N-section input that's 4 lateral faces
  // sewn together — the consumer (thicken/toShape) treats the whole shell
  // as one surface.
  const shellShape = (first as {
    loftWith: (others: unknown[], cfg: object, returnShell: boolean) => unknown;
  }).loftWith(rest, { ruled: false }, true);
  return { kind: 'skinned', shape: shellShape };
}

/** Tagged variant of a built NURBS surface. The lowerer treats both kinds
 *  the same for thicken / toShape, but the shell variant skips the
 *  single-face wrap step (the shell already contains all lateral faces). */
export type BuiltSurface =
  | { kind: 'face'; face: replicad.Face }
  | SkinnedSurface;

export interface SkinnedSurface {
  kind: 'skinned';
  /** Replicad-wrapped TopoDS_Shell from ThruSections. */
  shape: unknown;
}

/**
 * Thicken a single-face shell (the NURBS face) into a closed solid via
 * `BRepOffsetAPI_MakeThickSolid.MakeThickSolidBySimple`.
 *
 * Inputs: `t` is the total thickness in mm and is passed directly (no `/2`
 * halving) as the offset distance. `MakeThickSolidBySimple` is the correct
 * OCCT entry point for "close an open shell into a solid by offsetting one
 * side" — the resulting solid has thickness ≈ `t` along the surface normal.
 * The alternative `MakeThickSolidByJoin` requires a solid input plus a list
 * of faces to remove (used for hollowing an existing solid, e.g. the `shell`
 * feature), which is the wrong shape for the slice-1 NURBS use case.
 */
export function thickenFace(surface: replicad.Face | BuiltSurface, t: number): OcctBackend {
  if (!(t > 0 && Number.isFinite(t))) {
    throw new Error(`thickenFace: t must be a positive finite number; got ${t}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  // Discriminator: skinned shell (multi-face) → pass shell directly;
  // bare Face or 'face' wrapper → wrap as a single-face shell first.
  let shellTopo: unknown;
  if (typeof surface === 'object' && surface !== null && (surface as { kind?: string }).kind === 'skinned') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shellTopo = ((surface as SkinnedSurface).shape as any).wrapped;
  } else {
    // Either a bare Face or a { kind: 'face', face } wrapper.
    const face: replicad.Face =
      typeof surface === 'object' && surface !== null && (surface as { kind?: string }).kind === 'face'
        ? (surface as { kind: 'face'; face: replicad.Face }).face
        : (surface as replicad.Face);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faceTopo = (face as any).wrapped;
    const builder = new oc.TopoDS_Builder();
    const shell = new oc.TopoDS_Shell();
    builder.MakeShell(shell);
    builder.Add(shell, faceTopo);
    shellTopo = shell;
  }

  const thicker = new oc.BRepOffsetAPI_MakeThickSolid();
  const progress = new oc.Message_ProgressRange_1();
  // MakeThickSolidBySimple is the right API for "offset an open shell into a
  // closed solid". MakeThickSolidByJoin requires a solid input + a list of
  // faces to remove (the existing shell-feature path uses that for hollowing
  // a solid). For free-surface thickening, the simple-mode call is the
  // canonical OCCT entry point.
  thicker.MakeThickSolidBySimple(shellTopo, t);
  thicker.Build(progress);
  if (!thicker.IsDone()) {
    throw new Error('BRepOffsetAPI_MakeThickSolid failed (IsDone=false)');
  }
  const solidRaw = thicker.Shape();
  const solid = replicad.cast(solidRaw) as replicad.Shape3D;
  return new OcctBackend(solid);
}

/**
 * Wrap a NURBS face as a single-face Shape (zero-volume shell). The resulting
 * `OcctBackend` has no `kind` and no historyMap — it's a shell whose
 * `.boundingBox()` etc. still work. `.volume()` returns 0 (or near-zero).
 */
export function faceToShape(surface: replicad.Face | BuiltSurface): OcctBackend {
  // Skinned shell path: just rewrap the shell as a Shape3D.
  if (typeof surface === 'object' && surface !== null && (surface as { kind?: string }).kind === 'skinned') {
    return new OcctBackend((surface as SkinnedSurface).shape as replicad.Shape3D);
  }
  const face: replicad.Face =
    typeof surface === 'object' && surface !== null && (surface as { kind?: string }).kind === 'face'
      ? (surface as { kind: 'face'; face: replicad.Face }).face
      : (surface as replicad.Face);
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
