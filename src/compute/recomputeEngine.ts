import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureId } from '../intent/types';
import type { FeatureLowerer, ShapeBackend } from '../backends/backend';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { DependencyGraph } from './dependencyGraph';

export interface RecomputeResult {
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
}

export class RecomputeEngine {
  private readonly lowerer: FeatureLowerer;
  constructor(lowerer: FeatureLowerer) { this.lowerer = lowerer; }

  async run(records: readonly FeatureRecord[]): Promise<RecomputeResult> {
    const shapes = new Map<FeatureId, ShapeBackend>();
    const diagnostics: CompilerDiagnostic[] = [];
    const health = new Map<FeatureId, 'healthy' | 'warning' | 'error'>();

    // Build dep graph
    const graph = new DependencyGraph();
    for (const r of records) graph.addNode(r.id);
    for (const r of records) {
      for (const ref of Object.values(r.inputs)) {
        if (ref.kind === 'feature' || ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') {
          const upstreamId = ref.kind === 'feature' ? ref.id : ref.featureId;
          graph.addEdge(upstreamId, r.id);
        }
      }
    }

    const order = graph.topologicalOrder();
    const idToRecord = new Map(records.map(r => [r.id, r]));

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
          });
          break;
        }
        byKey[key] = s;
      }
      if (!inputsOk) {
        health.set(r.id, 'error');
        continue;
      }

      // Lower
      try {
        const res = await this.lowerer.lower(r, { byKey });
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          health.set(r.id, 'error');
        } else if (res.diagnostics.some(d => d.severity === 'warn')) {
          health.set(r.id, 'warning');
          shapes.set(r.id, res.shape);
        } else {
          health.set(r.id, 'healthy');
          shapes.set(r.id, res.shape);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        diagnostics.push({
          target: this.lowerer.target,
          code: 'recompute.lowering.exception',
          featureId: r.id,
          severity: 'error',
          message: msg,
        });
        health.set(r.id, 'error');
      }
    }

    return { shapes, diagnostics, health };
  }
}
