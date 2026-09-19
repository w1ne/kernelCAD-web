// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/parseQuery.ts
//
// Q7 — @kcq[...] string DSL parser. Hand-rolled recursive descent per
// spec §13 (eliminating a parser-generator dep keeps the bundle thin) and
// R7.8 (unbounded lookahead via bracket-depth tracking, not regex). Emits
// the same QueryAst that the kc.q.* constructor namespace produces, so
// the round-trip `parseQuery(formatQueryAsString(q)).ast === q.ast` holds
// for every shape the constructors can build.
//
// Coexistence with @kc[...] (F-surface): parseQuery handles ONLY the
// @kcq[ prefix. The unified dispatcher parseAnyTopologyInput in
// parseAnyTopologyInput.ts picks the right parser by prefix and routes
// bare @kc[...] refs to parseTopoRef + topoRefAsQuery instead.

import { KernelError } from '../../shared/intent/kernelError';
import {
  makeQuery,
  __installQueryStringifier,
  type Query,
  type QueryAst,
  type QueryKind,
  type GeometryType,
} from './query';

const KINDS: ReadonlySet<QueryKind> = new Set<QueryKind>([
  'face',
  'edge',
  'vertex',
  'connector',
  'part',
  'solid',
]);

const GEOM_TYPES: ReadonlySet<GeometryType> = new Set<GeometryType>([
  'PLANE',
  'CYLINDER',
  'CONE',
  'SPHERE',
  'TORUS',
  'BSPLINE_SURFACE',
  'LINE',
  'CIRCLE',
  'BSPLINE_CURVE',
  'OTHER',
]);

interface ParserState {
  input: string;
  pos: number;
}

function fail(msg: string, raw: string, pos?: number): never {
  const where = pos !== undefined ? ` at position ${pos}` : '';
  throw new KernelError(
    'query.invalid-syntax',
    `the input '${raw}' is not a valid @kcq[...] Query DSL: ${msg}${where}.`,
    undefined,
    `Check the syntax: '@kcq[<expr>]' where <expr> is face(...), edge(...), union(...), intersection(...), subtraction(a,b), or a filter. See the kernelcad-mcp SKILL for the full grammar.`,
  );
}

function peek(s: ParserState): string {
  return s.input[s.pos] ?? '';
}

function advance(s: ParserState, n = 1): void {
  s.pos += n;
}

function skipWs(s: ParserState): void {
  while (s.pos < s.input.length && /\s/.test(s.input[s.pos] ?? '')) s.pos++;
}

function expectChar(s: ParserState, c: string): void {
  skipWs(s);
  if (peek(s) !== c) fail(`expected '${c}' but got '${peek(s)}'`, s.input, s.pos);
  advance(s);
}

function readIdent(s: ParserState): string {
  skipWs(s);
  const start = s.pos;
  while (s.pos < s.input.length && /[A-Za-z0-9_-]/.test(s.input[s.pos] ?? '')) s.pos++;
  if (s.pos === start) fail(`expected identifier`, s.input, s.pos);
  return s.input.slice(start, s.pos);
}

function readString(s: ParserState): string {
  skipWs(s);
  if (peek(s) !== '"') fail(`expected '"' to begin a quoted string`, s.input, s.pos);
  advance(s);
  const start = s.pos;
  while (s.pos < s.input.length && s.input[s.pos] !== '"') s.pos++;
  if (s.pos >= s.input.length) fail(`unterminated string`, s.input, s.pos);
  const value = s.input.slice(start, s.pos);
  advance(s); // consume closing "
  return value;
}

function readNumber(s: ParserState): number {
  skipWs(s);
  const start = s.pos;
  if (peek(s) === '-') advance(s);
  while (s.pos < s.input.length && /[0-9.]/.test(s.input[s.pos] ?? '')) s.pos++;
  const text = s.input.slice(start, s.pos);
  const n = Number(text);
  if (Number.isNaN(n)) fail(`expected number, got '${text}'`, s.input, start);
  return n;
}

function readInteger(s: ParserState): number {
  const n = readNumber(s);
  if (!Number.isInteger(n)) fail(`expected integer, got ${n}`, s.input, s.pos);
  return n;
}

function readPoint(s: ParserState): [number, number, number] {
  expectChar(s, '[');
  const x = readNumber(s);
  expectChar(s, ',');
  const y = readNumber(s);
  expectChar(s, ',');
  const z = readNumber(s);
  expectChar(s, ']');
  return [x, y, z];
}

/** Parse a full @kcq[...] string into a Query value. Throws KernelError
 *  with code 'query.invalid-syntax' on any grammar violation. */
