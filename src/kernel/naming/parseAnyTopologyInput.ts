// src/kernel/naming/parseAnyTopologyInput.ts
//
// Q7 — MCP-boundary dispatcher per spec §3.7. The single entry-point every
// MCP tool input goes through so the kernel sees one Query type regardless
// of which surface syntax the agent reaches for.
//
// Dispatch rules (prefix-based, no ambiguity by construction):
//   @kc[...]      → parseTopoRef + topoRefAsQuery  (F-surface, simple refs)
//   @kcq[...]     → parseQuery                     (Q DSL, composed)
//   {...} object  → reconstruct Query from JSON-AST (agent-passed data)
//   JSON-AST str  → JSON.parse + reconstruct
//   Query value   → passthrough unchanged
//
// Strings-as-sugar (D0.1 (c)) holds because every dispatch branch returns
// a Query value with the same internal AST shape — kc.q.face(...) and
// `@kc[arm/face/top]` and `@kcq[face(createdBy("arm"), withLabel("top"))]`
// all flow through the same evaluator.

import { KernelError } from '../../shared/intent/kernelError';
import { parseTopoRef } from './topoRef';
import { topoRefAsQuery } from './topoRefAsQuery';
import { parseQuery } from './parseQuery';
import { makeQuery, type Query, type QueryAst, type QueryKind } from './query';

/** True when the value is the runtime-tagged Query record built by makeQuery. */
function isQueryValue(input: unknown): input is Query<unknown> {
  return (
    typeof input === 'object' &&
    input !== null &&
    (input as { _kind?: unknown })._kind === 'kc.query'
  );
}

/** True when the value is a JSON-AST-bearing wrapper ({ ast: ... }) — used
 *  when an MCP tool passes the JSON form an agent stored after inspecting
 *  list_faces / inspect_assembly output. */
function isAstWrapper(input: unknown): input is { ast: QueryAst } {
  return (
    typeof input === 'object' &&
    input !== null &&
    'ast' in input &&
    typeof (input as { ast: unknown }).ast === 'object' &&
    (input as { ast: { op?: unknown } }).ast !== null &&
    typeof (input as { ast: { op?: unknown } }).ast.op === 'string'
  );
}

export function parseAnyTopologyInput(
  input: string | Query<unknown> | { ast: QueryAst },
): Query<unknown> {
  // ----- Object forms ------------------------------------------------------
  if (typeof input === 'object' && input !== null) {
    if (isQueryValue(input)) return input;
    if (isAstWrapper(input)) return reconstructFromAst(input.ast);
    throw new KernelError(
      'query.invalid-syntax',
      `topology input object is neither a Query value nor a JSON-AST wrapper { ast: ... }.`,
      undefined,
      `Pass a Query value (kc.q.face(...) etc), a JSON-AST { ast: { op: '...', ... } }, an @kc[<owner>/<kind>/<name>] string, or an @kcq[<expr>] string.`,
    );
  }

  // ----- Non-string non-object: fail loudly --------------------------------
  if (typeof input !== 'string') {
    throw new KernelError(
      'query.invalid-syntax',
      `topology input must be a Query value, a @kc[...] / @kcq[...] string, or a JSON-AST object; got ${typeof input}.`,
      undefined,
      `Pass a string ref ('@kc[...]' or '@kcq[...]') or a Query value (kc.q.face(...) etc).`,
    );
  }

  // ----- String forms ------------------------------------------------------
  // Order matters: @kcq[ must be checked BEFORE @kc[ because @kcq[ starts
  // with the @kc[ prefix as a substring (well, @kc — but not @kc[).
  if (input.startsWith('@kcq[')) return parseQuery(input);
  if (input.startsWith('@kc[')) {
    const parsed = parseTopoRef(input);
    if ('error' in parsed) {
      throw new KernelError(
        'query.invalid-syntax',
        `the input '${input}' has the @kc[ prefix but is malformed: ${parsed.error}.`,
        undefined,
        `Check the grammar: '@kc[<owner>/<kind>/<name>]' where <kind> is face/edge/vertex/connector/part/solid/sketch. See the kernelcad-mcp SKILL for the full @kc[...] grammar.`,
      );
    }
    return topoRefAsQuery(parsed);
  }
  // JSON-AST string form: try to parse as JSON.
  if (input.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(input);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'op' in (parsed as object) &&
        typeof (parsed as { op: unknown }).op === 'string'
      ) {
        return reconstructFromAst(parsed as QueryAst);
      }
    } catch {
      // fall through to invalid-syntax
    }
  }
  throw new KernelError(
    'query.invalid-syntax',
    `the input '${input}' is neither a valid @kc[...] ref nor a valid @kcq[...] Query DSL nor a JSON-AST.`,
    undefined,
    `Check the syntax: '@kc[<owner>/<kind>/<name>]' for simple refs, '@kcq[<expr>]' for composed queries. See the kernelcad-mcp SKILL for the full grammar.`,
  );
}

function reconstructFromAst(ast: QueryAst): Query<unknown> {
  const target: QueryKind | 'any' =
    ast.op === 'entityFilter'
      ? ast.kind
      : ast.op === 'everything'
        ? ast.kind
        : 'any';
  return makeQuery<unknown>(target, ast);
}
