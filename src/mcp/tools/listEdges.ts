// src/mcp/tools/listEdges.ts
//
// MCP tool: list edges of a kernelCAD shape with optional EdgeQuery filter.
// Lets agents introspect any shape (primitives, booleans, transformed solids,
// imported geometry) before running fillet/chamfer.

import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { OcctBackend } from '../../backends/occt/occtBackend';
import { selectEdges, type EdgeQuery, type EdgeSegment } from '../../backends/occt/edgeQueries';
import { runMcpScript } from '../runMcpScript';

export interface ListEdgesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  query?: EdgeQuery;
}

export interface ListEdgesOutput {
  ok: boolean;
  edges?: EdgeSegment[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code or
   *  `cli.script-exception` for non-kernel throws; (2) lowering-error path →
   *  the first error diagnostic's `code`. */
  errorCode?: string;
}

export async function listEdgesTool(input: ListEdgesInput): Promise<ListEdgesOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;
  if (run.records.length === 0) {
    return { ok: false, error: 'Script returned no features.' };
  }

  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const shape = r.shapes.get(targetId);
  if (!shape) {
    const fatal = r.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' has no lowered shape: ${fatal.message}`
        : `Feature '${targetId}' has no lowered shape.`,
      errorCode: fatal?.code,
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }

  const edges = selectEdges(shape, input.query ?? {});
  return { ok: true, edges };
}
