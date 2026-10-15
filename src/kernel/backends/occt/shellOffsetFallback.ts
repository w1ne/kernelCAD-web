// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * shell() fallback when every BRepOffsetAPI_MakeThickSolid join mode fails
 * (FIX-10). A box filleted on all edges and then shelled with its top open is
 * the canonical case: the thick-solid builder cannot close the offset where
 * the open face's boundary meets the blends, but offsetting the CLOSED solid
 * inward is easy (every face just shrinks by the wall).
 *
 *   inner   = BRepOffsetAPI_MakeOffsetShape(body, -t)  (closed, shrunk; the
 *             join returns a SHELL, promoted to a solid by ShapeFix_Solid)
 *   opening = prism of each removed face's inner offset, extruded 3·t outward
 *             (it shares that face with `inner`, so the fuse is clean)
 *   result  = body − (inner ∪ openings)
 *
 * Both booleans go through the history-aware path (with its fuzzy recovery,
 * which matters here: the opening prism's walls are tangent to the blends),
 * and the face history is composed so body faces keep their lineage: a body
 * face maps to its trimmed outer piece plus the inner wall offset from it.
 */

import { getOC } from 'replicad';
import type { FaceHash, EdgeHash } from '../../naming/evolutionRecord';
import { booleanShapesWithHistory, type BooleanHistoryResult } from './historyAwareBooleans';
import { isValidShape, volumeOf } from './booleanRecovery';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OC = any;

const HASH_UPPER = 2147483647;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hashOf = (s: unknown): string => (s as any).HashCode(HASH_UPPER).toString(16);

export interface ShellFallbackResult {
  shape: unknown;
  faceHistory: Map<FaceHash, FaceHash[]>;
  edgeHistory: Map<EdgeHash, EdgeHash[]>;
  deletedFaces: Set<FaceHash>;
  deletedEdges: Set<EdgeHash>;
}

/** Smallest bbox extent of `shape`. */
function minExtent(oc: OC, shape: unknown): number {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(shape, box, false);
    const a = box.CornerMin();
    const b = box.CornerMax();
    const m = Math.min(b.X() - a.X(), b.Y() - a.Y(), b.Z() - a.Z());
    a.delete();
    b.delete();
    return m;
  } finally {
    box.delete();
  }
}

/** Offset the closed solid inward by `thickness`; tries the arc join, then
 *  the intersection join. Returns the shrunk solid plus a per-face map
 *  body-face-hash → offset-face-hashes, or undefined. */
function offsetInward(
  oc: OC,
  bodyShape: unknown,
  thickness: number,
  bodyVolume: number,
): { inner: unknown; faceMap: Map<string, string[]> } | undefined {
  for (const intersection of [false, true]) {
    const builder = new oc.BRepOffsetAPI_MakeOffsetShape();
    const progress = new oc.Message_ProgressRange_1();
    try {
      builder.PerformByJoin(
        bodyShape, -thickness, 1e-3, oc.BRepOffset_Mode.BRepOffset_Skin, intersection, false,
        intersection ? oc.GeomAbs_JoinType.GeomAbs_Intersection : oc.GeomAbs_JoinType.GeomAbs_Arc,
        false, progress,
      );
      if (!builder.IsDone()) continue;
      const inner = asSolid(oc, builder.Shape());
      const v = volumeOf(oc, inner);
      if (!(v > 0) || !(v < bodyVolume) || !isValidShape(oc, inner)) continue;
      return { inner, faceMap: offsetFaceMap(oc, bodyShape, builder) };
    } catch {
      // Raw OCCT exception: try the next join.
    } finally {
      builder.delete();
      progress.delete();
    }
  }
  return undefined;
}

/** The join offset of a closed solid comes back as a TopoDS_Shell, which the
 *  boolean algorithm rejects as an operand. Promote it to an oriented solid. */
function asSolid(oc: OC, shape: OC): unknown {
  if (shape.ShapeType() !== oc.TopAbs_ShapeEnum.TopAbs_SHELL) return shape;
  const fixer = new oc.ShapeFix_Solid_1();
  try {
    return fixer.SolidFromShell(oc.TopoDS.Shell_1(shape));
  } finally {
    fixer.delete();
  }
}

/** body face hash → hashes of the inner-offset faces built from it. The
 *  offset builder records these as Generated (not Modified). */
