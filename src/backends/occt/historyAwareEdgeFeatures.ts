/**
 * Direct-OCCT edge-feature helpers with history capture.
 * Same pattern as historyAwareBooleans: bypass Replicad to read
 * BRepFilletAPI_MakeFillet / BRepFilletAPI_MakeChamfer history before
 * the builder is discarded.
 *
 * Why not Replicad: Replicad's Shape3D.fillet/chamfer/shell discard
 * the underlying builder before history can be read. We reconstruct
 * the operation directly on the underlying TopoDS_Shape and read the
 * history before calling delete() on the builder.
 *
 * Pinned to replicad@0.20.5 — relies on `body.getReplicadShape()` to reach
 * the underlying TopoDS_Shape via its `.wrapped` accessor.
 */

import { getOC } from 'replicad';
import type { OcctBackend } from './occtBackend';
import type { FaceHash, EdgeHash } from '../../naming/evolutionRecord';

export interface EdgeFeatureHistoryResult {
  /** The result TopoDS_Shape, ready to wrap in a new OcctBackend. */
  shape: unknown;  // TopoDS_Shape — opaque OCCT handle
  /** For each input face hash: its corresponding output face hashes (1 = modified, >1 = split). */
  faceHistory: Map<FaceHash, FaceHash[]>;
  /** Same for edges. */
  edgeHistory: Map<EdgeHash, EdgeHash[]>;
  /** Input face hashes that were entirely removed by the operation. */
  deletedFaces: Set<FaceHash>;
  /** Input edge hashes that were entirely removed. */
  deletedEdges: Set<EdgeHash>;
}

export interface EdgeRefForFilleting {
  /** Hash of the input edge (from `body.edgeHashes()`). */
  hash: EdgeHash;
}

const HASH_UPPER = 2147483647;  // INT32_MAX, safe upper bound for OCCT HashCode

/**
 * Internal helper: re-resolve an edge hash to its TopoDS_Edge subshape on a body.
 * Enumerates edges via TopExp_Explorer_2; returns the first match.
 * Cleans up the explorer via try/finally.
 */
function findEdgeByHash(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  bodyShape: unknown,
  hash: EdgeHash,
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const explorer = new oc.TopExp_Explorer_2(
    bodyShape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let found: unknown = null;
  try {
    while (explorer.More()) {
      const e = explorer.Current();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any).HashCode(HASH_UPPER).toString(16) === hash) {
        // Downcast from TopoDS_Shape to TopoDS_Edge — required by BRepFilletAPI_MakeFillet::Add_2
        // and BRepFilletAPI_MakeChamfer::Add_2. TopExp_Explorer.Current() returns the generic
        // TopoDS_Shape base; OCCT's binding requires the concrete subtype.
        found = oc.TopoDS.Edge_1(e);
        break;
      }
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  if (!found) throw new Error(`historyAwareEdgeFeatures: edge hash ${hash} not found on body`);
  return found;
}

/**
 * Read a TopTools_ListOfShape into an array of hex hash strings.
 *
 * The `begin()`/`end()` STL iterator approach is not bound in the WASM module
 * (the NCollection_StlIterator template instantiation for this list is unregistered).
 * Instead we copy the list and iterate destructively via `First_1()` + `RemoveFirst()`.
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
 * Modified/IsDeleted, and populate the history/deleted maps.
 * Wraps the TopExp_Explorer_2 in try/finally to guarantee cleanup.
 */
function enumerateAndRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  bodyShape: unknown,
  typeEnum: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  history: Map<string, string[]>,
  deleted: Set<string>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const explorer = new oc.TopExp_Explorer_2(bodyShape, typeEnum as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (explorer.More()) {
      const sub = explorer.Current();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputHash = (sub as any).HashCode(HASH_UPPER).toString(16);
      if (builder.IsDeleted(sub)) {
        deleted.add(inputHash);
      } else {
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
      }
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
}

/**
 * Apply a fillet of `radius` to the specified edges of `body`, capturing
 * face/edge evolution history from BRepFilletAPI_MakeFillet.
 *
 * @throws {Error} If any edge hash is not found on the body.
 * @throws {Error} If the fillet builder fails (IsDone() === false).
 */
export function filletWithHistory(
  body: OcctBackend,
  edges: readonly EdgeRefForFilleting[],
  radius: number,
): EdgeFeatureHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // Access the underlying TopoDS_Shape via the public getReplicadShape() accessor,
  // then read the .wrapped property which is the OCCT TopoDS_Shape handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
  if (!bodyShape) {
    throw new Error('historyAwareEdgeFeatures: could not access .wrapped on body shape');
  }

  const builder = new oc.BRepFilletAPI_MakeFillet(bodyShape, oc.ChFi3d_FilletShape.ChFi3d_Rational);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = new (oc as any).Message_ProgressRange_1();
  try {
    for (const e of edges) {
      const edgeShape = findEdgeByHash(oc, bodyShape, e.hash);
      builder.Add_2(radius, edgeShape);
    }
    builder.Build(progress);
    if (!builder.IsDone()) {
      throw new Error(
        `filletWithHistory: BRepFilletAPI_MakeFillet failed (radius ${radius}, ${edges.length} edges)`,
      );
    }
    const resultShape = builder.Shape();

    const faceHistory = new Map<FaceHash, FaceHash[]>();
    const edgeHistory = new Map<EdgeHash, EdgeHash[]>();
    const deletedFaces = new Set<FaceHash>();
    const deletedEdges = new Set<EdgeHash>();

    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, builder, faceHistory, deletedFaces);
    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, builder, edgeHistory, deletedEdges);

    return { shape: resultShape, faceHistory, edgeHistory, deletedFaces, deletedEdges };
  } finally {
    builder.delete();
    progress.delete();
  }
}

