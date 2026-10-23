// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.ts
//
// Import-time B-rep normalization for STEP files.
//
// Third-party STEP files routinely carry topology that passes a coarse
// `BRepCheck_Analyzer` but breaks downstream consumers: split coplanar faces
// from re-exported booleans, duplicate faces left by a translator, and
// adjacent same-surface patches that tessellate into non-manifold edges
// (an edge shared by four triangles). The official CADGenBench validity gate
// rejects exactly that last class even though the solid is watertight, so a
// model that imports and renders fine can still be un-submittable.
//
// Two repair layers run here:
//
// 1. `ShapeUpgrade_UnifySameDomain` merges adjacent faces that lie on the same
//    surface and merges their edges. On a re-exported part this collapses the
//    split/duplicate patches back into one face, which removes the coincident
//    triangles that produced the four-triangle edge. It does not move geometry.
//
// 2. When the import carries a face that is invalid on its own, unification
//    cannot repair it. Two reconstruction strategies are used instead:
//
//    - A planar bow-tie face is split along a chord between two of its wire
//      vertices. Both halves must be valid and stay inside the original face's
//      extent. A bow-tie reports a signed area, so the halves' areas do not add
//      up geometrically and cannot be used as the acceptance test.
//    - A pinched non-planar face is excised locally: pairs of its edges that
//      touch (or come within 0.05 mm) mark the pinch. Each touch cluster is
//      removed with a small axis-aligned box cut, ordered largest cluster
//      first so the boolean always runs on a stabilised shape. A duplicate
//      face pair (identical bounding box, one patch far smaller) is cut the
//      same way. The cuts remove only the degenerate sliver; the resulting
//      notch is a clean transversal face and the solid stays watertight.
//
//    After those cuts the shape can still carry a triangulation defect that
//    `BRepCheck_Analyzer` cannot see (a face whose mesh boundary does not
//    follow its own edge polygons). The mesh pass finds exactly that: boundary
//    segments of a face's triangulation that are not covered by any of the
//    face's edge polygons. The gap is excised with the same local box cut.
//
// The per-face scan runs only when the whole-shape check fails, so a healthy
// import pays one `BRepCheck_Analyzer` pass and the unification attempt. Any
// OCCT throw, missing binding, or invalid result returns the untouched import:
// the heal must never make an import worse.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

import * as replicad from 'replicad';
import { getOC } from 'replicad';

import { buildSolid, chordRepair } from './healStepChord';
import {
  duplicateBounds,
  duplicateNotchBoxes,
  meshGapNotchBoxes,
  notchBox,
  pinchNotchBoxes,
  clusterPoints,
  shareEndpoint,
} from './healStepNotch';
import {
  areaOf,
  boundsOf,
  cutBox,
  debug,
  distanceSq,
  facesOf,
  isPlanar,
  isValid,
  pointsBounds,
  type Bounds,
  type OcctHealApi,
} from './healStepOcct';
import {
  LARGE_FACE_UNIFY,
  largeFaceUnifyDecision,
  maxSameDomainCluster,
} from './healStepSameDomain';

export interface StepHealResult {
  /** Shape to hand to the backend: repaired/unified when the heal succeeded, otherwise the input. */
  shape: replicad.Shape3D;
  /** True when same-domain unification produced a valid replacement. */
  unified: boolean;
  /** True when invalid-topology reconstruction replaced the import. */
  repaired?: boolean;
}

/**
 * Face unification is only attempted on imports up to this many faces.
 *
 * `ShapeUpgrade_UnifySameDomain` with `UnifyFaces=true` has pathological runtime
 * on some large B-spline-heavy solids in the OCCT wasm build: the 206 fixture
 * (637 faces, already gate-valid) did not finish in five minutes, while native
 * OCCT does it in under 0.1 s. Edge unification on the same shape finishes in
 * milliseconds. Large valid imports keep their same-domain patches — that does
 * not move geometry or break watertightness — instead of stalling the import.
 */
const MAX_FACE_UNIFY = 256;

/**
 * Normalize an imported STEP solid by merging same-domain faces/edges and, when
 * the file carries an invalid face, by reconstructing the defective topology.
 *
 * Safe by construction: any OCCT throw, a missing binding, or an invalid
 * repaired result returns the original shape with `unified: false`.
 */
