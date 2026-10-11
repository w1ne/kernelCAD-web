// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateQueryTool } from './evaluateQuery';
import { resolveTopoRefTool } from './resolveTopoRef';
import { getFaceLineageTool } from './getFaceLineage';

/** Topology-resolution mode. */
export type QueryMode = 'evaluate' | 'resolve' | 'lineage';

const MODES: readonly QueryMode[] = ['evaluate', 'resolve', 'lineage'];

export interface QueryInput {
  /** Defaults to 'evaluate' (the Query-DSL inspector). */
  mode?: QueryMode;
  /**
   * Mode-specific params, forwarded verbatim:
   * - evaluate: { query, expect?, file?, code?, feature_id? }
   * - resolve:  { ref, file?, code?, feature_id? }
   * - lineage:  { feature_id, ref, file?, code? }
   */
  [key: string]: unknown;
}

/** Worked examples quoted in every argument diagnostic, so a caller that got
 *  the grammar wrong sees a form that works rather than only the rule. */
export const QUERY_EXAMPLES =
  `query({ code, query: '@kcq[face(geometryType(PLANE))]' }), ` +
  `query({ code, query: '@kc[box_1/face/top]' }), ` +
  `query({ code, query: 'top' }), ` +
  `query({ mode: 'resolve', code, ref: '@kc[box_1/face/top]' })`;

export interface QueryArgError {
  ok: false;
  error: string;
  errorCode: 'cli.invalid-args';
}

function argError(message: string): QueryArgError {
  return { ok: false, error: `query: ${message} Examples: ${QUERY_EXAMPLES}.`, errorCode: 'cli.invalid-args' };
}

/** A bare face label ('top', 'lid', 'wall') — the commonest first guess at
 *  the grammar. It has exactly one sensible reading. */
const BARE_LABEL = /^[A-Za-z_][\w-]*$/;

/** evaluate: the Query arrives as `query` (documented) or `ref` (the name the
 *  other two modes use); a bare label is sugar for withLabel. */
function evaluateArgs(rest: Record<string, unknown>): Record<string, unknown> | QueryArgError {
  const { ref, ...others } = rest;
  const q = others.query ?? ref;
  if (q === undefined || q === null || q === '') {
    return argError("mode 'evaluate' needs `query` — an @kc[owner/face/label] ref, an @kcq[...] expression, a bare face label, or { ast }; it was missing.");
  }
  if (typeof q === 'string' && BARE_LABEL.test(q.trim())) {
    return { ...others, query: `@kcq[face(withLabel("${q.trim()}"))]`, __interpretedAs: true };
  }
  return { ...others, query: q };
}

/** resolve / lineage: the ref arrives as `ref` (documented) or `query`. */
function refArgs(mode: 'resolve' | 'lineage', rest: Record<string, unknown>): Record<string, unknown> | QueryArgError {
  const { query, ...others } = rest;
  const ref = others.ref ?? query;
  if (typeof ref !== 'string' || ref.trim() === '') {
    return argError(
      `mode '${mode}' needs \`ref\` as a string (e.g. '@kc[box_1/face/top]'); got ${JSON.stringify(ref) ?? 'undefined'}.`,
    );
  }
  return { ...others, ref };
}

async function runEvaluate(rest: Record<string, unknown>): Promise<unknown> {
  const args = evaluateArgs(rest);
  if ('ok' in args && args.ok === false) return args;
  const { __interpretedAs, ...forward } = args as Record<string, unknown>;
  const out = await evaluateQueryTool(forward as unknown as Parameters<typeof evaluateQueryTool>[0]);
  return __interpretedAs === true && out.ok ? { ...out, interpretedAs: forward.query } : out;
}

/**
 * Topology query/resolution entrypoint. Replaces evaluate_query (mode:'evaluate',
 * the default), resolve_topo_ref (mode:'resolve'), and get_face_lineage
 * (mode:'lineage'). Routes on `mode`; normalises the argument names callers
 * reach for (`ref` vs `query`) and answers an unknown mode or a missing Query
 * with a coded `cli.invalid-args` result instead of throwing.
 */
export function queryTool(input: QueryInput): Promise<unknown> {
  const { mode = 'evaluate', ...rest } = input;
  switch (mode) {
    case 'evaluate':
      return runEvaluate(rest);
    case 'resolve': {
      const args = refArgs('resolve', rest);
      return 'ok' in args ? Promise.resolve(args) : resolveTopoRefTool(args as unknown as Parameters<typeof resolveTopoRefTool>[0]);
    }
    case 'lineage': {
      const args = refArgs('lineage', rest);
      return 'ok' in args ? Promise.resolve(args) : getFaceLineageTool(args as unknown as Parameters<typeof getFaceLineageTool>[0]);
    }
    default:
      return Promise.resolve(
        argError(`unknown mode ${JSON.stringify(mode)}; valid modes are ${MODES.map(m => `'${m}'`).join(', ')}.`),
      );
  }
}