export function parseQuery(input: string): Query<unknown> {
  if (typeof input !== 'string' || !input.startsWith('@kcq[') || !input.endsWith(']')) {
    fail(`missing @kcq[...] wrapper`, typeof input === 'string' ? input : String(input));
  }
  // Bracket-depth scan to find the matching outer ']'. Same approach as
  // parseTopoRef per F-foundation F0.1 — handles inner brackets in
  // closestTo([x,y,z]) etc.
  const bodyStart = '@kcq['.length;
  const bodyEnd = input.length - 1;
  let depth = 1;
  for (let i = bodyStart; i < bodyEnd; i++) {
    if (input[i] === '[') depth++;
    else if (input[i] === ']') depth--;
    if (depth === 0) {
      fail(
        `unbalanced brackets — closing ']' at offset ${i} ends the @kcq[ wrapper before the final character`,
        input,
        i,
      );
    }
  }
  if (depth !== 1) fail(`unbalanced brackets inside @kcq[ body`, input);
  const state: ParserState = { input: input.slice(bodyStart, bodyEnd), pos: 0 };
  const ast = parseExpr(state);
  skipWs(state);
  if (state.pos < state.input.length) {
    fail(`unexpected trailing content '${state.input.slice(state.pos)}'`, input, state.pos);
  }
  return astToQuery(ast);
}

function parseNothing(s: ParserState): QueryAst {
  expectChar(s, ')');
  return { op: 'nothing' };
}

function parseEverything(s: ParserState): QueryAst {
  const kindName = readIdent(s);
  if (!KINDS.has(kindName as QueryKind)) fail(`unknown kind '${kindName}'`, s.input, s.pos);
  expectChar(s, ')');
  return { op: 'everything', kind: kindName as QueryKind };
}

function parseKindFilterExpr(s: ParserState, ident: string): QueryAst {
  const filters = parseExprList(s);
  expectChar(s, ')');
  return composeKindFilters(ident as QueryKind, filters);
}

function parseSetExpr(s: ParserState, ident: string): QueryAst {
  const queries = parseExprList(s);
  expectChar(s, ')');
  return { op: ident as 'union' | 'intersection', queries };
}

function parseSubtraction(s: ParserState): QueryAst {
  const a = parseExpr(s);
  expectChar(s, ',');
  const b = parseExpr(s);
  expectChar(s, ')');
  return { op: 'subtraction', a, b };
}

function parseCreatedBy(s: ParserState): QueryAst {
  const id = readString(s);
  let kind: QueryKind | undefined;
  skipWs(s);
  if (peek(s) === ',') {
    advance(s);
    const k = readIdent(s);
    if (!KINDS.has(k as QueryKind)) fail(`unknown kind '${k}'`, s.input, s.pos);
    kind = k as QueryKind;
  }
  expectChar(s, ')');
  return kind ? { op: 'createdBy', id, kind } : { op: 'createdBy', id };
}

function parseUnaryExpr(s: ParserState, ident: string): QueryAst {
  const query = parseExpr(s);
  expectChar(s, ')');
  return { op: ident as 'ownedByPart' | 'ownerPart', query };
}

function parseContainsPoint(s: ParserState): QueryAst {
  const point = readPoint(s);
  expectChar(s, ')');
  return { op: 'containsPoint', query: { op: 'nothing' }, point };
}

function parseClosestTo(s: ParserState): QueryAst {
  const point = readPoint(s);
  let k: number | undefined;
  skipWs(s);
  if (peek(s) === ',') {
    advance(s);
    k = readInteger(s);
  }
  expectChar(s, ')');
  return k !== undefined
    ? { op: 'closestTo', query: { op: 'nothing' }, point, k }
    : { op: 'closestTo', query: { op: 'nothing' }, point };
}

function parseGeometryType(s: ParserState): QueryAst {
  const t = readIdent(s);
  if (!GEOM_TYPES.has(t as GeometryType)) {
    fail(`unknown geometry type '${t}'`, s.input, s.pos);
  }
  expectChar(s, ')');
  return { op: 'geometryType', query: { op: 'nothing' }, geomType: t as GeometryType };
}

function parseWithLabel(s: ParserState): QueryAst {
  const label = readString(s);
  expectChar(s, ')');
  return { op: 'withLabel', query: { op: 'nothing' }, label };
}

function parseWithFeatureName(s: ParserState): QueryAst {
  const name = readString(s);
  expectChar(s, ')');
  return { op: 'withFeatureName', query: { op: 'nothing' }, name };
}

function parseNthElement(s: ParserState): QueryAst {
  const query = parseExpr(s);
  expectChar(s, ',');
  const index = readInteger(s);
  expectChar(s, ')');
  return { op: 'nthElement', query, index };
}

function parseFromString(s: ParserState): QueryAst {
  const ref = readString(s);
  expectChar(s, ')');
  return { op: 'fromString', ref };
}

type ExprHandler = (s: ParserState, ident: string) => QueryAst;

