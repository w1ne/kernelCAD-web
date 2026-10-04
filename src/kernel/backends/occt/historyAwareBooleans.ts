// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

/** Minimal structural view of a BRepAlgoAPI_* builder's status accessors. */
interface BooleanBuilderStatus {
  IsDone(): boolean;
  /** Not exposed by every OCCT binding — optional. */
  HasErrors?(): boolean;
}

/**
 * Assert a BRepAlgoAPI_* boolean actually succeeded before its result is
 * trusted. A degenerate boolean (coplanar/tangent tool faces, a tool that
 * misses the body) can leave the builder with `IsDone()==false` /
 * `HasErrors()==true` while `Shape()` still returns the UNMODIFIED body —
 * so reading the result without this check reports a no-op as a successful
 * operation. Throwing here surfaces the failure as a lowering diagnostic
 * (the lowerers catch exceptions into `recompute.lowering.exception`) instead
 * of silently-unchanged geometry.
 */
export function assertBooleanSucceeded(builder: BooleanBuilderStatus, op: string): void {
  if (!builder.IsDone()) {
    throw new Error(`historyAwareBooleans: ${op} boolean did not complete (IsDone()==false) — result would be the unmodified input shape.`);
  }
  if (typeof builder.HasErrors === 'function' && builder.HasErrors()) {
    throw new Error(`historyAwareBooleans: ${op} boolean reported errors (HasErrors()==true) — result is not trustworthy.`);
  }
}

/**
 * Count of OCCT boolean builds run through this module. A cheap, deterministic
 * cost probe: tests assert how many booleans a feature costs instead of timing
 * it (wall-clock tests are flaky; a boolean count is not).
 */
export const booleanBuildStats = { builds: 0 };

type BooleanOp = 'cut' | 'fuse' | 'intersect';

/** Default-constructed builder per op. The shape-taking constructors
 *  (`BRepAlgoAPI_Fuse_3(a, b, progress)` etc.) already RUN the boolean, so
 *  calling `Build()` on them afterwards computes the whole thing a second
 *  time. We build exactly once. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function newBuilder(o: any, op: BooleanOp): any {
  switch (op) {
    case 'cut': return new o.BRepAlgoAPI_Cut_1();
    case 'fuse': return new o.BRepAlgoAPI_Fuse_1();
    case 'intersect': return new o.BRepAlgoAPI_Common_1();
  }
}

/**
 * Run ONE BRepAlgoAPI_* boolean of `body` against every shape in `tools` and
 * return the shape + the history of every input.
 * Core for cutWithHistory/fuseWithHistory/intersectWithHistory/fuseManyWithHistory.
 */
function runBooleanWithHistory(
  body: OcctBackend,
  tools: readonly OcctBackend[],
  op: BooleanOp,
): BooleanHistoryResult {
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  // Access the underlying TopoDS_Shape via the public getReplicadShape() accessor,
  // then read the .wrapped property which is the OCCT TopoDS_Shape handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedOf = (b: OcctBackend): unknown => (b.getReplicadShape() as any).wrapped;
  const bodyShape = wrappedOf(body);
  const toolShapes = tools.map(wrappedOf);
  if (!bodyShape || toolShapes.length === 0 || toolShapes.some((t) => !t)) {
    throw new Error('historyAwareBooleans: could not access .wrapped on input shape');
  }
  const progress = new o.Message_ProgressRange_1();
  const args = new o.TopTools_ListOfShape_1();
  const toolList = new o.TopTools_ListOfShape_1();
  const builder = newBuilder(o, op);
  try {
    args.Append_1(bodyShape);
    for (const t of toolShapes) toolList.Append_1(t);
    builder.SetArguments(args);
    builder.SetTools(toolList);
    builder.SetToFillHistory(true);
    booleanBuildStats.builds += 1;
    builder.Build(progress);
    // Verify the boolean actually completed before trusting Shape(): a degenerate
    // op can leave IsDone()==false while Shape() returns the unmodified body.
    assertBooleanSucceeded(builder, op);
    // INTENTIONALLY skip builder.SimplifyResult() to preserve history accuracy.
    const resultShape = builder.Shape();
    return { shape: resultShape, ...readBuilderHistory(oc, builder, [bodyShape, ...toolShapes]) };
  } finally {
    builder.delete();
    toolList.delete();
    args.delete();
    progress.delete();
  }
}

