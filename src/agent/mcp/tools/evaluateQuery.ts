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
import type { Query, QueryAst, QueryScene, ResolvedEntity } from '../../../kernel/naming/query';
import { runMcpScript } from '../runMcpScript';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { isKernelError } from '../../../shared/intent/kernelError';
import { captureAllFaceSnapshots, faceHashOf, surfaceTypeOf } from '../../../kernel/backends/occt/createdRefs';
import type { Face } from 'replicad';

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
  const parsed = parseQueryInput(input.query);
  if (!parsed.ok) return parsed;
  const query = (parsed as { query: Query<unknown> }).query;

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

  return evaluateQueryOnShape(query, input.expect, shape, targetId, run.records);
}

/** Evaluate an already-parsed Query against an already-lowered shape — the
 *  half of `evaluateQueryTool` that does not run the script, so a caller that
 *  holds the lowered shape (lineage mode) resolves against the SAME face
 *  hashes it will then look up, not those of a fresh run. */
export function evaluateQueryOnShape(
  query: Query<unknown>,
  expect: EvaluateQueryInput['expect'],
  shape: OcctBackend,
  featureId: string,
  records: QueryScene['records'],
): EvaluateQueryOutput {
  const scene: QueryScene = { backend: withLiveFaceGeometry(shape), featureId, records };
  try {
    return evaluateExpectation(query, expect, scene);
  } catch (e) {
    return queryErrorEnvelope(e, 'unknown');
  }
}

/** Parse any accepted Query surface into a Query, or the coded envelope. */
export function parseQueryInput(input: EvaluateQueryInput['query']): { ok: true; query: Query<unknown> } | EvaluateQueryOutput {
  try {
    return { ok: true, query: parseAnyTopologyInput(input as never) };
  } catch (e) {
    return queryErrorEnvelope(e, 'query.invalid-syntax');
  }
}

/**
 * The lowered shape with every live face's lineage entry carrying its CURRENT
 * geometry (centroid / normal / area snapshot and surface type).
 *
 * Lowerers only attach a snapshot and surface type to faces a downstream op
 * touched, so on a plain primitive (or anything before its first hole/cutout)
 * the geometric filters had nothing to read: `face(geometryType(PLANE))`
 * matched no face of a box, and `face(closestTo([x, y, z]))` ranked every
 * face at infinite distance and returned an arbitrary one. The evaluator reads
 * these fields from the lineage map, so the map handed to it is enriched from
 * the faces that actually exist. The shape's own map is left untouched.
 */
function withLiveFaceGeometry(shape: OcctBackend): OcctBackend {
  const map = shape.historyMap;
  if (map === undefined) return shape;
  const faces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;
  const live = captureAllFaceSnapshots(faces);
  const enriched = new Map(map);
  for (const face of faces) {
    const hash = faceHashOf(face);
    const lineage = enriched.get(hash);
    if (lineage === undefined) continue;
    enriched.set(hash, {
      ...lineage,
      snapshot: live.get(hash) ?? lineage.snapshot,
      surfaceType: lineage.surfaceType ?? surfaceTypeOf(face),
    });
  }
  return new OcctBackend(shape.getReplicadShape(), shape.kind, enriched);
}

function queryErrorEnvelope(e: unknown, fallbackCode: string): EvaluateQueryOutput {
  const code = isKernelError(e) ? e.code : fallbackCode;
  return {
    ok: false,
    error: e instanceof Error ? e.message : String(e),
    errorCode: code,
    errorHint: HINT_TEMPLATES[code as keyof typeof HINT_TEMPLATES]?.template,
  };
}

function evaluateExpectation(
  query: Query<unknown>,
  expect: EvaluateQueryInput['expect'],
  scene: QueryScene,
): EvaluateQueryOutput {
  if (expect === 'unique') {
    const e = evaluateUnique(query, scene, 'evaluate_query');
    return {
      ok: true,
      entities: [entityOut(e)],
      query: { ast: query.ast },
    };
  }
  const list = evaluate(query, scene);
  return {
    ok: true,
    entities: list.map(entityOut),
    query: { ast: query.ast },
  };
}

function entityOut(e: ResolvedEntity): EvaluateQueryEntity {
  return {
    kind: e.kind,
    ref: e.ref,
    handle: e.handle,
    ...(e.snapshot ? { snapshot: e.snapshot } : {}),
  };
}
