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
import {
  combinedDiagonal,
  isValidShape,
  isTopologicallyValid,
  plausibleBooleanVolume,
  recoveryPlans,
  rematchSubshapes,
  scaledFuzzyValue,
  shapeFix,
  volumeOf,
  type BooleanAttemptPlan,
  type BooleanStrategy,
} from './booleanRecovery';
import { nearCoincidentGap } from './nearCoincidentFaces';
import { registerOcctResetHook } from './backendInit';

export type { BooleanStrategy } from './booleanRecovery';

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
  /** Which attempt produced the result. `exact` is the historical call; any
   *  other value means the exact boolean failed (or produced an invalid solid)
   *  and a recovery strategy succeeded. Absent on results built elsewhere. */
  strategy?: BooleanStrategy;
  /** Fuzzy value (mm) used by a recovery strategy. */
  fuzzyValue?: number;
  /** True when a ShapeFix pass repaired the recovered result. */
  shapeFixed?: boolean;
  /** Why the exact attempt was rejected (set only for recovered results). */
  exactFailure?: string;
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

export type BooleanOp = 'cut' | 'fuse' | 'intersect';

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

/** Outcome of one boolean attempt. `fallback` carries a finished-but-invalid
 *  exact result so it can still be returned when every retry fails (the
 *  historical behaviour). */
type AttemptOutcome =
  | { ok: true; result: BooleanHistoryResult }
  | { ok: false; error: string; fallback?: BooleanHistoryResult };

const EXACT_PLAN: BooleanAttemptPlan = { strategy: 'exact', fuzzy: 0, glue: false };

/**
 * Run ONE BRepAlgoAPI_* boolean of `body` against every shape in `tools` and
 * return the shape + the history of every input.
 * Core for cutWithHistory/fuseWithHistory/intersectWithHistory and the
 * many-tool fuse/cut forms. NOTE: a many-tool Common computes `a ∩ (b ∪ c)`,
 * not the sequential fold `a ∩ b ∩ c` — the boolean lowerer keeps the fold for
 * intersection for that reason.
 *
 * Recovery ladder (FIX-10): the exact boolean runs first and is returned
 * as-is when it completes cleanly — no extra cost on the happy path. When it
 * fails (`IsDone()==false` / `HasErrors()`) or finishes with warnings AND an
 * invalid solid (the coincident/tangent-face signature), it is retried with a
 * fuzzy value scaled to the operands (1e-5 × bbox diagonal, bounded), then 10×
 * that, then (fuse only) fuzzy + glue. A recovered result must pass BRepCheck
 * — after a ShapeFix pass if needed — and a volume sanity bound. The winning
 * strategy is recorded on the result for the lowerer to surface.
 */
function runBooleanWithHistory(
  body: OcctBackend,
  tools: readonly OcctBackend[],
  op: BooleanOp,
): BooleanHistoryResult {
  // Access the underlying TopoDS_Shape via the public getReplicadShape() accessor,
  // then read the .wrapped property which is the OCCT TopoDS_Shape handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedOf = (b: OcctBackend): unknown => (b.getReplicadShape() as any).wrapped;
  const bodyShape = wrappedOf(body);
  const toolShapes = tools.map(wrappedOf);
  if (!bodyShape || toolShapes.length === 0 || toolShapes.some((t) => !t)) {
    throw new Error('historyAwareBooleans: could not access .wrapped on input shape');
  }
  return booleanShapesWithHistory(bodyShape, toolShapes, op);
}

/**
 * {@link runBooleanWithHistory} on raw TopoDS_Shape handles — for kernel
 * helpers (the shell offset-and-subtract fallback) that work below
 * OcctBackend. Same recovery ladder, same history semantics.
 */
export function booleanShapesWithHistory(
  bodyShape: unknown,
  toolShapes: readonly unknown[],
  op: BooleanOp,
): BooleanHistoryResult {
  const oc = getOC();
  const inputs = [bodyShape, ...toolShapes];
  const merged = mergeNearCoincidentCylinders(oc, op, bodyShape, toolShapes, inputs);
  if (merged) return merged;
  const exact = attemptBoolean(oc, op, inputs, EXACT_PLAN, []);
  const recovered = op === 'fuse' && exact.ok ? recoverLostFuseMaterial(oc, inputs, exact.result.shape) : undefined;
  if (recovered) return recovered;
  if (exact.ok) return (op === 'fuse' && mergeUnmergedFuse(oc, inputs, exact.result)) || exact.result;

  const inputVolumes = inputs.map((s) => volumeOf(oc, s));
  for (const plan of recoveryPlans(op, combinedDiagonal(oc, inputs))) {
    const retry = attemptBoolean(oc, op, inputs, plan, inputVolumes);
    if (retry.ok) {
      // The invalid exact result is no longer the answer of last resort.
      if (exact.fallback) freeShape(exact.fallback.shape);
      return { ...retry.result, exactFailure: exact.error };
    }
  }
  if (exact.fallback) return exact.fallback;
  throw new Error(`${exact.error} Fuzzy-boolean retries (scaled fuzzy value, coarse fuzzy${op === 'fuse' ? ', glue' : ''}) also failed.`);
}