const EXPR_HANDLERS: ReadonlyMap<string, ExprHandler> = new Map<string, ExprHandler>([
  ['nothing', parseNothing],
  ['everything', parseEverything],
  ['face', parseKindFilterExpr],
  ['edge', parseKindFilterExpr],
  ['vertex', parseKindFilterExpr],
  ['connector', parseKindFilterExpr],
  ['part', parseKindFilterExpr],
  ['solid', parseKindFilterExpr],
  ['union', parseSetExpr],
  ['intersection', parseSetExpr],
  ['subtraction', parseSubtraction],
  ['createdBy', parseCreatedBy],
  ['ownedByPart', parseUnaryExpr],
  ['ownerPart', parseUnaryExpr],
  ['containsPoint', parseContainsPoint],
  ['closestTo', parseClosestTo],
  ['geometryType', parseGeometryType],
  ['withLabel', parseWithLabel],
  ['withFeatureName', parseWithFeatureName],
  ['nthElement', parseNthElement],
  ['fromString', parseFromString],
]);

function parseExpr(s: ParserState): QueryAst {
  const ident = readIdent(s);
  expectChar(s, '(');
  const handler = EXPR_HANDLERS.get(ident);
  if (!handler) fail(`unknown Query constructor '${ident}'`, s.input, s.pos);
  return handler(s, ident);
}

function parseExprList(s: ParserState): QueryAst[] {
  const out: QueryAst[] = [];
  skipWs(s);
  if (peek(s) === ')') return out;
  out.push(parseExpr(s));
  skipWs(s);
  while (peek(s) === ',') {
    advance(s);
    out.push(parseExpr(s));
    skipWs(s);
  }
  return out;
}

function composeKindFilters(kind: QueryKind, filters: QueryAst[]): QueryAst {
  if (filters.length === 0) {
    return { op: 'everything', kind };
  }
  const filterAst: QueryAst =
    filters.length === 1 ? (filters[0] as QueryAst) : { op: 'intersection', queries: filters };
  return { op: 'entityFilter', query: filterAst, kind };
}

function astToQuery(ast: QueryAst): Query<unknown> {
  const target: QueryKind | 'any' =
    ast.op === 'entityFilter'
      ? ast.kind
      : ast.op === 'everything'
        ? ast.kind
        : 'any';
  return makeQuery<unknown>(target, ast);
}

/** Inverse of parseQuery — serializes a Query value back to @kcq[...] form.
 *  Round-trips: parseQuery(formatQueryAsString(q)).ast equals q.ast.
 *  Also used by Query.toString() chainable per spec §3.3. */
export function formatQueryAsString(q: Query<unknown>): string {
  return `@kcq[${formatAst(q.ast)}]`;
}

function formatAst(ast: QueryAst): string {
  switch (ast.op) {
    case 'nothing':
      return 'nothing()';
    case 'everything':
      return `everything(${ast.kind})`;
    case 'createdBy':
      return `createdBy("${ast.id}"${ast.kind ? `, ${ast.kind}` : ''})`;
    case 'ownedByPart':
      return `ownedByPart(${formatAst(ast.query)})`;
    case 'ownerPart':
      return `ownerPart(${formatAst(ast.query)})`;
    case 'union':
      return `union(${ast.queries.map(formatAst).join(', ')})`;
    case 'intersection':
      return `intersection(${ast.queries.map(formatAst).join(', ')})`;
    case 'subtraction':
      return `subtraction(${formatAst(ast.a)}, ${formatAst(ast.b)})`;
    case 'containsPoint':
      return `containsPoint([${ast.point.join(',')}])`;
    case 'closestTo':
      return `closestTo([${ast.point.join(',')}]${ast.k !== undefined ? `, ${ast.k}` : ''})`;
    case 'geometryType':
      return `geometryType(${ast.geomType})`;
    case 'entityFilter': {
      const inner = ast.query;
      if (inner.op === 'intersection') {
        return `${ast.kind}(${inner.queries.map(formatAst).join(', ')})`;
      }
      if (inner.op === 'everything' && inner.kind === ast.kind) {
        return `${ast.kind}()`;
      }
      return `${ast.kind}(${formatAst(inner)})`;
    }
    case 'withLabel':
      return `withLabel("${ast.label}")`;
    case 'withFeatureName':
      return `withFeatureName("${ast.name}")`;
    case 'nthElement':
      return `nthElement(${formatAst(ast.query)}, ${ast.index})`;
    case 'fromString':
      return `fromString("${ast.ref}")`;
  }
}

// ---------------------------------------------------------------------------
// Side-effect: install the stringifier on the Query module so the
// `.toString()` chainable returns the canonical @kcq[...] form instead of
// the pre-install debug fallback. Same pattern as queryEvaluator.ts.
// ---------------------------------------------------------------------------

__installQueryStringifier(formatQueryAsString);

