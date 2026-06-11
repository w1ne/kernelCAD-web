// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/evaluateQuery.ts
//
// Q8a — the agent's discovery primitive for the Query DSL. Inspect a Query
// against a kernelCAD script's lowered geometry before consuming it in a
// feature op. The MCP-side companion to `kc.q.face(...).evaluate(scene)`:
// pass either an @kc[...] ref string, an @kcq[...] DSL string, or a JSON-AST
// `{ ast }` object, get back the resolved entity list (or the structured
// diagnostic envelope on miss).
//
// Why discovery: agents commonly assemble a Query in one turn and want to
// confirm the resolution set before chaining it into hole / fillet / mate.
// Today the only way is to author a throwaway op and inspect its
// diagnostics — `evaluate_query` shortcuts that round-trip.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { parseAnyTopologyInput } from '../../../kernel/naming/parseAnyTopologyInput';
import { evaluate, evaluateUnique } from '../../../kernel/naming/queryEvaluator';
import type { Query, QueryAst, QueryScene } from '../../../kernel/naming/query';
import { runMcpScript } from '../runMcpScript';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { isKernelError } from '../../../shared/intent/kernelError';

export interface EvaluateQueryInput {
  file?: string;
  code?: string;
  /** Query input — either a string (`@kc[...]` or `@kcq[...]`), a JSON-AST
   *  wrapper `{ ast: <QueryAst> }`, or a live `Query<T>` value (typically
   *  only when calling from within the same process). */
  query: string | { ast: QueryAst } | Query<unknown>;
  expect?: 'any' | 'unique';
  feature_id?: string;
}

export interface EvaluateQueryEntity {
  kind: string;
  ref: string;
  handle: string;
  snapshot?: { centroid?: [number, number, number]; normal?: [number, number, number]; area?: number };
}

export type EvaluateQueryOutput =
  | {
      ok: true;
      entities: EvaluateQueryEntity[];
      /** Echo of the parsed Query, JSON-AST form (round-trippable). */
      query: { ast: QueryAst };
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
      errorHint?: string;
    };

export async function evaluateQueryTool(input: EvaluateQueryInput): Promise<EvaluateQueryOutput> {
  // ----- Parse the Query input (any form) ----------------------------------
  let query: Query<unknown>;
  try {
    query = parseAnyTopologyInput(input.query as never);
  } catch (e) {
    const code = isKernelError(e) ? e.code : 'query.invalid-syntax';
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: code,
      errorHint: HINT_TEMPLATES[code as keyof typeof HINT_TEMPLATES]?.template,
    };
  }

  // ----- Run the script + lower the target feature -------------------------
  const script = await runMcpScript(input);
  if (!script.ok) {
    return { ok: false, error: script.error, errorCode: script.errorCode };
  }
  const { run } = script;
  if (run.records.length === 0) {
    return { ok: false, error: 'evaluate_query: script returned no features.' };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const shape = r.shapes.get(targetId);
  if (!shape) {
    const fatal = r.diagnostics.find((d) => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `evaluate_query: feature '${targetId}' has no lowered shape: ${fatal.message}`
        : `evaluate_query: feature '${targetId}' has no lowered shape.`,
      errorCode: fatal?.code,
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return {
      ok: false,
      error: `evaluate_query: feature '${targetId}' did not lower to an OcctBackend shape.`,
    };
  }

  const scene: QueryScene = { backend: shape, featureId: targetId, records: run.records };

  // ----- Evaluate -----------------------------------------------------------
  try {
    if (input.expect === 'unique') {
      const e = evaluateUnique(query, scene, 'evaluate_query');
      return {
        ok: true,
        entities: [
          {
            kind: e.kind,
            ref: e.ref,
            handle: e.handle,
            ...(e.snapshot ? { snapshot: e.snapshot } : {}),
          },
        ],
        query: { ast: query.ast },
      };
    }
    const list = evaluate(query, scene);
    return {
      ok: true,
      entities: list.map((e) => ({
        kind: e.kind,
        ref: e.ref,
        handle: e.handle,
        ...(e.snapshot ? { snapshot: e.snapshot } : {}),
      })),
      query: { ast: query.ast },
    };
  } catch (e) {
    const code = isKernelError(e) ? e.code : 'unknown';
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: code,
      errorHint: HINT_TEMPLATES[code as keyof typeof HINT_TEMPLATES]?.template,
    };
  }
}
