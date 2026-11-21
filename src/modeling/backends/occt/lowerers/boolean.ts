// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import {
  cutManyWithHistory,
  fuseManyWithHistory,
  fuseLostMaterial,
  intersectWithHistory,
  mergeBooleanHistory,
  mergeBooleanHistoryMany,
  type BooleanHistoryResult,
} from '../../../../kernel/backends/occt/historyAwareBooleans';
import { booleanRecoveryDiagnostic } from '../../../../kernel/backends/occt/booleanRecovery';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { intersectionEmptyDiagnostic } from '../additiveNoOp';
import { subtractiveNoOpDiagnostic } from '../subtractiveNoOp';
import { built, type LowerContext, type LowerOutcome } from './context';
import { stampSolid } from '../../../../kernel/naming/operationLineage';
import { mergeEdges } from '../../../../kernel/backends/occt/edgeLineage';
import type { EdgeHistoryMap, HistoryMap } from '../../../../kernel/naming/evolutionRecord';
import {
  captureBooleanReplay,
  releaseBooleanReplay,
  replayBoolean,
  type BooleanReplay,
} from '../../../../kernel/backends/occt/booleanReuse';
import { createContentKeyResolver } from '../../../compute/contentKey';

export { mergeEdges } from '../../../../kernel/backends/occt/edgeLineage';

/** Wrap a history-aware boolean result back into an `OcctBackend` with the
 *  merged face/edge lineage. `replicad.cast` downcasts the raw TopoDS_Shape to
 *  the correct OCCT subtype (Solid or Compound) and wraps it in the matching
 *  Replicad class; boolean ops always yield a 3D solid or compound. */
export function wrapBooleanResult(
  result: BooleanHistoryResult,
  faceMap: HistoryMap,
  edgeMap: EdgeHistoryMap,
  featureId: string,
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(result.shape as any) as replicad.Shape3D;
  const probe = new OcctBackend(wrapped);
  const stamped = stampSolid(faceMap, probe.faceHashes(), edgeMap, probe.edgeHashes(), featureId);
  const out = new OcctBackend(wrapped, undefined, stamped.historyMap);
  out.edgeHistoryMap = stamped.edgeHistoryMap;
  return out;
}

/** One operand of a boolean, with the record it came from. */
interface Operand {
  readonly shape: OcctBackend;
  readonly id: string | undefined;
}

/**
 * Record which operand each result face came from (`OcctBackend.memberOrigin`),
 * from the OCCT boolean history itself: a face kept as is keeps its hash, a
 * trimmed or split face is listed in `faceHistory`. This does not depend on
 * the operands carrying face lineage, so a sketch extrude or extruded text
 * member is traced like a primitive. Only `sources` contribute: every operand
 * of a union, the base side of a cut or intersection. Faces a cutter leaves
 * behind get no origin.
 */
function stampMemberOrigin(
  out: OcctBackend,
  sources: readonly Operand[],
  result: BooleanHistoryResult,
  featureId: string,
): void {
  const resultHashes = new Set(out.faceHashes());
  const origin = new Map<string, readonly string[]>();
  for (const { shape, id } of sources) {
    for (const hash of shape.faceHashes()) {
      const chain = shape.memberOrigin?.get(hash) ?? (id !== undefined ? [id] : undefined);
      if (chain === undefined || result.deletedFaces.has(hash)) continue;
      const modified = result.faceHistory.get(hash);
      const targets = modified !== undefined && modified.length > 0 ? modified : [hash];
      for (const t of targets) {
        if (!resultHashes.has(t) || origin.has(t)) continue;
        // A pairwise fold (intersection) passes its own earlier result back
        // in: its chain already ends with this record.
        origin.set(t, chain[chain.length - 1] === featureId ? chain : [...chain, featureId]);
      }
    }
  }
  if (origin.size > 0) out.memberOrigin = origin;
}

/** Appearance provenance is only worth computing when some record in the
 *  script carries a finish, material or colour. */
function scriptHasAppearance(ctx: LowerContext): boolean {
  return (ctx.allRecords ?? []).some((r) => {
    const meta = r.metadata as { material?: unknown; color?: unknown } | undefined;
    return meta?.material !== undefined || meta?.color !== undefined;
  });
}