export function healImportedStep(shape: replicad.Shape3D): StepHealResult {
  let oc: OcctHealApi;
  try {
    oc = getOC() as unknown as OcctHealApi;
  } catch {
    return { shape, unified: false };
  }
  if (
    typeof oc?.ShapeUpgrade_UnifySameDomain_2 !== 'function' ||
    typeof oc?.BRepCheck_Analyzer !== 'function'
  ) {
    return { shape, unified: false };
  }

  // The reconstruction path needs the boolean/topology bindings. A build that
  // only exposes unification keeps the historical behaviour.
  if (!canReconstruct(oc)) return unifyOnly(oc, shape);

  // A healthy solid needs no reconstruction; one whole-shape check is enough
  // to keep the common import path cheap.
  try {
    if (isValid(oc, shape.wrapped)) return unifyOnly(oc, shape);
  } catch {
    return unifyOnly(oc, shape);
  }

  try {
    const result = reconstruct(oc, shape);
    if (result) return result;
  } catch (error) {
    debug('reconstruct threw', error instanceof Error ? error.message : String(error));
    // fall through to the conservative path
  }
  return unifyOnly(oc, shape);
}

function canReconstruct(oc: OcctHealApi): boolean {
  const required = [
    'TopExp_Explorer_2',
    'TopoDS_Builder',
    'TopoDS_Shell',
    'TopoDS_Solid',
    'BRepAdaptor_Curve_2',
    'BRepAdaptor_Surface_2',
    'BRepExtrema_DistShapeShape_1',
    'BRepPrimAPI_MakeBox_4',
    'BRepAlgoAPI_Cut_3',
    'BRepBuilderAPI_MakeEdge_3',
    'BRepBuilderAPI_MakeWire_1',
    'BRepBuilderAPI_MakeFace_15',
    'BRepBuilderAPI_Sewing',
    'Bnd_Box_1',
    'BRepBndLib',
    'BRepGProp',
    'GProp_GProps_1',
    'gp_Pnt_3',
    'Message_ProgressRange_1',
    'TopLoc_Location_1',
    'TopoDS',
    'BRepMesh_IncrementalMesh_2',
    'BRep_Tool',
  ];
  if (!required.every((name) => name in oc)) {
    debug('missing bindings', required.filter((name) => !(name in oc)));
    return false;
  }
  if (
    typeof oc.TopoDS?.Face_1 !== 'function' ||
    typeof oc.TopoDS?.Edge_1 !== 'function' ||
    typeof oc.TopoDS?.Shell_1 !== 'function'
  ) {
    debug('missing TopoDS casts', {
      face: typeof oc.TopoDS?.Face_1,
      edge: typeof oc.TopoDS?.Edge_1,
      shell: typeof oc.TopoDS?.Shell_1,
    });
    return false;
  }
  return true;
}

function unifyOnly(oc: OcctHealApi, shape: replicad.Shape3D): StepHealResult {
  let unify: InstanceType<OcctHealApi['ShapeUpgrade_UnifySameDomain_2']> | undefined;
  let analyzer: InstanceType<OcctHealApi['BRepCheck_Analyzer']> | undefined;
  try {
    const faces = shape.faces.length;
    const unifyFaces = faces <= MAX_FACE_UNIFY || shouldFaceUnifyLargeImport(oc, shape);
    debug('unify', { faces, unifyFaces });
    unify = new oc.ShapeUpgrade_UnifySameDomain_2(shape.wrapped, true, unifyFaces, false);
    unify.Build();
    const unified = unify.Shape();
    analyzer = new oc.BRepCheck_Analyzer(unified, true, true);
    if (!analyzer.IsValid_2()) return { shape, unified: false };
    const cast = replicad.cast(unified as never) as replicad.Shape3D;
    return { shape: cast, unified: true };
  } catch (error) {
    debug('unify threw', error instanceof Error ? error.message : String(error));
    return { shape, unified: false };
  } finally {
    analyzer?.delete();
    unify?.delete();
  }
}

function shouldFaceUnifyLargeImport(oc: OcctHealApi, original: replicad.Shape3D): boolean {
  if (original.faces.length <= LARGE_FACE_UNIFY) return false;
  try {
    if (!isValid(oc, original.wrapped)) return false;
    const cluster = maxSameDomainCluster(
      oc,
      () => (replicad.cast(original.wrapped as never) as replicad.Shape3D).faces,
    );
    debug('large face unify', { faces: original.faces.length, cluster });
    return largeFaceUnifyDecision(original.faces.length, true, cluster);
  } catch (error) {
    debug('large face unify check threw', error instanceof Error ? error.message : String(error));
    return false;
  }
}

