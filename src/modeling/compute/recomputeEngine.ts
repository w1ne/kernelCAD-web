import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId } from '../../shared/intent/types';
import type { FeatureLowerer, ShapeBackend } from '../../kernel/backends/backend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { DependencyGraph } from './dependencyGraph';
import type { FeatureEventSink } from './featureEvents';
import { KernelError } from '../../shared/intent/kernelError';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { resolveParams } from '../../shared/runtime/resolveParams';
import type { SoftWarningPhase, SoftWarningSink } from '../../shared/runtime/softWarning';

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

export interface RecomputeResult {
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
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
  /** Slice-3 Phase 4: append non-fatal warnings produced during lowering. */
  warningSink?: SoftWarningSink;
  /** Phase tag attached to warnings emitted in this run. */
  warningPhase?: SoftWarningPhase;
  /** Current run's gated named-feature index, keyed by feature metadata.name. */
  gatedFeatureNames?: Map<string, string | undefined>;
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

  async run(records: readonly FeatureRecord[], opts?: RecomputeOptions): Promise<RecomputeResult> {
    const shapes = opts?.seedShapes ? new Map(opts.seedShapes) : new Map<FeatureId, ShapeBackend>();
    const diagnostics: CompilerDiagnostic[] = [];
    const health = new Map<FeatureId, 'healthy' | 'warning' | 'error'>();
    const onEvent = opts?.onEvent;
    opts?.gatedFeatureNames?.clear();

    // Build dep graph
    const graph = new DependencyGraph();
    for (const r of records) graph.addNode(r.id);
    const predecessorsOf = new Map<FeatureId, FeatureId[]>();
    for (const r of records) {
      const preds: FeatureId[] = [];
      for (const ref of Object.values(r.inputs)) {
        if (ref.kind === 'feature' || ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') {
          const upstreamId = ref.kind === 'feature' ? ref.id : ref.featureId;
          graph.addEdge(upstreamId, r.id);
          preds.push(upstreamId);
        }
      }
      predecessorsOf.set(r.id, preds);
    }

    const order = graph.topologicalOrder();
    const idToRecord = new Map(records.map(r => [r.id, r]));
    let emittedCount = 0;

    for (const id of order) {
      const r = idToRecord.get(id)!;
      if (r.suppressed) continue;
      if (r.metadata?.virtual === true) {
        // Virtual records (referenceImage today; future construction-only kinds)
        // produce no BREP. Mark healthy and skip the lowerer entirely.
        health.set(r.id, 'healthy');
        continue;
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
        continue;
      }

      // Resolve inputs
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
      if (!inputsOk) {
        health.set(r.id, 'error');
        if (onEvent) {
          onEvent({
            kind: 'feature.failed',
            featureId: r.id,
            featureKind: r.kind,
            predecessors: predecessorsOf.get(r.id) ?? [],
            diagnostics: diagnostics.filter((d) => d.featureId === r.id),
          });
          emittedCount++;
        }
        continue;
      }

      const gatedLineage = findGatedLineageWarning(recordForLower, opts);
      if (gatedLineage) {
        opts?.warningSink?.(gatedLineage);
        const passthrough = passthroughShape(byKey);
        if (passthrough) {
          shapes.set(r.id, passthrough);
          health.set(r.id, 'warning');
          continue;
        }
      }

      if (isGatedOff) {
        const passthrough = passthroughShape(byKey);
        if (passthrough) {
          shapes.set(r.id, passthrough);
          health.set(r.id, 'healthy');
          continue;
        }
      }

      // Lower
      try {
        const res = await this.lowerer.lower(recordForLower, { byKey, records });
        diagnostics.push(...res.diagnostics);
        const featureDiags = res.diagnostics;
        if (featureDiags.some((d) => d.severity === 'error')) {
          health.set(r.id, 'error');
          if (onEvent) {
            onEvent({
              kind: 'feature.failed',
              featureId: r.id,
              featureKind: r.kind,
              predecessors: predecessorsOf.get(r.id) ?? [],
              diagnostics: featureDiags,
            });
            emittedCount++;
          }
        } else {
          const featureHealth: 'healthy' | 'warning' = featureDiags.some((d) => d.severity === 'warn')
            ? 'warning'
            : 'healthy';
          health.set(r.id, featureHealth);
          shapes.set(r.id, res.shape);
          if (onEvent) {
            const op = r.kind === 'boolean'
              ? normalizeBooleanOp(r.params.op?.expression)
              : undefined;
            onEvent({
              kind: 'feature.compiled',
              featureId: r.id,
              featureKind: r.kind,
              shape: res.shape,
              predecessors: predecessorsOf.get(r.id) ?? [],
              diagnostics: featureDiags,
              health: featureHealth,
              op,
            });
            emittedCount++;
          }
        }
      } catch (e) {
        // Preserve `KernelError.code`/`.hint` so e.g. `normalizeAxis` raising
        // `feature.invalid-args` with hint `invalid-args.axis.zero` surfaces as
        // a structured diagnostic instead of being flattened to the generic
        // `recompute.lowering.exception` shape. Non-KernelError throws still
        // fall through to the generic path.
        const failDiag: CompilerDiagnostic = e instanceof KernelError
          ? {
              target: this.lowerer.target,
              code: e.code,
              featureId: e.featureId ?? r.id,
              severity: 'error',
              message: e.message,
              hint: e.hint ?? HINT_TEMPLATES[e.code].template,
            }
          : {
              target: this.lowerer.target,
              code: 'recompute.lowering.exception',
              featureId: r.id,
              severity: 'error',
              message: e instanceof Error ? e.message : String(e),
              hint: 'An exception was raised during lowering; read the message for the underlying error.',
            };
        diagnostics.push(failDiag);
        health.set(r.id, 'error');
        if (onEvent) {
          onEvent({
            kind: 'feature.failed',
            featureId: r.id,
            featureKind: r.kind,
            predecessors: predecessorsOf.get(r.id) ?? [],
            diagnostics: [failDiag],
          });
          emittedCount++;
        }
      }
    }

    if (onEvent) {
      onEvent({ kind: 'recompute.complete', featureCount: emittedCount });
    }

    return { shapes, diagnostics, health };
  }
}