/**
 * Read the face/edge evolution of every input shape from a finished builder:
 * deleted, modified (1 = modified, >1 = split), or absent (unchanged).
 */
function readBuilderHistory(
  oc: ReturnType<typeof getOC>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  inputs: readonly unknown[],
): Omit<BooleanHistoryResult, 'shape'> {
  const faceHistory = new Map<FaceHash, FaceHash[]>();
  const edgeHistory = new Map<EdgeHash, EdgeHash[]>();
  const deletedFaces = new Set<FaceHash>();
  const deletedEdges = new Set<EdgeHash>();

  const record = (
    inputHash: string,
    inputSub: unknown,
    history: Map<string, string[]>,
    deleted: Set<string>,
  ) => {
    if (builder.IsDeleted(inputSub)) {
      deleted.add(inputHash);
      return;
    }
    const modified = builder.Modified(inputSub);
    try {
      const modifiedHashes = listToHashes(oc, modified);
      // No entry = unchanged; resolver treats absence as "same hash in output"
      if (modifiedHashes.length > 0) history.set(inputHash, modifiedHashes);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (modified as any).delete();
    }
  };

  // Faces of every input first, then edges — the same order the two-shape
  // path always used (body faces, tool faces, body edges, tool edges).
  for (const shapeType of ['face', 'edge'] as const) {
    const history = shapeType === 'face' ? faceHistory : edgeHistory;
    const deleted = shapeType === 'face' ? deletedFaces : deletedEdges;
    for (const input of inputs) {
      const { hashes, subshapes } = collectSubshapeHashes(oc, input, shapeType);
      for (let i = 0; i < hashes.length; i++) record(hashes[i], subshapes[i], history, deleted);
    }
  }
  return { faceHistory, edgeHistory, deletedFaces, deletedEdges };
}

/**
 * Fuse `body` with every shape in `tools` in ONE general-fuse build and return
 * the shape + history of all inputs.
 *
 * Why: folding N shapes with N-1 pairwise fuses re-intersects the growing
 * accumulator every step, so the cost grows with N^2. A circular pattern of
 * 36 serration teeth spent >90% of a part's evaluation in those 35 fuses.
 * One build with all tools intersects each pair of inputs once.
 */
export function fuseManyWithHistory(body: OcctBackend, tools: readonly OcctBackend[]): BooleanHistoryResult {
  return runBooleanWithHistory(body, tools, 'fuse');
}

export function cutWithHistory(body: OcctBackend, tool: OcctBackend): BooleanHistoryResult {
  return runBooleanWithHistory(body, [tool], 'cut');
}

export function fuseWithHistory(body: OcctBackend, tool: OcctBackend): BooleanHistoryResult {
  return runBooleanWithHistory(body, [tool], 'fuse');
}

export function intersectWithHistory(body: OcctBackend, tool: OcctBackend): BooleanHistoryResult {
  return runBooleanWithHistory(body, [tool], 'intersect');
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
  return mergeBooleanHistoryMany([bodyMap, toolMap], result);
}

/**
 * {@link mergeBooleanHistory} for a boolean with any number of inputs. Maps are
 * applied in order, so on a shared output face the earliest input's lineage
 * wins — the same result as folding the inputs pairwise.
 */
export function mergeBooleanHistoryMany(
  inputMaps: readonly (HistoryMap | undefined)[],
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
  for (const map of inputMaps) addContribution(map, result.deletedFaces);
  return out;
}