interface StageResult {
  shape: any;
  changed: boolean;
}

/** Apply each notch cut in order; a failed cut leaves the shape unchanged. */
function applyCuts(oc: OcctHealApi, shape: any, boxes: Bounds[], label: string): StageResult {
  let current = shape;
  let changed = false;
  for (const box of boxes) {
    const cut = cutBox(oc, current, box);
    debug(`${label} cut`, Boolean(cut));
    if (cut) {
      current = cut;
      changed = true;
    }
  }
  return { shape: current, changed };
}

/** Planar bow-tie faces: split along a chord that preserves the area. */
function repairBowTies(oc: OcctHealApi, shape: any): StageResult {
  let current = shape;
  let changed = false;
  for (let guard = 0; guard < 4; guard++) {
    const faces = facesOf(oc, current);
    const target = faces.find((face) => !isValid(oc, face) && isPlanar(oc, face));
    if (!target) break;
    debug('chord target', boundsOf(oc, target), areaOf(oc, target));
    const replacement = chordRepair(oc, target);
    debug('chord replacement', Boolean(replacement));
    if (!replacement) break;
    const rebuilt = buildSolid(
      oc,
      faces.filter((face) => !face.IsSame(target)).concat(replacement),
    );
    debug('chord solid', Boolean(rebuilt));
    if (!rebuilt) break;
    current = rebuilt;
    changed = true;
  }
  return { shape: current, changed };
}

/** Notch boxes for every pinch cluster of the remaining invalid non-planar faces. */
function pinchBoxesOf(oc: OcctHealApi, shape: any): Bounds[] {
  const remainingInvalid = facesOf(oc, shape).filter((face) => !isValid(oc, face));
  const pinchBoxes: Bounds[] = [];
  for (const face of remainingInvalid) {
    if (isPlanar(oc, face)) continue;
    pinchBoxes.push(...pinchNotchBoxes(oc, face));
  }
  debug('pinch boxes', pinchBoxes.length, pinchBoxes);
  return pinchBoxes;
}

function reconstruct(oc: OcctHealApi, shape: replicad.Shape3D): StepHealResult | null {
  let current: any = shape.wrapped;

  const initialFaces = facesOf(oc, current);
  const initialInvalid = initialFaces.filter((face) => !isValid(oc, face));
  debug('start', {
    faces: initialFaces.length,
    invalid: initialInvalid.length,
    planar: initialInvalid.filter((face) => isPlanar(oc, face)).length,
  });

  // 1. Planar bow-tie faces: split along a chord that preserves the area.
  const bowTies = repairBowTies(oc, current);
  current = bowTies.shape;

  // 2. Pinched non-planar faces: excise each touch cluster.
  const pinches = applyCuts(oc, current, pinchBoxesOf(oc, current), 'pinch');
  current = pinches.shape;
  const changed = bowTies.changed || pinches.changed;

  // 3. Duplicate face pairs left by a translator (identical bounds, one patch
  //    far smaller): the small patch lies on top of the larger one and meshes
  //    into a four-triangle edge.
  if (changed && facesOf(oc, current).every((face) => isValid(oc, face))) {
    const duplicates = duplicateNotchBoxes(oc, current);
    debug('duplicate boxes', duplicates.length, duplicates);
    current = applyCuts(oc, current, duplicates, 'duplicate').shape;
  }

  // 4. Mesh gaps: a face whose triangulation boundary is not covered by its
  //    own edge polygons leaves an open mesh even though the B-rep is valid.
  if (changed) {
    const gaps = meshGapNotchBoxes(oc, current);
    debug('mesh gap boxes', gaps.length, gaps);
    current = applyCuts(oc, current, gaps, 'mesh gap').shape;
  }

  debug('final', { changed, valid: isValid(oc, current) });
  if (!changed) return null;
  if (!isValid(oc, current)) return null;
  return {
    shape: replicad.cast(current as never) as replicad.Shape3D,
    unified: false,
    repaired: true,
  };
}

/**
 * Pure geometry rules used by the reconstruction. Exposed for regression
 * tests only; the OCCT-facing flow above is the public entry point.
 */
export const __healTest = {
  clusterPoints,
  pointsBounds,
  notchBox,
  duplicateBounds,
  shareEndpoint,
  distanceSq,
  largeFaceUnifyDecision,
};