/** Fold the tools one at a time, merging lineage pair by pair (intersection). */
function foldPairwise(
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
  op: string,
  r: FeatureRecord,
  ctx: LowerContext,
): OcctBackend {
  const trace = scriptHasAppearance(ctx);
  let source: Operand = { shape: acc, id: refIdOf(r, 'base') };
  for (const c of cutters) {
    const result = intersectWithHistory(acc, c);
    const recovered = booleanRecoveryDiagnostic(r.id, `boolean ${op}`, result);
    if (recovered) ctx.diagnostics.push(recovered);
    acc = wrapBooleanResult(
      result,
      mergeBooleanHistory(acc.historyMap, c.historyMap, result),
      mergeEdges([acc.edgeHistoryMap, c.edgeHistoryMap], result),
      r.id,
    );
    if (trace) stampMemberOrigin(acc, [source], result, r.id);
    // The next step's base is this result; its faces already carry origins.
    source = { shape: acc, id: undefined };
  }
  return acc;
}

/** ONE boolean build with every tool of the record. Folding N cutters pairwise
 *  re-intersected the growing accumulator on every step (an 8-hole plate paid
 *  8 cuts of progressively larger solids) for what is one general boolean.
 *  History merges inputs in record order — the same earliest-input-wins fold
 *  the pairwise path produced. */
function runManyToolBoolean(
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
  opKind: 'cut' | 'fuse',
  op: string,
  r: FeatureRecord,
  ctx: LowerContext,
): OcctBackend {
  const { result, base } = chainedBoolean(ctx, r, opKind, op, acc, cutters);
  return wrapManyToolResult(result, base, cutters, opKind, op, r, ctx);
}

/** Diagnostics, merged lineage and member origins of a many-tool result. */
function wrapManyToolResult(
  result: BooleanHistoryResult,
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
  opKind: 'cut' | 'fuse',
  op: string,
  r: FeatureRecord,
  ctx: LowerContext,
): OcctBackend {
  const recovered = booleanRecoveryDiagnostic(r.id, `boolean ${op}`, result);
  if (recovered) ctx.diagnostics.push(recovered);
  const newMap = mergeBooleanHistoryMany(
    [acc.historyMap, ...cutters.map((c) => c.historyMap)],
    result,
  );
  const out = wrapBooleanResult(result, newMap, mergeEdges([acc.edgeHistoryMap, ...cutters.map((c) => c.edgeHistoryMap)], result), r.id);
  if (scriptHasAppearance(ctx)) {
    const base: Operand = { shape: acc, id: refIdOf(r, 'base') };
    const tools: Operand[] = opKind === 'fuse'
      ? cutterKeys(ctx).map((key) => ({ shape: ctx.inputs.byKey[key] as OcctBackend, id: refIdOf(r, key) }))
      : [];
    stampMemberOrigin(out, [base, ...tools], result, r.id);
  }
  return out;
}

/** A run of single-consumer booleans of one op growing one body, as far as
 *  it has been lowered this pass: the first body and each link's lowering. */
interface BooleanChain {
  readonly opKind: 'cut' | 'fuse';
  readonly body: OcctBackend;
  readonly links: readonly { r: FeatureRecord; ctx: LowerContext; cutters: readonly OcctBackend[] }[];
}

/** Every reference to each record id, from any record of the run. */
function referencesById(records: readonly FeatureRecord[]): Map<string, { record: FeatureRecord; key: string }[]> {
  const out = new Map<string, { record: FeatureRecord; key: string }[]>();
  for (const record of records) {
    for (const [key, ref] of Object.entries(record.inputs)) {
      const id = ref.kind === 'feature' ? ref.id : ref.kind === 'surface' ? ref.surfaceId : ref.featureId;
      const list = out.get(id) ?? [];
      list.push({ record, key });
      out.set(id, list);
    }
  }
  return out;
}

/** True when `r`'s result is read by nothing but the next boolean of the
 *  same op, as that boolean's base: the next lowering re-checks the body. */
function feedsSameOpBoolean(ctx: LowerContext, r: FeatureRecord): boolean {
  const { pass, records } = ctx.inputs;
  if (!pass || !records) return false;
  const refs = pass.memo('booleanReferences', () => referencesById(records)).get(r.id) ?? [];
  if (refs.length !== 1) return false;
  const [{ record, key }] = refs;
  return key === 'base' && record.kind === 'boolean' && record.params.op?.expression === r.params.op?.expression;
}

