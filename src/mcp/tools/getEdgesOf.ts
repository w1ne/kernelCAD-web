// src/mcp/tools/getEdgesOf.ts
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { createOcctLowerer } from '../../kernel/backends/occt/occtLowerer';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { pickEdges } from '../../kernel/backends/occt/edgeSelection';
import type { FeatureRecord } from '../../intent/featureRecord';
import { runMcpScript } from '../runMcpScript';

export interface GetEdgesOfInput {
  file?: string;
  code?: string;
  feature_id?: string;
  face_name: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
}

export interface EdgeInfo {
  index: number;
  centroid: [number, number, number];
  length: number;
  isClosed: boolean;
}

export interface GetEdgesOfOutput {
  ok: boolean;
  edges?: EdgeInfo[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code or
   *  `cli.script-exception` for non-kernel throws; (2) lowering-error path →
   *  the first error diagnostic's `code`. */
  errorCode?: string;
}

export async function getEdgesOfTool(input: GetEdgesOfInput): Promise<GetEdgesOfOutput> {
  if (!input.face_name) {
    return { ok: false, error: 'face_name is required.' };
  }

  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  if (run.records.length === 0) return { ok: false, error: 'Script produced no features.' };
  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const targetRecord = run.records.find(r => r.id === targetId);
  if (!targetRecord) return { ok: false, error: `feature_id '${targetId}' not found.` };

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(targetId);
  if (!shape) {
    const fatal = result.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' did not lower successfully: ${fatal.message}`
        : `Feature '${targetId}' did not lower successfully.`,
      errorCode: fatal?.code,
    };
  }

  // Build a synthetic FeatureRecord with a face-input pointing at this feature, so we can
  // reuse pickEdges. The fields beyond inputs/kind don't matter for edge resolution.
  const synthetic: FeatureRecord = {
    id: '<query>',
    kind: 'fillet',
    params: { radius: { expression: '0', unit: 'mm', evaluated: 0 } },
    inputs: {
      base: { kind: 'feature', id: targetId },
      face: {
        kind: 'face',
        featureId: targetId,
        ref: { kind: 'canonical', face: input.face_name },
      },
    },
    transforms: [],
    suppressed: false,
  };

  const edgesResult = pickEdges(synthetic, shape as OcctBackend, undefined);
  if ('error' in edgesResult) {
    return { ok: false, error: edgesResult.error.message };
  }

  // Replicad's _1DShape.pointAt(t∈[0,1]) gives the proper parametric midpoint —
  // correct for arcs/circles, not just straight edges.
  const edges: EdgeInfo[] = edgesResult.map((e, i) => {
    const mid = e.pointAt(0.5);
    return {
      index: i,
      centroid: [mid.x, mid.y, mid.z] as [number, number, number],
      length: e.length,
      isClosed: e.isClosed,
    };
  });

  return { ok: true, edges };
}