/**
 * A fuse of overlapping or touching operands must return ONE connected body.
 * OCCT's exact general fuse can silently leave a partially merged compound (no
 * warning, valid topology): the usual trigger is a tool that is
 * coincident/tangent to a healed import's cylindrical faces. The compound
 * still passes BRepCheck and the volume stays inside the fuse bounds, so
 * nothing downstream notices until the edit turns out to be a no-op. Retry the
 * fuzzy ladder and keep the first attempt that merges more of the operands;
 * undefined keeps the exact result.
 */
function mergeUnmergedFuse(
  oc: ReturnType<typeof getOC>,
  inputs: readonly unknown[],
  exact: BooleanHistoryResult,
): BooleanHistoryResult | undefined {
  if (!fuseLeftUnmerged(oc, inputs, exact.shape)) return undefined;
  const exactSolids = solidCount(oc, exact.shape);
  const inputVolumes = inputs.map((s) => volumeOf(oc, s));
  for (const plan of recoveryPlans('fuse', combinedDiagonal(oc, inputs))) {
    const retry = attemptBoolean(oc, 'fuse', inputs, plan, inputVolumes);
    if (!retry.ok) continue;
    const retrySolids = solidCount(oc, retry.result.shape);
    if (retrySolids < exactSolids) {
      freeShape(exact.shape);
      return {
        ...retry.result,
        exactFailure: `fuse left ${exactSolids} separate solids; ${plan.strategy} merged them into ${retrySolids}`,
      };
    }
    freeShape(retry.result.shape);
  }
  return undefined;
}

/**
 * A tool cylinder microns off a body cylinder of the same radius gives an
 * exact result that passes BRepCheck but meshes with cracks. Run the boolean
 * with a fuzzy value covering the gap so the two are one surface. Undefined
 * when nothing is near-coincident or that attempt is rejected (the caller
 * then runs the exact ladder).
 */
function mergeNearCoincidentCylinders(
  oc: ReturnType<typeof getOC>,
  op: BooleanOp,
  bodyShape: unknown,
  toolShapes: readonly unknown[],
  inputs: readonly unknown[],
): BooleanHistoryResult | undefined {
  const nearGap = nearCoincidentGap(oc, bodyShape, toolShapes);
  if (nearGap === undefined) return undefined;
  const inputVolumes = inputs.map((s) => volumeOf(oc, s));
  const fuzzy = Math.max(scaledFuzzyValue(combinedDiagonal(oc, inputs)), nearGap * 2);
  const near = attemptBoolean(oc, op, inputs, { strategy: 'fuzzy', fuzzy, glue: false }, inputVolumes);
  if (!near.ok) return undefined;
  if (op === 'fuse' && fuseLostMaterial(oc, inputs, near.result.shape)) {
    freeShape(near.result.shape);
    return undefined;
  }
  return {
    ...near.result,
    exactFailure: `a tool cylinder is ${nearGap.toPrecision(2)} mm off a body cylinder of the same radius (the same cylinder up to rounding); ` +
      'the exact boolean leaves cracks there, so the two were merged as one surface',
  };
}

/**
 * A union can never be smaller than its largest operand. OCCT's exact fuse of
 * a healed import with a near-concentric filleted tool returned an EMPTY shape
 * with no warning, which then exported as an empty STEP (CADGenBench 248).
 * When the exact result lost material, free it and retry the fuzzy ladder;
 * throw if no retry is plausible instead of handing on a body that lost
 * material. Undefined when the exact result is fine.
 */