/**
 * The boolean of one chain link. A link whose only reader is the next link
 * skips the whole-result checks (`deferResultChecks`); the chain's last link
 * runs them, and also checks that the end body kept the material of every
 * operand of the chain. If that fails, the chain is built again link by link
 * with every check, which is what each link did before. The deferred links
 * keep their exact results, so the per-feature bodies stay inspectable.
 */
function chainedBoolean(
  ctx: LowerContext,
  r: FeatureRecord,
  opKind: 'cut' | 'fuse',
  op: string,
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
): { result: BooleanHistoryResult; base: OcctBackend } {
  const pass = ctx.inputs.pass;
  if (!pass) return { result: reusableBoolean(ctx, r, opKind, acc, cutters, false), base: acc };
  const chains = pass.memo('booleanChains', () => new Map<string, BooleanChain>());
  const baseId = refIdOf(r, 'base');
  const prior = baseId === undefined ? undefined : chains.get(baseId);
  const chain: BooleanChain = prior !== undefined && prior.opKind === opKind
    ? { opKind, body: prior.body, links: [...prior.links, { r, ctx, cutters }] }
    : { opKind, body: acc, links: [{ r, ctx, cutters }] };
  if (feedsSameOpBoolean(ctx, r)) {
    chains.set(r.id, chain);
    return { result: reusableBoolean(ctx, r, opKind, acc, cutters, true), base: acc };
  }
  const result = reusableBoolean(ctx, r, opKind, acc, cutters, false);
  if (chain.links.length === 1 || chainKeptMaterial(opKind, chain, result)) return { result, base: acc };
  // Rebuild link by link with every check; the earlier links' lineage is
  // merged exactly as their own lowerings did.
  freeResult(result);
  let body = chain.body;
  const last = chain.links.length - 1;
  for (let i = 0; i < last; i++) {
    const link = chain.links[i];
    const linkCtx: LowerContext = { ...link.ctx, diagnostics: ctx.diagnostics };
    const built = opKind === 'cut' ? cutManyWithHistory(body, link.cutters) : fuseManyWithHistory(body, link.cutters);
    body = wrapManyToolResult(built, body, link.cutters, opKind, op, link.r, linkCtx);
  }
  const final = opKind === 'cut' ? cutManyWithHistory(body, cutters) : fuseManyWithHistory(body, cutters);
  return { result: final, base: body };
}

/** A fuse must not end smaller than any operand of its chain. A cut chain's
 *  end body was already checked (topology) by its own last build. */
