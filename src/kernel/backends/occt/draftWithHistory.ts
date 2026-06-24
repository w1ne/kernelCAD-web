// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * NURBS Slice E Task 7: direct-OCCT draft (face taper) with history capture.
 *
 * Mirrors the `shellWithHistory` family in `historyAwareEdgeFeatures.ts`:
 * we bypass Replicad (which has no draft primitive) and drive
 * `BRepOffsetAPI_DraftAngle` straight on the underlying TopoDS_Shape, reading
 * face/edge evolution history off the builder before it is discarded.
 *
 * `BRepOffsetAPI_DraftAngle.Add(F, Direction, Angle, NeutralPlane, Flag)` tapers
 * face `F` about its intersection with `NeutralPlane`. The taper rotates `F` by
 * `Angle` (RADIANS) about that parting line; `Direction` is the demoulding /
 * pull direction. The parting line (where `F` meets the neutral plane) stays
 * fixed, so a positive angle with the neutral plane at the top of a box and pull
 * +Z draws the side faces inward toward the base — the classic mould taper.
 *
 * Pinned to replicad@0.20.5 — relies on `body.getReplicadShape().wrapped` to
 * reach the underlying TopoDS_Shape, identical to the edge-feature helpers.
 */

import { getOC } from 'replicad';
import type { OcctBackend } from './occtBackend';
import type { FaceHash, EdgeHash } from '../../naming/evolutionRecord';
import type { EdgeFeatureHistoryResult } from './historyAwareEdgeFeatures';

const HASH_UPPER = 2147483647; // INT32_MAX, safe upper bound for OCCT HashCode

export interface FaceRefForDrafting {
  /** Hash of the input face (from `body.faceHashes()`). */
  hash: FaceHash;
}

/**
 * Geometry of the neutral (parting) plane. The plane is anchored at `point`
 * with normal `normal`; the target faces taper about their intersection with it.
 */
export interface NeutralPlaneSpec {
  point: readonly [number, number, number];
  normal: readonly [number, number, number];
}

/**
 * Read a TopTools_ListOfShape into an array of hex hash strings.
 * Copy + destructive iterate (the STL iterator template is unbound in WASM),
 * matching `listToHashStrings` in historyAwareEdgeFeatures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listToHashStrings(oc: any, list: any): string[] {
  const result: string[] = [];
  const copy = new oc.TopTools_ListOfShape_3(list);
  try {
    while (!copy.IsEmpty()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.push((copy.First_1() as any).HashCode(HASH_UPPER).toString(16));
      copy.RemoveFirst();
    }
  } finally {
    copy.delete();
  }
  return result;
}

/**
 * Enumerate all faces (or edges) of `bodyShape`, query the builder for
 * Modified, and populate the history map. BRepOffsetAPI_DraftAngle does not
 * expose IsDeleted on its public surface in the WASM binding, so the deleted
 * sets stay empty — draft modifies faces in place and never removes input
 * faces (a tapered side face is a modified, not deleted, face).
 */
function enumerateAndRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  bodyShape: unknown,
  typeEnum: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  history: Map<string, string[]>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const explorer = new oc.TopExp_Explorer_2(bodyShape, typeEnum as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (explorer.More()) {
      const sub = explorer.Current();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputHash = (sub as any).HashCode(HASH_UPPER).toString(16);
      const modified = builder.Modified(sub);
      try {
        const modifiedHashes = listToHashStrings(oc, modified);
        if (modifiedHashes.length > 0) {
          history.set(inputHash, modifiedHashes);
        }
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (modified as any).delete();
      }
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
}

/**
 * Taper the specified faces of `body` by `angleRad` (RADIANS) about their
 * intersection with the neutral plane, pulling along `pullDir`. Captures
 * face/edge evolution history from `BRepOffsetAPI_DraftAngle`.
 *
 * @param body     The base solid to draft.
 * @param faces    Faces to taper, by underlying TopoDS_Face hash.
 * @param angleRad Taper angle in RADIANS (caller converts from the deg param).
 * @param pullDir  Demoulding direction [x, y, z] (need not be unit length).
 * @param neutral  Neutral (parting) plane the faces taper about.
 * @throws {Error} If no requested face hash is found on the body.
 * @throws {Error} If the draft builder fails (IsDone() === false).
 */
export function draftWithHistory(
  body: OcctBackend,
  faces: readonly FaceRefForDrafting[],
  angleRad: number,
  pullDir: readonly [number, number, number],
  neutral: NeutralPlaneSpec,
): EdgeFeatureHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
  if (!bodyShape) {
    throw new Error('draftWithHistory: could not access .wrapped on body shape');
  }

  const builder = new oc.BRepOffsetAPI_DraftAngle_2(bodyShape);
  const dir = new oc.gp_Dir_4(pullDir[0], pullDir[1], pullDir[2]);
  const planeNormal = new oc.gp_Dir_4(neutral.normal[0], neutral.normal[1], neutral.normal[2]);
  const planeOrigin = new oc.gp_Pnt_3(neutral.point[0], neutral.point[1], neutral.point[2]);
  const neutralPlane = new oc.gp_Pln_3(planeOrigin, planeNormal);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = new (oc as any).Message_ProgressRange_1();

  const hashSet = new Set(faces.map(f => f.hash));
  let added = 0;
  const faceExplorer = new oc.TopExp_Explorer_2(
    bodyShape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (faceExplorer.More()) {
      const f = faceExplorer.Current();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (hashSet.has((f as any).HashCode(HASH_UPPER).toString(16))) {
        // Downcast TopoDS_Shape → TopoDS_Face for Add(); Current() returns the base type.
        const face = oc.TopoDS.Face_1(f);
        // Flag = true: the angle is measured from the pull direction (additive taper).
        builder.Add(face, dir, angleRad, neutralPlane, true);
        added++;
      }
      faceExplorer.Next();
    }
  } finally {
    faceExplorer.delete();
  }

  try {
    if (added === 0) {
      throw new Error(
        `draftWithHistory: none of the ${faces.length} requested face hash(es) found on body`,
      );
    }
    builder.Build(progress);
    if (!builder.IsDone()) {
      throw new Error(
        `draftWithHistory: BRepOffsetAPI_DraftAngle failed (angle ${angleRad} rad, ${added} face(s))`,
      );
    }
    const resultShape = builder.Shape();

    const faceHistory = new Map<FaceHash, FaceHash[]>();
    const edgeHistory = new Map<EdgeHash, EdgeHash[]>();
    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, builder, faceHistory);
    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, builder, edgeHistory);

    return {
      shape: resultShape,
      faceHistory,
      edgeHistory,
      deletedFaces: new Set<FaceHash>(),
      deletedEdges: new Set<EdgeHash>(),
    };
  } finally {
    builder.delete();
    progress.delete();
    dir.delete();
    planeNormal.delete();
    planeOrigin.delete();
    neutralPlane.delete();
  }
}