function recoverLostFuseMaterial(
  oc: ReturnType<typeof getOC>,
  inputs: readonly unknown[],
  exactShape: unknown,
): BooleanHistoryResult | undefined {
  const lost = fuseLostMaterial(oc, inputs, exactShape);
  if (!lost) return undefined;
  freeShape(exactShape);
  const inputVolumes = inputs.map((s) => volumeOf(oc, s));
  const shortfall = `the result (${lost.resultVolume.toPrecision(6)} mm³) is smaller than its largest operand (${lost.largestSolid.toPrecision(6)} mm³)`;
  for (const plan of recoveryPlans('fuse', combinedDiagonal(oc, inputs))) {
    const retry = attemptBoolean(oc, 'fuse', inputs, plan, inputVolumes);
    if (retry.ok && !fuseLostMaterial(oc, inputs, retry.result.shape)) {
      return { ...retry.result, exactFailure: `exact fuse lost material: ${shortfall}` };
    }
    if (retry.ok) freeShape(retry.result.shape);
  }
  throw new Error(
    `historyAwareBooleans: fuse lost material — ${shortfall}, and the fuzzy retries did not produce a plausible union. ` +
      'The usual cause is a tool face a few hundredths of a millimetre from, and concentric with, a body face: offset it by 0.1 mm or more, or let it overlap clearly.',
  );
}

/** Solids in a shape (1 for a plain solid, N for a compound). */
function solidCount(oc: ReturnType<typeof getOC>, shape: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  let n = 0;
  const exp = new o.TopExp_Explorer_2(shape, o.TopAbs_ShapeEnum.TopAbs_SOLID, o.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (exp.More()) {
      n++;
      exp.Next();
    }
  } finally {
    exp.delete();
  }
  return n;
}

/** True when two operand boxes overlap or touch on every axis. */
function boxesTouch(oc: ReturnType<typeof getOC>, a: unknown, b: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  const box = (shape: unknown) => {
    const bnd = new o.Bnd_Box_1();
    try {
      o.BRepBndLib.Add(shape, bnd, false);
      if (bnd.IsVoid()) return undefined;
      const lo = bnd.CornerMin();
      const hi = bnd.CornerMax();
      const out = [
        [lo.X(), lo.Y(), lo.Z()],
        [hi.X(), hi.Y(), hi.Z()],
      ] as const;
      lo.delete();
      hi.delete();
      return out;
    } finally {
      bnd.delete();
    }
  };
  const A = box(a);
  const B = box(b);
  if (!A || !B) return false;
  for (let k = 0; k < 3; k++) {
    if (Math.min(A[1][k], B[1][k]) < Math.max(A[0][k], B[0][k]) - 1e-6) return false;
  }
  return true;
}

/**
 * A fuse result with no solid, or with less volume than the largest single
 * solid among its operands, dropped material: a union contains each operand.
 * Solids are measured one by one, so an operand compound of overlapping
 * solids is not double-counted. Unmeasurable (NaN) volumes are not judged.
 * Returns the measurements when material was lost, else undefined. Exported
 * for the regression test.
 */
export function fuseLostMaterial(
  oc: ReturnType<typeof getOC>,
  inputs: readonly unknown[],
  resultShape: unknown,
): { resultVolume: number; largestSolid: number } | undefined {
  let largestSolid = 0;
  for (const input of inputs) {
    for (const solid of solidsOf(oc, input)) {
      const v = solidVolume(oc, solid);
      if (!Number.isFinite(v)) return undefined;
      largestSolid = Math.max(largestSolid, v);
    }
  }
  if (!(largestSolid > 0)) return undefined;
  // Sum the result's solids (a fuse result's solids do not overlap) so each
  // one lands in the cache: it is usually the body the next fuse grows.
  let resultVolume = 0;
  for (const solid of solidsOf(oc, resultShape)) resultVolume += solidVolume(oc, solid);
  if (!Number.isFinite(resultVolume)) return undefined;
  return resultVolume < largestSolid - Math.max(1e-6, largestSolid * 1e-4) ? { resultVolume, largestSolid } : undefined;
}

/**
 * Volume of one solid, cached by OCCT identity. A modelling run fuses the
 * same growing body over and over: the solid a fuse returns is the body the
 * next fuse checks, and measuring a B-spline solid costs as much as a small
 * boolean. Each entry holds a handle to its shape, so the shape cannot be
 * freed and its address reused while cached, and a hit must pass IsSame
 * (same TShape and location). Orientation does not change volume.
 */
const VOLUME_CACHE_CAP = 32;
const volumeCache: Array<{ hash: number; shape: { IsSame(o: unknown): boolean; delete(): void }; volume: number }> = [];
const HASH_UPPER = 2147483647;

registerOcctResetHook(() => {
  for (const e of volumeCache.splice(0)) e.shape.delete();
});

