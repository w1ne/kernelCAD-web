// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId } from '../../shared/intent/types';
import type { SelectionRecord } from '../../shared/intent/selectionRecord';
import type { BackendTarget } from '../../shared/types/backendTarget';
import type { FeatureLowerer, ShapeBackend } from '../../kernel/backends/backend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { DependencyGraph } from './dependencyGraph';
import type { FeatureEvent, FeatureEventSink } from './featureEvents';
import { KernelError } from '../../shared/intent/kernelError';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { resolveParams } from '../../shared/runtime/resolveParams';
import type { SoftWarningPhase, SoftWarningSink } from '../../shared/runtime/softWarning';
import { isOcctWasmPoisoned, WASM_POISON_MARKER, describeOcctThrow } from '../../kernel/backends/occt/occtException';
import { resetOcct } from '../../kernel/backends/occt/occtBackend';
import { previewSkipsFeature } from '../previewFinish';

function normalizeBooleanOp(expr: string | undefined): 'subtract' | 'union' | 'intersect' | undefined {
  if (!expr) return undefined;
  const stripped = expr.replace(/^['"]|['"]$/g, '');
  if (stripped === 'difference') return 'subtract';
  if (stripped === 'union') return 'union';
  if (stripped === 'intersection') return 'intersect';
  return undefined;
}

function isParamLike(v: unknown): v is { evaluated: number; paramRef?: unknown } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { evaluated?: unknown }).evaluated === 'number'
  );
}

function enabledGateParamName(record: FeatureRecord): string | undefined {
  const enabled = (record.metadata as { enabled?: unknown } | undefined)?.enabled;
  if (!isParamLike(enabled)) return undefined;
  // Boolean ParamRefs are leaves only (not composable per design); a string
  // paramRef yields the gate name. Composed AST shapes carry no single name
  // and don't apply to boolean gates.
  return typeof enabled.paramRef === 'string' ? enabled.paramRef : undefined;
}

function isEnabledFalse(record: FeatureRecord): boolean {
  const enabled = (record.metadata as { enabled?: unknown } | undefined)?.enabled;
  return isParamLike(enabled) && enabled.evaluated === 0;
}

function registerGatedName(
  record: FeatureRecord,
  gatedFeatureNames: Map<string, string | undefined> | undefined,
  paramName: string | undefined,
): void {
  const name = (record.metadata as { name?: unknown } | undefined)?.name;
  if (typeof name === 'string') gatedFeatureNames?.set(name, paramName);
}

function passthroughShape(byKey: Record<string, ShapeBackend>): ShapeBackend | undefined {
  return byKey.target ?? byKey.base ?? Object.values(byKey)[0];
}

function selectorRoot(label: string): string {
  const bracket = label.indexOf('[');
  const dot = label.indexOf('.');
  const end = [bracket, dot].filter(i => i >= 0).sort((a, b) => a - b)[0];
  return end === undefined ? label : label.slice(0, end);
}

/** Build the dependency graph and its derived lookups (topo order,
 *  predecessor lists, id → record index) for one `run()` call. */