/**
 * Apply a chamfer of `distance` to the specified edges of `body`, capturing
 * face/edge evolution history from BRepFilletAPI_MakeChamfer.
 *
 * @throws {Error} If any edge hash is not found on the body.
 * @throws {Error} If the chamfer builder fails (IsDone() === false).
 */
export function chamferWithHistory(
  body: OcctBackend,
  edges: readonly EdgeRefForFilleting[],
  distance: number,
): EdgeFeatureHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // Access the underlying TopoDS_Shape via the public getReplicadShape() accessor,
  // then read the .wrapped property which is the OCCT TopoDS_Shape handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
  if (!bodyShape) {
    throw new Error('historyAwareEdgeFeatures: could not access .wrapped on body shape');
  }

  const builder = new oc.BRepFilletAPI_MakeChamfer(bodyShape);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = new (oc as any).Message_ProgressRange_1();
  try {
    for (const e of edges) {
      const edgeShape = findEdgeByHash(oc, bodyShape, e.hash);
      builder.Add_2(distance, edgeShape);
    }
    builder.Build(progress);
    if (!builder.IsDone()) {
      throw new Error(
        `chamferWithHistory: BRepFilletAPI_MakeChamfer failed (distance ${distance}, ${edges.length} edges)`,
      );
    }
    const resultShape = builder.Shape();

    const faceHistory = new Map<FaceHash, FaceHash[]>();
    const edgeHistory = new Map<EdgeHash, EdgeHash[]>();
    const deletedFaces = new Set<FaceHash>();
    const deletedEdges = new Set<EdgeHash>();

    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, builder, faceHistory, deletedFaces);
    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, builder, edgeHistory, deletedEdges);

    return { shape: resultShape, faceHistory, edgeHistory, deletedFaces, deletedEdges };
  } finally {
    builder.delete();
    progress.delete();
  }
}

/**
 * Create a shelled (hollow) version of `body` by removing `facesToRemove` and
 * offsetting all remaining faces inward by `thickness`. Captures face/edge
 * evolution history from BRepOffsetAPI_MakeThickSolid.
 *
 * @throws {Error} If any face hash is not found on the body.
 * @throws {Error} If the shell builder fails (IsDone() === false).
 */
export function shellWithHistory(
  body: OcctBackend,
  facesToRemove: readonly { hash: FaceHash }[],
  thickness: number,
): EdgeFeatureHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // Access the underlying TopoDS_Shape via the public getReplicadShape() accessor,
  // then read the .wrapped property which is the OCCT TopoDS_Shape handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
  if (!bodyShape) {
    throw new Error('historyAwareEdgeFeatures: could not access .wrapped on body shape');
  }

  // Build the TopTools_ListOfShape of faces to remove by enumerating body faces
  // and matching by hash.
  const facesToRemoveList = new oc.TopTools_ListOfShape_1();
  const hashSet = new Set(facesToRemove.map(f => f.hash));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        facesToRemoveList.Append_1(f);
      }
      faceExplorer.Next();
    }
  } finally {
    faceExplorer.delete();
  }

  const builder = new oc.BRepOffsetAPI_MakeThickSolid();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = new (oc as any).Message_ProgressRange_1();
  try {
    builder.MakeThickSolidByJoin(
      bodyShape,
      facesToRemoveList,
      thickness,
      1e-3,
      oc.BRepOffset_Mode.BRepOffset_Skin,
      false,
      false,
      oc.GeomAbs_JoinType.GeomAbs_Arc,
      false,
    );
    builder.Build(progress);
    if (!builder.IsDone()) {
      throw new Error(`shellWithHistory: BRepOffsetAPI_MakeThickSolid failed (thickness ${thickness})`);
    }
    const resultShape = builder.Shape();

    const faceHistory = new Map<FaceHash, FaceHash[]>();
    const edgeHistory = new Map<EdgeHash, EdgeHash[]>();
    const deletedFaces = new Set<FaceHash>();
    const deletedEdges = new Set<EdgeHash>();

    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, builder, faceHistory, deletedFaces);
    enumerateAndRecord(oc, bodyShape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, builder, edgeHistory, deletedEdges);

    return { shape: resultShape, faceHistory, edgeHistory, deletedFaces, deletedEdges };
  } finally {
    facesToRemoveList.delete();
    builder.delete();
    progress.delete();
  }
}
