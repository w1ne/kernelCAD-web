/**
 * Direct-OCCT boolean operation helpers that capture shape evolution history
 * via BRepAlgoAPI_*::Generated/Modified/IsDeleted callbacks.
 *
 * Why not Replicad: Replicad's Shape3D.cut/fuse/intersect (replicad.js:3273+)
 * discard the BRepAlgoAPI_* builder before history can be read. We reconstruct
 * the operation directly on the underlying TopoDS_Shape and read the history
 * before calling delete() on the builder.
 *
 * Trade-off: skip cutter.SimplifyResult() because merging coplanar faces
 * mutates the result topology and invalidates the history maps. Result may
 * have extra coplanar faces; downstream consumers tolerate this.
 *
 * Pinned to replicad@0.20.5 — relies on `body.getReplicadShape()` to reach
 * the underlying TopoDS_Shape via its `.wrapped` accessor.
 */

import { getOC } from 'replicad';
import type { OcctBackend } from './occtBackend';
import type { FaceHash, EdgeHash, HistoryMap } from '../../naming/evolutionRecord';

export interface BooleanHistoryResult {
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

/**
 * Hash a TopoDS_Shape via OCCT's HashCode. Stable within a single WASM session.
 * Returns a hex string.
 */
function shapeHash(_oc: ReturnType<typeof getOC>, shape: unknown): string {
  // OCCT TopoDS_Shape::HashCode(Standard_Integer Upper) — Upper is a hash bound
  // (we use a large prime). Returns Standard_Integer. Convert to hex string.
  const HASH_UPPER = 2147483647;  // INT32_MAX, safe upper bound
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = (shape as any).HashCode(HASH_UPPER);
  return h.toString(16);
}

/**
 * Enumerate faces (or edges) of a shape in TopExp_Explorer order, returning
 * their hashes and subshape handles.
 */
function collectSubshapeHashes(
  oc: ReturnType<typeof getOC>,
  shape: unknown,
  shapeType: 'face' | 'edge',
): { hashes: string[]; subshapes: unknown[] } {
  const enumValue = shapeType === 'face'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (oc as any).TopAbs_ShapeEnum.TopAbs_FACE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : (oc as any).TopAbs_ShapeEnum.TopAbs_EDGE;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const explorer = new (oc as any).TopExp_Explorer_2(
    shape,
    enumValue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (oc as any).TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  const hashes: string[] = [];
  const subshapes: unknown[] = [];
  while (explorer.More()) {
    const sub = explorer.Current();
    hashes.push(shapeHash(oc, sub));
    subshapes.push(sub);
    explorer.Next();
  }
  explorer.delete();
  return { hashes, subshapes };
}

/**
 * Read TopTools_ListOfShape (a list of TopoDS_Shape) into an array of hash strings.
 *
 * The `begin()`/`end()` STL iterator approach used at OCCT 7.x in native C++ is not
 * fully bound in the replicad-opencascadejs WASM module (the NCollection_StlIterator
 * template instantiation for this list type is unregistered). We iterate instead via
 * a copy of the list and `First_1()` + `RemoveFirst()`.
 */
function listToHashes(oc: ReturnType<typeof getOC>, list: unknown): string[] {
  const result: string[] = [];
  // Make a copy so we can destructively iterate without mutating the caller's list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copy = new (oc as any).TopTools_ListOfShape_3(list);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    while (!(copy as any).IsEmpty()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = (copy as any).First_1();
      result.push(shapeHash(oc, s));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (copy as any).RemoveFirst();
    }
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (copy as any).delete();
  }
  return result;
}

/**
 * Run a BRepAlgoAPI_* boolean and return the shape + history maps.
 * Internal core for cutWithHistory/fuseWithHistory/intersectWithHistory.
 */