function inputUpstream(ref: FeatureRecord['inputs'][string]): string | undefined {
  if (ref.kind === 'feature') return ref.id;
  if (ref.kind === 'surface') return ref.surfaceId;
  if (ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') return ref.featureId;
  return undefined;
}

function buildRecomputeGraph(records: readonly FeatureRecord[]): {
  order: FeatureId[];
  predecessorsOf: Map<FeatureId, FeatureId[]>;
  idToRecord: Map<FeatureId, FeatureRecord>;
} {
  const graph = new DependencyGraph();
  for (const r of records) graph.addNode(r.id);
  const predecessorsOf = new Map<FeatureId, FeatureId[]>();
  for (const r of records) {
    const preds: FeatureId[] = [];
    for (const ref of Object.values(r.inputs)) {
      const upstreamId = inputUpstream(ref);
      if (!upstreamId) continue;
      // Surfaces are not feature records. Register the node so the edge is
      // legal; `processRecord` skips an id that has no record.
      if (ref.kind === 'surface') graph.addNode(upstreamId);
      graph.addEdge(upstreamId, r.id);
      preds.push(upstreamId);
    }
    predecessorsOf.set(r.id, preds);
  }

  const order = graph.topologicalOrder();
  const idToRecord = new Map(records.map(r => [r.id, r]));
  return { order, predecessorsOf, idToRecord };
}

/** Predecessor lists for a record list, exactly as the engine computes them
 *  for `feature.compiled` events. The meshing layer's refine pass re-meshes a
 *  seeded (already-lowered) shape without re-running the engine and must
 *  synthesize the same event fields — this is the one source of truth. */
export function predecessorsByRecord(records: readonly FeatureRecord[]): Map<FeatureId, FeatureId[]> {
  return buildRecomputeGraph(records).predecessorsOf;
}

/** Boolean op for a record, as emitted on `feature.compiled` events. */
export function booleanOpOfRecord(
  r: FeatureRecord,
): 'subtract' | 'union' | 'intersect' | undefined {
  return r.kind === 'boolean' ? normalizeBooleanOp(r.params.op?.expression) : undefined;
}

/** Synthesize the `feature.compiled` event for a record whose lowered shape
 *  already exists — the meshing layer's refine pass re-meshes a seeded shape
 *  without re-running the engine. Field parity with
 *  `emitFeatureCompiledEvent` is the point: ownership links, op labels and
 *  warnings key off these. */
export function compiledEventForRecord(
  r: FeatureRecord,
  shape: ShapeBackend,
  predecessorsOf: ReadonlyMap<FeatureId, FeatureId[]>,
): Extract<FeatureEvent, { kind: 'feature.compiled' }> {
  return {
    kind: 'feature.compiled',
    featureId: r.id,
    featureKind: r.kind,
    shape,
    predecessors: predecessorsOf.get(r.id) ?? [],
    diagnostics: [],
    health: 'healthy',
    op: booleanOpOfRecord(r),
  };
}

function findGatedLineageWarning(
  record: FeatureRecord,
  opts: RecomputeOptions | undefined,
): import('../../shared/runtime/softWarning').SoftWarning | undefined {
  const faceRef = record.inputs.face;
  if (!faceRef || faceRef.kind !== 'face' || faceRef.ref.kind !== 'label') return undefined;
  const featureName = selectorRoot(faceRef.ref.name);
  if (!opts?.gatedFeatureNames?.has(featureName)) return undefined;
  const paramName = opts.gatedFeatureNames.get(featureName);
  return {
    code: 'feature.face-ref.not-resolvable',
    hint: 'face-ref.skipped-by-param',
    message: paramName
      ? `feature '${featureName}' gated off by param '${paramName}' (=false); ${record.kind} on '${faceRef.ref.name}' became a passthrough.`
      : `feature '${featureName}' is gated off; ${record.kind} on '${faceRef.ref.name}' became a passthrough.`,
    recordId: record.id,
    paramName,
    phase: opts.warningPhase ?? 'build',
  };
}

/** Emit a `feature.failed` event for `r`; returns 1 when the event was
 *  emitted onto `onEvent`, else 0. Shared by the diagnostic-error and
 *  thrown-exception paths of `lowerAndEmit`. */
function emitFeatureFailedEvent(
  r: FeatureRecord,
  featureDiags: CompilerDiagnostic[],
  predecessorsOf: Map<FeatureId, FeatureId[]>,
  onEvent: FeatureEventSink | undefined,
): number {
  if (onEvent) {
    onEvent({
      kind: 'feature.failed',
      featureId: r.id,
      featureKind: r.kind,
      predecessors: predecessorsOf.get(r.id) ?? [],
      diagnostics: featureDiags,
    });
    return 1;
  }
  return 0;
}

/** Emit a `feature.compiled` event for `r`; returns 1 when the event was
 *  emitted onto `onEvent`, else 0. The boolean `op` is only computed on the
 *  emitting path, matching the original inline emission. */
function emitFeatureCompiledEvent(
  r: FeatureRecord,
  shape: ShapeBackend,
  featureDiags: CompilerDiagnostic[],
  featureHealth: 'healthy' | 'warning',
  predecessorsOf: Map<FeatureId, FeatureId[]>,
  onEvent: FeatureEventSink | undefined,
): number {
  if (onEvent) {
    const op = booleanOpOfRecord(r);
    onEvent({
      kind: 'feature.compiled',
      featureId: r.id,
      featureKind: r.kind,
      shape,
      predecessors: predecessorsOf.get(r.id) ?? [],
      diagnostics: featureDiags,
      health: featureHealth,
      op,
    });
    return 1;
  }
  return 0;
}

/** Build the structured diagnostic for a throw during lowering. Preserves
 *  `KernelError.code`/`.hint` so e.g. `normalizeAxis` raising
 *  `feature.invalid-args` with hint `invalid-args.axis.zero` surfaces as
 *  a structured diagnostic instead of being flattened to the generic
 *  `recompute.lowering.exception` shape. Non-KernelError throws still
 *  fall through to the generic path. */
function loweringFailureDiagnostic(
  target: BackendTarget,
  e: unknown,
  fallbackFeatureId: FeatureId,
): CompilerDiagnostic {
  if (e instanceof KernelError) {
    return {
      target,
      code: e.code,
      featureId: e.featureId ?? fallbackFeatureId,
      severity: 'error',
      message: e.message,
      hint: e.hint ?? HINT_TEMPLATES[e.code].template,
    };
  }
  return {
    target,
    code: 'recompute.lowering.exception',
    featureId: fallbackFeatureId,
    severity: 'error',
    message: e instanceof Error ? e.message : String(e),
    hint: 'An exception was raised during lowering; read the message for the underlying error.',
  };
}

export interface RecomputeResult {
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
  /** What each lowered feature's selectors bound to, in evaluation order.
   *  Features reused from `seedShapes` carry over `seedSelections`. */
  selections: SelectionRecord[];
  /**
   * Physics-grounded loop verdict (P0 of the physics-loop slice).
   *
   * - `'real'`   — every declared assembly satisfies the 4 truth criteria
   *                (orphan-part / disconnect / interpenetration / dof-mismatch)
   *                at every sampled pose.
   * - `'broken'` — at least one assembly fails at least one criterion at
   *                at least one sampled pose. `mechanismFailures` carries
   *                the structured failure list.
   * - `'unverified'` — the run did not exercise the mechanism check
   *                (e.g. cheap modes that skip BREP-heavy gates, or the
   *                session declared no assemblies / no mates so the
   *                check was vacuous).
   *
   * See `docs/specs/2026-06-01-physics-grounded-loop-design.md` for the
   * truth criteria and `src/modeling/runtime/mechanismTruth.ts` for the
   * implementation. Downstream consumers (CLI `kernelcad validate`,
   * Studio runtime, render-inspect) opt in to reading this field in P1.
   */
  mechanism?: 'real' | 'broken' | 'unverified';
  /**
   * Structured per-failure list. Always populated to the empty array when
   * `mechanism === 'real'`. Each diagnostic uses one of the
   * `mechanism.*` codes from `src/shared/diagnostics/registry/`.
   */
  mechanismFailures?: readonly CompilerDiagnostic[];
}

export interface RecomputeOptions {
  onEvent?: FeatureEventSink;
  /** Slice-3: when records contain symbolic param refs (`Param.paramRef` set),
   *  the engine pre-resolves them against this table before dispatching to
   *  the lowerer. Optional — slice-1/2 records have no paramRefs and work
   *  with table omitted. */
  paramTable?: ParamTable;
  /** Slice-3: pre-populated shape map. Records whose id is already in
   *  seedShapes are skipped (cache hit) — used by `params.update` to reuse
   *  unchanged earlier records' lowered output. */
  seedShapes?: Map<FeatureId, ShapeBackend>;
  /** Selections of the seeded features, from the build that produced the
   *  seeds. Entries for features that are not seeded are ignored. */
  seedSelections?: readonly SelectionRecord[];
  /**
   * Drag preview. Finish features that do not read `previewEdited` pass
   * their input solid through instead of lowering. The release update
   * omits this and rebuilds them.
   */
  previewFinish?: boolean;
  previewEdited?: ReadonlySet<string>;
  /** Called for each record skipped because its shape was in `seedShapes`,
   *  at the point in topological order where the engine would have lowered
   *  it. The meshing pass uses it to mesh a reused shape in the same order a
   *  fresh lower would have emitted `feature.compiled`. Not called for
   *  suppressed or virtual records. */
  onSeedHit?: (record: FeatureRecord, shape: ShapeBackend) => void;
  /** Slice-3 Phase 4: append non-fatal warnings produced during lowering. */
  warningSink?: SoftWarningSink;
  /** Phase tag attached to warnings emitted in this run. */
  warningPhase?: SoftWarningPhase;
  /** Current run's gated named-feature index, keyed by feature metadata.name. */
  gatedFeatureNames?: Map<string, string | undefined>;
  /**
   * Physics-grounded loop (P0): when set, the engine runs the supplied
   * mechanism-truth probe AFTER the rest-pose recompute completes and
   * folds the verdict into `RecomputeResult.mechanism` /
   * `RecomputeResult.mechanismFailures`.
   *
   * The probe is a callback (not an Assembly direct reference) so the
   * engine layer doesn't import Assembly — the caller wires
   * `checkMechanismTruth(arm)` from
   * `src/modeling/runtime/mechanismTruth.ts`. See spec
   * `docs/specs/2026-06-01-physics-grounded-loop-design.md`.
   *
   * Omit (or set to `undefined`) to leave the field at `'unverified'`.
   * This is the default — cheap recomputes (Studio param drags, eval
   * harness rest-pose lowers) skip the heavy pose sweep so the live
   * loop stays fast.
   */
  mechanismCheck?: () => Promise<{
    readonly mechanism: 'real' | 'broken';
    readonly failures: readonly CompilerDiagnostic[];
  }>;
}

export class RecomputeEngine {
  private readonly lowerer: FeatureLowerer;
  constructor(lowerer: FeatureLowerer) { this.lowerer = lowerer; }

  private relowerSubs = new Set<(affectedIds: string[]) => void>();

  /** Subscribe to re-lower events. Returns an unsubscribe function. */
  onRelower(cb: (affectedIds: string[]) => void): () => void {
    this.relowerSubs.add(cb);
    return () => { this.relowerSubs.delete(cb); };
  }

  /** Engine→host hook. Called by buildModel.updateModelParams (and any
   *  future re-lower code path) after a re-lower completes, with the set
   *  of feature IDs whose shape was rebuilt. Subscribers registered via
   *  onRelower() see this fire. Subscriber errors are caught + logged so
   *  one bad listener can't break others. */
  emitRelower(affectedIds: readonly string[]): void {
    const snapshot = [...affectedIds];
    for (const cb of this.relowerSubs) {
      try { cb(snapshot); }
      catch (err) { console.error('RecomputeEngine.onRelower subscriber threw:', err); }
    }
  }

  /** Resolve one record's upstream inputs into `byKey`, ready for the
   *  lowerer. `inputsOk` is false when any non-virtual, non-surface input
   *  is missing from `shapes` (already-diagnosed as an error). */
  private resolveRecordInputs(
    r: FeatureRecord,
    idToRecord: Map<FeatureId, FeatureRecord>,
    shapes: Map<FeatureId, ShapeBackend>,
    diagnostics: CompilerDiagnostic[],
  ): { byKey: Record<string, ShapeBackend>; inputsOk: boolean } {
    const byKey: Record<string, ShapeBackend> = {};
    let inputsOk = true;
    for (const [key, ref] of Object.entries(r.inputs)) {
      // W1.3: 'surface' refs point to a SurfaceRecord, not a FeatureRecord.
      // The lowerer resolves them via its session hook (see OcctLowerer.
      // resolveSurfaceFaceForRecord) — skip here.
      if (ref.kind === 'surface') continue;
      const upstreamId = ref.kind === 'feature' ? ref.id : (ref as { featureId: FeatureId }).featureId;
      // Virtual upstream records (curve3d today; referenceImage) produce no
      // ShapeBackend on `shapes` — they side-effect onto session-level maps
      // like `importedGeometry`. Skip the missing-shape check; the
      // downstream lowerer arm is responsible for resolving the virtual
      // input (e.g. variableSweep finds its curve3d spine via the records
      // list passed in `inputs.records`).
      const upstreamRecord = idToRecord.get(upstreamId);
      if (upstreamRecord?.metadata?.virtual === true) continue;
      const s = shapes.get(upstreamId);
      if (!s) {
        inputsOk = false;
        diagnostics.push({
          target: this.lowerer.target,
          code: 'recompute.input.missing',
          featureId: r.id,
          severity: 'error',
          message: `Input '${key}' references missing/failed feature '${upstreamId}'`,
          hint: 'Walk the upstream chain with why_did_this_fail to find the root cause.',
        });
        break;
      }
      byKey[key] = s;
    }
    return { byKey, inputsOk };
  }

  /** Resolve one record to its pre-lowering state: suppression / virtual /
   *  seed-cache skips are health-marked here and reported as `null` (nothing
   *  to lower); otherwise returns the record to lower plus its gate state. */
  private prepareRecord(
    id: FeatureId,
    r: FeatureRecord,
    opts: RecomputeOptions | undefined,
    health: Map<FeatureId, 'healthy' | 'warning' | 'error'>,
  ): { recordForLower: FeatureRecord; isGatedOff: boolean } | null {
    if (r.suppressed) return null;
    if (r.metadata?.virtual === true) {
      // Virtual records (referenceImage today; future construction-only kinds)
      // produce no BREP. Mark healthy and skip the lowerer entirely.
      health.set(r.id, 'healthy');
      return null;
    }
    const recordForLower: FeatureRecord = opts?.paramTable
      ? resolveParams(r, opts.paramTable) as FeatureRecord
      : r;
    const gatedParamName = enabledGateParamName(r);
    const isGatedOff = isEnabledFalse(recordForLower);

    if (isGatedOff) {
      registerGatedName(recordForLower, opts?.gatedFeatureNames, gatedParamName);
    }

    // Slice-3: cache hit — record's lowered output was seeded by `params.update`.
    // Skip lowering; mark healthy.
    if (opts?.seedShapes && opts.seedShapes.has(id)) {
      health.set(id, 'healthy');
      opts.onSeedHit?.(r, opts.seedShapes.get(id)!);
      return null;
    }

    return { recordForLower, isGatedOff };
  }

  /** Emit the `feature.failed` event for a record whose inputs did not
   *  resolve. Returns 1 when an event was emitted, else 0. */
  private emitInputFailure(
    r: FeatureRecord,
    diagnostics: CompilerDiagnostic[],
    predecessorsOf: Map<FeatureId, FeatureId[]>,
    onEvent: FeatureEventSink | undefined,
  ): number {
    if (onEvent) {
      onEvent({
        kind: 'feature.failed',
        featureId: r.id,
        featureKind: r.kind,
        predecessors: predecessorsOf.get(r.id) ?? [],
        diagnostics: diagnostics.filter((d) => d.featureId === r.id),
      });
      return 1;
    }
    return 0;
  }

  /** Gated-off records pass their upstream shape through instead of lowering
   *  (warning health when a face ref names the gated feature, healthy
   *  otherwise). Returns true when the record was resolved without lowering. */
  private tryGatedPassthrough(
    r: FeatureRecord,
    recordForLower: FeatureRecord,
    isGatedOff: boolean,
    byKey: Record<string, ShapeBackend>,
    opts: RecomputeOptions | undefined,
    shapes: Map<FeatureId, ShapeBackend>,
    health: Map<FeatureId, 'healthy' | 'warning' | 'error'>,
  ): boolean {
    const gatedLineage = findGatedLineageWarning(recordForLower, opts);
    if (gatedLineage) {
      opts?.warningSink?.(gatedLineage);
      const passthrough = passthroughShape(byKey);
      if (passthrough) {
        shapes.set(r.id, passthrough);
        health.set(r.id, 'warning');
        return true;
      }
    }

    if (isGatedOff) {
      const passthrough = passthroughShape(byKey);
      if (passthrough) {
        shapes.set(r.id, passthrough);
        health.set(r.id, 'healthy');
        return true;
      }
    }

    return false;
  }

  /** Process one topo-ordered record within a `run()` pass: resolve its
   *  inputs, apply gating/passthrough, lower it, and emit the matching
   *  event. Returns 1 if an event was emitted onto `ctx.onEvent`, else 0 —
   *  the caller accumulates this into `emittedCount`. */
  private async processRecord(
    id: FeatureId,
    records: readonly FeatureRecord[],
    ctx: {
      idToRecord: Map<FeatureId, FeatureRecord>;
      predecessorsOf: Map<FeatureId, FeatureId[]>;
      shapes: Map<FeatureId, ShapeBackend>;
      diagnostics: CompilerDiagnostic[];
      health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
      selections: SelectionRecord[];
      onEvent: FeatureEventSink | undefined;
      opts: RecomputeOptions | undefined;
    },
  ): Promise<number> {
    const { idToRecord, predecessorsOf, shapes, diagnostics, health, selections, onEvent, opts } = ctx;
    const r = idToRecord.get(id);
    if (!r) return 0;
    const prepared = this.prepareRecord(id, r, opts, health);
    if (prepared === null) return 0;

    // Resolve inputs
    const { byKey, inputsOk } = this.resolveRecordInputs(r, idToRecord, shapes, diagnostics);
    if (!inputsOk) {
      health.set(r.id, 'error');
      return this.emitInputFailure(r, diagnostics, predecessorsOf, onEvent);
    }

    if (opts?.previewFinish && previewSkipsFeature(r, opts.previewEdited)) {
      const passthrough = passthroughShape(byKey);
      if (passthrough) {
        shapes.set(r.id, passthrough);
        health.set(r.id, 'healthy');
        return 0;
      }
    }

    if (this.tryGatedPassthrough(r, prepared.recordForLower, prepared.isGatedOff, byKey, opts, shapes, health)) {
      return 0;
    }

    // Lower
    return this.lowerAndEmit(prepared.recordForLower, r, records, byKey, {
      predecessorsOf, shapes, diagnostics, health, selections, onEvent, paramTable: opts?.paramTable,
    });
  }

  /** Lowering phase of `processRecord`: calls the lowerer, then emits the
   *  matching `feature.compiled` / `feature.failed` event. Returns 1 if an
   *  event was emitted, else 0. */
  private async lowerAndEmit(
    recordForLower: FeatureRecord,
    r: FeatureRecord,
    records: readonly FeatureRecord[],
    byKey: Record<string, ShapeBackend>,
    ctx: {
      predecessorsOf: Map<FeatureId, FeatureId[]>;
      shapes: Map<FeatureId, ShapeBackend>;
      diagnostics: CompilerDiagnostic[];
      health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
      selections: SelectionRecord[];
      onEvent: FeatureEventSink | undefined;
      paramTable: ParamTable | undefined;
    },
  ): Promise<number> {
    const { predecessorsOf, shapes, diagnostics, health, selections, onEvent, paramTable } = ctx;
    // `records` are unresolved; a lowerer that reads an upstream record's numbers resolves it through this.
    const resolveRecord = (rec: FeatureRecord): FeatureRecord =>
      (paramTable ? resolveParams(rec, paramTable) as FeatureRecord : rec);
    try {
      const res = await this.lowerer.lower(recordForLower, {
        byKey, records, resolveRecord, ...(paramTable !== undefined ? { paramTable } : {}),
      });
      diagnostics.push(...res.diagnostics);
      if (res.selections) selections.push(...res.selections);
      const featureDiags = res.diagnostics;
      if (featureDiags.some((d) => d.severity === 'error')) {
        health.set(r.id, 'error');
        return emitFeatureFailedEvent(r, featureDiags, predecessorsOf, onEvent);
      } else {
        const featureHealth: 'healthy' | 'warning' = featureDiags.some((d) => d.severity === 'warn')
          ? 'warning'
          : 'healthy';
        health.set(r.id, featureHealth);
        shapes.set(r.id, res.shape);
        return emitFeatureCompiledEvent(r, res.shape, featureDiags, featureHealth, predecessorsOf, onEvent);
      }
    } catch (e) {
      // Wasm poison (OOB / Aborted) corrupts the process-global OCCT heap —
      // swallowing it as a per-feature diagnostic leaves every later lower
      // broken. Rethrow so `run()` can resetOcct + retry the full pass once.
      if (isOcctWasmPoisoned(e)) throw e;

      const failDiag: CompilerDiagnostic = loweringFailureDiagnostic(this.lowerer.target, e, r.id);
      diagnostics.push(failDiag);
      health.set(r.id, 'error');
      return emitFeatureFailedEvent(r, [failDiag], predecessorsOf, onEvent);
    }
  }

  private async runPass(records: readonly FeatureRecord[], opts?: RecomputeOptions): Promise<RecomputeResult> {
    // A parked surface from the previous parameter value must not be reused,
    // and it must not stay pinned for the life of the session.
    const surfaceCache = (this.lowerer as { surfaceCache?: { clear(): void } }).surfaceCache;
    surfaceCache?.clear();
    const shapes = opts?.seedShapes ? new Map(opts.seedShapes) : new Map<FeatureId, ShapeBackend>();
    const diagnostics: CompilerDiagnostic[] = [];
    const health = new Map<FeatureId, 'healthy' | 'warning' | 'error'>();
    const selections: SelectionRecord[] = (opts?.seedSelections ?? []).filter((s) => shapes.has(s.consumerFeatureId));
    const onEvent = opts?.onEvent;
    opts?.gatedFeatureNames?.clear();

    // Build dep graph
    const { order, predecessorsOf, idToRecord } = buildRecomputeGraph(records);
    let emittedCount = 0;
    const yields = new MacrotaskYield();

    for (const id of order) {
      await yields.tick();
      emittedCount += await this.processRecord(id, records, {
        idToRecord, predecessorsOf, shapes, diagnostics, health, selections, onEvent, opts,
      });
    }

    if (onEvent) {
      onEvent({ kind: 'recompute.complete', featureCount: emittedCount });
    }

    // Physics-grounded loop (P0): if the caller supplied a
    // `mechanismCheck` probe, run it now. The probe owns the heavy
    // pose-sweep + per-pose BREP work (see
    // `src/modeling/runtime/mechanismTruth.ts`); the engine only folds
    // the result onto `RecomputeResult` so downstream consumers (CLI
    // validate, Studio runtime, render-inspect) read a single source of
    // truth in P1. When no probe is set the field stays `'unverified'`
    // — recomputes that DON'T pay for the sweep still get a stable
    // value to downstream consumers can branch on.
    if (opts?.mechanismCheck) {
      try {
        const verdict = await opts.mechanismCheck();
        return {
          shapes,
          diagnostics,
          health,
          selections,
          mechanism: verdict.mechanism,
          mechanismFailures: verdict.failures,
        };
      } catch (e) {
        // A probe throw is itself a mechanism failure (something went
        // wrong measuring the mechanism), but we don't want it to nuke
        // the rest of the recompute result. Surface as `'unverified'`
        // + a structured diagnostic so the caller can see the failure.
        diagnostics.push({
          target: this.lowerer.target,
          code: 'recompute.lowering.exception',
          severity: 'error',
          message: `Mechanism-truth probe threw: ${e instanceof Error ? e.message : String(e)}`,
          hint: 'The pose-sweep mechanism check raised an exception; inspect the assembly for solver / lowerer errors and retry.',
        });
        return {
          shapes,
          diagnostics,
          health,
          selections,
          mechanism: 'unverified',
          mechanismFailures: [],
        };
      }
    }

    return {
      shapes,
      diagnostics,
      health,
      selections,
      mechanism: 'unverified',
      mechanismFailures: [],
    };
  }

  async run(records: readonly FeatureRecord[], opts?: RecomputeOptions): Promise<RecomputeResult> {
    try {
      return await this.runPass(records, opts);
    } catch (e) {
      if (!isOcctWasmPoisoned(e)) throw e;
      await resetOcct();
      try {
        return await this.runPass(records, opts);
      } catch (retryErr) {
        if (!isOcctWasmPoisoned(retryErr)) throw retryErr;
        // Throw, do not return a per-feature diagnostic. A returned failure
        // leaves this dead heap in service and the viewer never gets a mesh.
        throw new Error(
          `${WASM_POISON_MARKER}: ${describeOcctThrow(retryErr)}. ` +
          'OCCT was reset and the full recompute retried; still failing. Restart the host process.',
        );
      }
    }
  }
}

/**
 * Gives the event loop a macrotask turn every ~100 ms of a recompute pass.
 * A long run is one chain of awaits with no macrotask turn, so
 * FinalizationRegistry cleanups (which free OCCT objects whose JS handles
 * died) would never run until the whole build ends.
 */
class MacrotaskYield {
  private last = Date.now();

  async tick(): Promise<void> {
    if (Date.now() - this.last < 100) return;
    await new Promise<void>((resolve) => {
      if (typeof setImmediate === 'function') setImmediate(resolve);
      else setTimeout(resolve, 0);
    });
    this.last = Date.now();
  }
}