function solidVolume(oc: ReturnType<typeof getOC>, solid: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = solid as any;
  if (typeof s?.HashCode !== 'function' || typeof s?.IsSame !== 'function') return volumeOf(oc, solid);
  const hash = s.HashCode(HASH_UPPER) as number;
  for (let i = 0; i < volumeCache.length; i++) {
    const e = volumeCache[i];
    if (e.hash === hash && e.shape.IsSame(solid)) {
      if (i > 0) volumeCache.unshift(...volumeCache.splice(i, 1));
      return e.volume;
    }
  }
  const volume = volumeOf(oc, solid);
  if (!Number.isFinite(volume)) return volume;
  // A fresh owned wrapper on the same TShape keeps it alive while cached.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const held = (oc as any).TopoDS.Solid_1(solid);
  volumeCache.unshift({ hash, shape: held, volume });
  while (volumeCache.length > VOLUME_CACHE_CAP) volumeCache.pop()!.shape.delete();
  return volume;
}

/** The solids of a shape (the shape itself for a plain solid). */
function solidsOf(oc: ReturnType<typeof getOC>, shape: unknown): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  const out: unknown[] = [];
  const exp = new o.TopExp_Explorer_2(shape, o.TopAbs_ShapeEnum.TopAbs_SOLID, o.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (exp.More()) {
      out.push(exp.Current());
      exp.Next();
    }
  } finally {
    exp.delete();
  }
  return out;
}

/**
 * A fuse left solids unmerged when its result has more solids than a full
 * merge could: every tool solid whose box touches a solid of another operand
 * must join something, so the result holds at most (all operand solids) minus
 * (touching tool solids). An operand that is already several solids (a clevis
 * pin next to its fork, say) legitimately keeps them apart; counting only
 * "more than one solid" sent every such fuse down the fuzzy retry ladder for
 * nothing. Disjoint operands are left alone: their union is reported by the
 * union-integrity guard, and no fuzzy value can legitimately connect them.
 * Exported for the regression test.
 */
export function fuseLeftUnmerged(
  oc: ReturnType<typeof getOC>,
  inputs: readonly unknown[],
  resultShape: unknown,
): boolean {
  if (inputs.length < 2) return false;
  const resultSolids = solidCount(oc, resultShape);
  if (resultSolids <= 1) return false;
  const solidsByInput = inputs.map((input) => solidsOf(oc, input));
  const total = solidsByInput.reduce((n, solids) => n + solids.length, 0);
  let touching = 0;
  for (let i = 1; i < solidsByInput.length; i++) {
    for (const tool of solidsByInput[i]) {
      const hits = solidsByInput.some((others, j) => j !== i && others.some((other) => boxesTouch(oc, tool, other)));
      if (hits) touching++;
    }
  }
  return touching > 0 && resultSolids > total - touching;
}

/** Build one boolean with `plan` and judge its result. */
function attemptBoolean(
  oc: ReturnType<typeof getOC>,
  op: BooleanOp,
  inputs: readonly unknown[],
  plan: BooleanAttemptPlan,
  inputVolumes: readonly number[],
): AttemptOutcome {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  const progress = new o.Message_ProgressRange_1();
  const args = new o.TopTools_ListOfShape_1();
  const toolList = new o.TopTools_ListOfShape_1();
  const builder = newBuilder(o, op);
  try {
    args.Append_1(inputs[0]);
    for (const t of inputs.slice(1)) toolList.Append_1(t);
    builder.SetArguments(args);
    builder.SetTools(toolList);
    builder.SetToFillHistory(true);
    if (plan.fuzzy > 0) builder.SetFuzzyValue(plan.fuzzy);
    if (plan.glue) builder.SetGlue(o.BOPAlgo_GlueEnum.BOPAlgo_GlueShift);
    booleanBuildStats.builds += 1;
    builder.Build(progress);
    // Verify the boolean actually completed before trusting Shape(): a degenerate
    // op can leave IsDone()==false while Shape() returns the unmodified body.
    assertBooleanSucceeded(builder, op);
    // INTENTIONALLY skip builder.SimplifyResult() to preserve history accuracy.
    const result: BooleanHistoryResult = {
      shape: builder.Shape(),
      ...readBuilderHistory(oc, builder, inputs),
      strategy: plan.strategy,
      ...(plan.fuzzy > 0 ? { fuzzyValue: plan.fuzzy } : {}),
    };
    return plan.strategy === 'exact'
      ? judgeExact(oc, builder, op, result)
      : judgeRecovered(oc, op, result, plan, inputVolumes);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : `historyAwareBooleans: ${op} boolean threw a kernel exception.` };
  } finally {
    builder.delete();
    toolList.delete();
    args.delete();
    progress.delete();
  }
}

/** The exact result is trusted unless OCCT raised warnings AND the solid is
 *  invalid. Validity is checked only when warnings exist so the happy path
 *  pays no BRepCheck cost. */
