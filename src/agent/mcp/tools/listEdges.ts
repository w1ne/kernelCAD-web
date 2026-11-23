// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/listEdges.ts
//
// MCP tool: list edges of a kernelCAD shape with optional EdgeQuery filter.
// Lets agents introspect any shape (primitives, booleans, transformed solids,
// imported geometry) before running fillet/chamfer.
//
// F-surface F2: each edge summary now carries an `@kc[<owner>/edge/<name>]`
// ref string so agents can hand the result directly back to face-ref-consuming
// tools without having to format the ref themselves.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { selectEdges, type EdgeQuery, type EdgeSegment } from '../../../kernel/backends/occt/edgeQueries';
import { runMcpScript } from '../runMcpScript';
import { formatTopoRef, type TopoKind } from '../../../kernel/naming';

export interface ListEdgesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  query?: EdgeQuery;
}

export type EdgeSummary = EdgeSegment & { ref: string };

export interface ListEdgesOutput {
  ok: boolean;
  edges?: ReadonlyArray<EdgeSummary>;
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

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
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

  const owner = input.feature_id ?? run.records[run.records.length - 1].id;
  return { ok: true, edges: summarizeOcctEdges(shape, owner, input.query) };
}

/** Edge rows for one lowered solid. `id` is `e<index>` into `.edges`.
 *  Shared with STEP inspect views so the listing ref cannot drift. */
export function summarizeOcctEdges(
  shape: OcctBackend,
  owner: string,
  query?: EdgeQuery,
): EdgeSummary[] {
  const edges = selectEdges(shape, query ?? {});
  const kind: TopoKind = 'edge';
  return edges.map((e) => ({
    ...e,
    ref: formatTopoRef({ owner, kind, segments: [e.id] }),
  }));
}