function runBooleanWithHistory(
  body: OcctBackend,
  tool: OcctBackend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderClass: any,
): BooleanHistoryResult {
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = new (oc as any).Message_ProgressRange_1();
  // Access the underlying TopoDS_Shape via the public getReplicadShape() accessor,
  // then read the .wrapped property which is the OCCT TopoDS_Shape handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolShape = (tool.getReplicadShape() as any).wrapped;
  if (!bodyShape || !toolShape) {
    throw new Error('historyAwareBooleans: could not access .wrapped on input shape');
  }
  const builder = new builderClass(bodyShape, toolShape, progress);
  builder.SetToFillHistory(true);
  builder.Build(progress);
  // INTENTIONALLY skip builder.SimplifyResult() to preserve history accuracy.
  const resultShape = builder.Shape();

  // Enumerate input faces of body and tool, query builder.Modified/Generated/IsDeleted
  const { hashes: bodyFaceHashes, subshapes: bodyFaceSubs } = collectSubshapeHashes(oc, bodyShape, 'face');
  const { hashes: toolFaceHashes, subshapes: toolFaceSubs } = collectSubshapeHashes(oc, toolShape, 'face');
  const { hashes: bodyEdgeHashes, subshapes: bodyEdgeSubs } = collectSubshapeHashes(oc, bodyShape, 'edge');
  const { hashes: toolEdgeHashes, subshapes: toolEdgeSubs } = collectSubshapeHashes(oc, toolShape, 'edge');

  const faceHistory = new Map<FaceHash, FaceHash[]>();
  const edgeHistory = new Map<EdgeHash, EdgeHash[]>();
  const deletedFaces = new Set<FaceHash>();
  const deletedEdges = new Set<EdgeHash>();

  const recordFace = (inputHash: string, inputSub: unknown) => {
    if (builder.IsDeleted(inputSub)) {
      deletedFaces.add(inputHash);
      return;
    }
    const modified = builder.Modified(inputSub);
    try {
      const modifiedHashes = listToHashes(oc, modified);
      if (modifiedHashes.length > 0) {
        faceHistory.set(inputHash, modifiedHashes);
      }
      // No entry = unchanged; resolver treats absence as "same hash in output"
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (modified as any).delete();
    }
  };
  const recordEdge = (inputHash: string, inputSub: unknown) => {
    if (builder.IsDeleted(inputSub)) {
      deletedEdges.add(inputHash);
      return;
    }
    const modified = builder.Modified(inputSub);
    try {
      const modifiedHashes = listToHashes(oc, modified);
      if (modifiedHashes.length > 0) {
        edgeHistory.set(inputHash, modifiedHashes);
      }
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (modified as any).delete();
    }
  };

  for (let i = 0; i < bodyFaceHashes.length; i++) recordFace(bodyFaceHashes[i], bodyFaceSubs[i]);
  for (let i = 0; i < toolFaceHashes.length; i++) recordFace(toolFaceHashes[i], toolFaceSubs[i]);
  for (let i = 0; i < bodyEdgeHashes.length; i++) recordEdge(bodyEdgeHashes[i], bodyEdgeSubs[i]);
  for (let i = 0; i < toolEdgeHashes.length; i++) recordEdge(toolEdgeHashes[i], toolEdgeSubs[i]);

  builder.delete();
  progress.delete();

  return { shape: resultShape, faceHistory, edgeHistory, deletedFaces, deletedEdges };
}

export function cutWithHistory(body: OcctBackend, tool: OcctBackend): BooleanHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runBooleanWithHistory(body, tool, (getOC() as any).BRepAlgoAPI_Cut_3);
}

export function fuseWithHistory(body: OcctBackend, tool: OcctBackend): BooleanHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runBooleanWithHistory(body, tool, (getOC() as any).BRepAlgoAPI_Fuse_3);
}

export function intersectWithHistory(body: OcctBackend, tool: OcctBackend): BooleanHistoryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runBooleanWithHistory(body, tool, (getOC() as any).BRepAlgoAPI_Common_3);
}

/**
 * Merge two input HistoryMaps with the OCCT history of a boolean operation.
 *
 * - Skip entries whose input hash is in deletedFaces.
 * - For each input face: if it has children in result.faceHistory, copy lineage
 *   to each child hash. If no entry exists, the face is unchanged — copy lineage
 *   to the same hash in output.
 * - When multiple input lineages map to the same child hash, keep the first
 *   (lineages with the same canonicalName are equivalent for resolver purposes).
 */
export function mergeBooleanHistory(
  bodyMap: HistoryMap | undefined,
  toolMap: HistoryMap | undefined,
  result: BooleanHistoryResult,
): HistoryMap {
  const out: HistoryMap = new Map();
  const addContribution = (
    inputMap: HistoryMap | undefined,
    deletedSet: Set<FaceHash>,
  ) => {
    if (!inputMap) return;
    for (const [inputHash, lineage] of inputMap.entries()) {
      if (deletedSet.has(inputHash)) continue;
      const children = result.faceHistory.get(inputHash);
      if (children && children.length > 0) {
        for (const childHash of children) {
          if (!out.has(childHash)) out.set(childHash, lineage);
        }
      } else {
        // No history entry → face unchanged → same hash in output
        if (!out.has(inputHash)) out.set(inputHash, lineage);
      }
    }
  };
  addContribution(bodyMap, result.deletedFaces);
  addContribution(toolMap, result.deletedFaces);
  return out;
}