function offsetFaceMap(oc: OC, bodyShape: unknown, builder: OC): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const explorer = new oc.TopExp_Explorer_2(bodyShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (explorer.More()) {
      const face = explorer.Current();
      const list = builder.Generated(face);
      const hashes: string[] = [];
      const copy = new oc.TopTools_ListOfShape_3(list);
      while (!copy.IsEmpty()) {
        hashes.push(hashOf(copy.First_1()));
        copy.RemoveFirst();
      }
      copy.delete();
      list.delete();
      if (hashes.length > 0) out.set(hashOf(face), hashes);
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

/** Outward normal of `face` at its UV mid-point (orientation-aware). */
function outwardNormal(oc: OC, face: unknown): [number, number, number] {
  const topoFace = oc.TopoDS.Face_1(face);
  const uMin = { current: 0 }, uMax = { current: 0 }, vMin = { current: 0 }, vMax = { current: 0 };
  oc.BRepTools.UVBounds_1(topoFace, uMin, uMax, vMin, vMax);
  const p = new oc.gp_Pnt_1();
  const n = new oc.gp_Vec_1();
  const props = new oc.BRepGProp_Face_2(topoFace, false);
  try {
    props.Normal(0.5 * (uMin.current + uMax.current), 0.5 * (vMin.current + vMax.current), p, n);
    const len = n.Magnitude();
    return [n.X() / len, n.Y() / len, n.Z() / len];
  } finally {
    for (const h of [p, n, props]) h.delete();
  }
}

/** Prism through the wall at one removed face: the face's inner offset,
 *  extruded 3·t along the removed face's outward normal, so it starts on the
 *  cavity and exits beyond the outer skin. */
function openingPrism(oc: OC, innerFace: unknown, normal: [number, number, number], thickness: number): unknown {
  const depth = 3 * thickness;
  const dir = new oc.gp_Vec_4(normal[0] * depth, normal[1] * depth, normal[2] * depth);
  const prism = new oc.BRepPrimAPI_MakePrism_1(oc.TopoDS.Face_1(innerFace), dir, true, true);
  try {
    return prism.Shape();
  } finally {
    dir.delete();
    prism.delete();
  }
}

/** Inner-offset faces (as sub-shapes of `inner`) generated from `removed`. */
function innerFacesOf(oc: OC, inner: unknown, generatedHashes: readonly string[]): unknown[] {
  const want = new Set(generatedHashes);
  const out: unknown[] = [];
  const explorer = new oc.TopExp_Explorer_2(inner, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    for (; explorer.More(); explorer.Next()) {
      const f = explorer.Current();
      if (want.has(hashOf(f))) out.push(f);
    }
  } finally {
    explorer.delete();
  }
  return out;
}

/** Follow `hashes` through one boolean's face history (absent = unchanged). */
function follow(hashes: readonly string[], step: BooleanHistoryResult): string[] {
  const out: string[] = [];
  for (const h of hashes) {
    if (step.deletedFaces.has(h)) continue;
    out.push(...(step.faceHistory.get(h) ?? [h]));
  }
  return out;
}

/**
 * Hollow `bodyShape` by offset-and-subtract. Returns undefined when the
 * fallback cannot produce a plausible thin-walled solid (the caller then
 * reports the original failure).
 */
export function shellByOffsetSubtract(
  bodyShape: unknown,
  removedFaces: readonly unknown[],
  thickness: number,
): ShellFallbackResult | undefined {
  const oc = getOC() as OC;
  if (!(thickness > 0) || removedFaces.length === 0) return undefined;
  // A wall at least half the thinnest extent leaves no cavity.
  if (thickness * 2 >= minExtent(oc, bodyShape)) return undefined;
  const bodyVolume = volumeOf(oc, bodyShape);
  const offset = offsetInward(oc, bodyShape, thickness, bodyVolume);
  if (!offset) return undefined;
  try {
    const prisms: unknown[] = [];
    for (const removed of removedFaces) {
      const innerFaces = innerFacesOf(oc, offset.inner, offset.faceMap.get(hashOf(removed)) ?? []);
      if (innerFaces.length === 0) return undefined;
      const normal = outwardNormal(oc, removed);
      for (const f of innerFaces) prisms.push(openingPrism(oc, f, normal, thickness));
    }
    const cutter = booleanShapesWithHistory(offset.inner, prisms, 'fuse');
    const cut = booleanShapesWithHistory(bodyShape, [cutter.shape], 'cut');
    const volume = volumeOf(oc, cut.shape);
    if (!(volume > 0) || !(volume < bodyVolume) || !isValidShape(oc, cut.shape)) return undefined;
    return composeHistory(faceHashesOf(oc, bodyShape), cut, cutter, offset.faceMap, removedFaces.map(hashOf));
  } catch {
    return undefined;
  }
}

function faceHashesOf(oc: OC, shape: unknown): string[] {
  const out: string[] = [];
  const explorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    for (; explorer.More(); explorer.Next()) out.push(hashOf(explorer.Current()));
  } finally {
    explorer.delete();
  }
  return out;
}

function composeHistory(
  bodyFaces: readonly string[],
  cut: BooleanHistoryResult,
  cutter: BooleanHistoryResult,
  offsetFaces: Map<string, string[]>,
  removed: readonly string[],
): ShellFallbackResult {
  const faceHistory = new Map<FaceHash, FaceHash[]>();
  const deletedFaces = new Set<FaceHash>(removed);
  for (const face of bodyFaces) {
    if (deletedFaces.has(face)) continue;
    const outer = follow([face], cut);
    const inner = follow(follow(offsetFaces.get(face) ?? [], cutter), cut);
    const children = [...new Set([...outer, ...inner])];
    if (children.length === 0) deletedFaces.add(face);
    else if (!(children.length === 1 && children[0] === face)) faceHistory.set(face, children);
  }
  return {
    shape: cut.shape,
    faceHistory,
    edgeHistory: cut.edgeHistory,
    deletedFaces,
    deletedEdges: cut.deletedEdges,
  };
}