function chainKeptMaterial(opKind: 'cut' | 'fuse', chain: BooleanChain, result: BooleanHistoryResult): boolean {
  if (opKind === 'cut') return true;
  const operands = [chain.body, ...chain.links.flatMap((l) => l.cutters)].map(wrappedOf);
  return fuseLostMaterial(getOC(), operands, result.shape) === undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrappedOf = (b: OcctBackend): unknown => (b.getReplicadShape() as any).wrapped;

function freeResult(result: BooleanHistoryResult): void {
  try {
    (result.shape as { delete?: () => void }).delete?.();
  } catch {
    // already released
  }
}

/**
 * Run the boolean, or replay the same boolean already built this pass from
 * operands with the same content (a helper called twice captures two
 * identical record chains). Content keys come from the records, never from
 * measured geometry; a replay whose operand topology does not line up falls
 * back to building.
 */
function reusableBoolean(
  ctx: LowerContext,
  r: FeatureRecord,
  opKind: 'cut' | 'fuse',
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
  deferResultChecks: boolean,
): BooleanHistoryResult {
  const options = { deferResultChecks };
  const build = (): BooleanHistoryResult =>
    opKind === 'cut' ? cutManyWithHistory(acc, cutters, options) : fuseManyWithHistory(acc, cutters, options);
  const { pass, records, resolveRecord } = ctx.inputs;
  if (!pass || !records) return build();
  const keys = pass.memo('contentKeys', () => createContentKeyResolver(
    records,
    resolveRecord ?? ((record) => record),
    (record) => ctx.importedGeometry.has(record.id),
  ));
  const operandIds = [refIdOf(r, 'base'), ...cutterKeys(ctx).map((k) => refIdOf(r, k))];
  if (operandIds.some((id) => id === undefined)) return build();
  // A result built without the whole-result checks is only replayed where
  // they are deferred again.
  const key = `${opKind}|${deferResultChecks ? 'deferred' : 'checked'}|${operandIds.map((id) => keys.keyOf(id!)).join('|')}`;
  const replays = pass.memo('booleanReplays', () => new Map<string, BooleanReplay>(), (m) => {
    for (const replay of m.values()) releaseBooleanReplay(replay);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operands = [acc, ...cutters].map((b) => (b.getReplicadShape() as any).wrapped as unknown);
  const known = replays.get(key);
  const replayed = known ? replayBoolean(known, operands) : undefined;
  if (replayed) return replayed;
  const result = build();
  if (!known) replays.set(key, captureBooleanReplay(result, operands));
  return result;
}

function refIdOf(r: FeatureRecord, key: string): string | undefined {
  const ref = r.inputs[key];
  return ref !== undefined && ref.kind === 'feature' ? ref.id : undefined;
}

/** Tool keys in the order `lowerBoolean` passes them to the kernel. */
function cutterKeys(ctx: LowerContext): string[] {
  return Object.keys(ctx.inputs.byKey).filter((k) => k.startsWith('cutter_')).sort((a, b) => a.localeCompare(b));
}

/** `boolean` — folds every `cutter_*` input into `base` with the history-aware
 *  op, then gates the two silent-no-op cases (cut that missed, empty
 *  intersection). */
export function lowerBoolean(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // Op expression is a quoted string in IR (e.g. "'difference'").
  const op = String(r.params.op.expression).replace(/'/g, '');
  const base = ctx.inputs.byKey['base'];
  if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
  let acc: OcctBackend = base as OcctBackend;
  const cutters = Object.entries(ctx.inputs.byKey)
    .filter(([k]) => k.startsWith('cutter_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v as OcctBackend);
  // For a difference, capture the base volume so we can flag a no-op cut
  // (cutter missed the body) below — the kernel otherwise returns the
  // unchanged solid as a success. With no cutters nothing could have missed.
  const volumeBeforeCut = op === 'difference' && cutters.length > 0 ? acc.volume() : null;
  // A zero-cutter boolean must not hand out its cached input: a later
  // transform consumes the OCCT handle and breaks the source on reuse.
  if (cutters.length === 0) {
    acc = acc.clone();
  } else if (op === 'intersection') {
    // OCCT's multi-tool Common computes `a ∩ (b ∪ c)`; the historical record
    // semantics are a sequential fold `a ∩ b ∩ c`. Keep the pairwise fold so
    // this op's result is unchanged (cuts and unions are equivalent either way).
    acc = foldPairwise(acc, cutters, op, r, ctx);
  } else if (op === 'difference') {
    acc = runManyToolBoolean(acc, cutters, 'cut', op, r, ctx);
  } else if (op === 'union') {
    acc = runManyToolBoolean(acc, cutters, 'fuse', op, r, ctx);
  } else {
    throw new Error(`Unknown boolean op: ${op}`);
  }
  const shape: ShapeBackend = acc;
  // A clearance cut (joint.clevis tongue pocket) may legitimately find no
  // material to remove; it is declared so at capture time.
  if (volumeBeforeCut !== null && r.metadata?.clearanceCut !== true) {
    const noop = subtractiveNoOpDiagnostic({
      featureId: r.id,
      opLabel: 'boolean difference',
      volumeBefore: volumeBeforeCut,
      volumeAfter: acc.volume(),
    });
    if (noop) ctx.diagnostics.push(noop);
  }
  // Additive analog of the cutter-miss: an intersection of disjoint
  // bodies yields no common solid. Empty/zero-volume here is unambiguous
  // (the operands don't overlap). Union is NOT gated — containment of one
  // operand in another is a legitimate no-volume-change result.
  if (op === 'intersection') {
    const empty = intersectionEmptyDiagnostic({
      featureId: r.id,
      volumeAfter: acc.volume(),
      isEmpty: acc.isEmpty(),
    });
    if (empty) ctx.diagnostics.push(empty);
  }
  return built(shape);
}