function judgeExact(
  oc: ReturnType<typeof getOC>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  op: BooleanOp,
  result: BooleanHistoryResult,
): AttemptOutcome {
  const warned = typeof builder.HasWarnings === 'function' && builder.HasWarnings();
  // A coincident/tangent-face boolean can return an unorientable face with no
  // builder warning. Catch that cheaply (topology only) so the recovery ladder
  // gets a chance to repair it; the full geometry check still gates recovered
  // candidates and warned exact results.
  if (!isTopologicallyValid(oc, result.shape)) {
    return {
      ok: false,
      error: `historyAwareBooleans: ${op} exact boolean produced an invalid solid (topology check).`,
      fallback: result,
    };
  }
  if (!warned || isValidShape(oc, result.shape)) return { ok: true, result };
  return {
    ok: false,
    error: `historyAwareBooleans: ${op} boolean finished with warnings and an invalid solid (coincident or tangent faces).`,
    fallback: result,
  };
}

/** A recovered result must be a valid solid (ShapeFix may repair it) whose
 *  volume respects the op's bounds. */
function judgeRecovered(
  oc: ReturnType<typeof getOC>,
  op: BooleanOp,
  result: BooleanHistoryResult,
  plan: BooleanAttemptPlan,
  inputVolumes: readonly number[],
): AttemptOutcome {
  let candidate = result;
  if (!isValidShape(oc, candidate.shape)) {
    const fixed = fixRecoveredResult(oc, candidate, plan.fuzzy);
    freeShape(result.shape); // rejected, or superseded by the fixed copy
    if (!fixed) return { ok: false, error: `${plan.strategy} result invalid after ShapeFix` };
    candidate = fixed;
  }
  if (!plausibleBooleanVolume(op, volumeOf(oc, candidate.shape), inputVolumes)) {
    freeShape(candidate.shape);
    return { ok: false, error: `${plan.strategy} result volume implausible` };
  }
  return { ok: true, result: candidate };
}

/** Delete a TopoDS_Shape handle that is not returned to anyone (a rejected
 *  attempt). Wrappers are reference-counted handles: freeing one never
 *  frees geometry another live handle still holds. */
function freeShape(shape: unknown): void {
  try {
    (shape as { delete?: () => void } | undefined)?.delete?.();
  } catch {
    // already freed / poisoned heap
  }
}

/** ShapeFix the result and carry the history across: sub-shapes ShapeFix
 *  rebuilt are re-matched by centre of mass + area/length. */
function fixRecoveredResult(
  oc: ReturnType<typeof getOC>,
  result: BooleanHistoryResult,
  fuzzy: number,
): BooleanHistoryResult | undefined {
  const fixedShape = shapeFix(oc, result.shape, Math.max(fuzzy, 1e-7));
  if (!fixedShape || !isValidShape(oc, fixedShape)) {
    freeShape(fixedShape);
    return undefined;
  }
  const hashOf = (s: unknown) => shapeHash(oc, s);
  const tol = Math.max(fuzzy * 10, 1e-6);
  const faceRemap = rematchSubshapes(oc, result.shape, fixedShape, 'face', hashOf, tol);
  const edgeRemap = rematchSubshapes(oc, result.shape, fixedShape, 'edge', hashOf, tol);
  return {
    ...result,
    shape: fixedShape,
    faceHistory: remapHistory(result.faceHistory, faceRemap),
    edgeHistory: remapHistory(result.edgeHistory, edgeRemap),
    shapeFixed: true,
  };
}

function remapHistory(history: Map<string, string[]>, remap: Map<string, string>): Map<string, string[]> {
  if (remap.size === 0) return history;
  const out = new Map<string, string[]>();
  const children = new Set<string>();
  for (const [input, kids] of history) {
    for (const k of kids) children.add(k);
    out.set(input, kids.map((c) => remap.get(c) ?? c));
  }
  // A sub-shape the boolean left untouched has no history entry (identity);
  // if ShapeFix rebuilt it, record the rename explicitly.
  for (const [before, after] of remap) {
    if (!children.has(before) && !out.has(before)) out.set(before, [after]);
  }
  return out;
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

/**
 * Cut `body` with every tool in ONE boolean build. Same N²-avoidance as
 * {@link fuseManyWithHistory}: folding N cutters pairwise re-cuts the growing
 * accumulator on every step (8 holes = 8 cuts of progressively larger solids)
 * for what is one general boolean. History merge is the same
 * earliest-input-wins fold the pairwise path produced
 * ({@link mergeBooleanHistoryMany}).
 */
export function cutManyWithHistory(body: OcctBackend, tools: readonly OcctBackend[]): BooleanHistoryResult {
  return runBooleanWithHistory(body, tools, 'cut');
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
