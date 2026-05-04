import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureId } from '../intent/types';
import type { FeatureLowerer, ShapeBackend } from '../backends/backend';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { DependencyGraph } from './dependencyGraph';
import type { FeatureEventSink } from './featureEvents';

function normalizeBooleanOp(expr: string | undefined): 'subtract' | 'union' | 'intersect' | undefined {
  if (!expr) return undefined;
  const stripped = expr.replace(/^['"]|['"]$/g, '');
  if (stripped === 'difference') return 'subtract';
  if (stripped === 'union') return 'union';
  if (stripped === 'intersection') return 'intersect';
  return undefined;
}

export interface RecomputeResult {
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
}

export interface RecomputeOptions {
  onEvent?: FeatureEventSink;
}

export class RecomputeEngine {
  private readonly lowerer: FeatureLowerer;
  constructor(lowerer: FeatureLowerer) { this.lowerer = lowerer; }

  async run(records: readonly FeatureRecord[], opts?: RecomputeOptions): Promise<RecomputeResult> {
    const shapes = new Map<FeatureId, ShapeBackend>();
    const diagnostics: CompilerDiagnostic[] = [];
    const health = new Map<FeatureId, 'healthy' | 'warning' | 'error'>();
    const onEvent = opts?.onEvent;

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

      // Resolve inputs
      const byKey: Record<string, ShapeBackend> = {};
      let inputsOk = true;
      for (const [key, ref] of Object.entries(r.inputs)) {
        const upstreamId = ref.kind === 'feature' ? ref.id : (ref as { featureId: FeatureId }).featureId;
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

      // Lower
      try {
        const res = await this.lowerer.lower(r, { byKey, records });
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
        const msg = e instanceof Error ? e.message : String(e);
        const failDiag: CompilerDiagnostic = {
          target: this.lowerer.target,
          code: 'recompute.lowering.exception',
          featureId: r.id,
          severity: 'error',
          message: msg,
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
