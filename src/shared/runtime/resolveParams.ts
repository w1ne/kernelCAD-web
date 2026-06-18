// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Pre-resolve helpers. See spec §E.4.
//
// `resolveParams` walks a record's `params` blob and replaces every Param that
// carries a `paramRef` field with a fresh Param whose `evaluated` reflects the
// CURRENT value from the ParamTable. Plain Params (no paramRef) pass through
// unchanged. Non-Param scalars (numbers, strings, undefined, null) and arrays
// are walked but unmodified except where containing Params.
//
// `collectParamRefs` walks the same shape and collects every distinct
// `paramRef` name reached. Used at capture time to populate
// `FeatureRecord.metadata.paramRefs` for the dependency index.
//
// As of v0.4.1 a Param's `paramRef` may be either a plain string (leaf-name
// shorthand for back-compat) or a structured `ParamRefExpr` AST produced by
// the arithmetic methods on `ParamRef<number>`. Both shapes are walked here.
//
// Lowerers never call these helpers — the dispatcher pre-resolves before
// invoking the lowerer (lowerer signatures stay slice-2-stable).

import type { Param } from '../intent/types';
import { KernelError } from '../intent/kernelError';
import type { ParamTable } from './paramTable';
import type { ParamRefExpr } from './paramRef';

function isParam(v: unknown): v is Param {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Param).expression === 'string' &&
    typeof (v as Param).unit === 'string' &&
    typeof (v as Param).evaluated === 'number'
  );
}

/** Walk a ParamRefExpr against the ParamTable and return the concrete number.
 *  Looks up leaf `{ kind: 'param' }` nodes (booleans coerce to 0|1 to match the
 *  numeric-Param shape that resolveParams produces). Throws on division by
 *  zero with `feature.invalid-args`. */
export function resolveExpr(expr: ParamRefExpr, table: ParamTable): number {
  switch (expr.kind) {
    case 'lit':
      return expr.value;
    case 'param': {
      const entry = table.get(expr.name);
      if (entry.type === 'boolean') return entry.value ? 1 : 0;
      return entry.value as number;
    }
    case 'binop': {
      const l = resolveExpr(expr.left, table);
      const r = resolveExpr(expr.right, table);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) {
            throw new KernelError(
              'feature.invalid-args',
              'division by zero in ParamRef expression',
              undefined,
              `invalid-args.param.invalid-args — division by zero in ParamRef expression`,
            );
          }
          return l / r;
      }
      // Exhaustiveness: `op` is a closed union, but a defensive throw keeps
      // strict-mode compilers happy if the union grows.
      throw new KernelError(
        'feature.invalid-args',
        `unknown ParamRef binop '${(expr as { op: string }).op}'`,
        undefined,
        `invalid-args.param.invalid-args — unknown ParamRef binop`,
      );
    }
    case 'neg':
      return -resolveExpr(expr.expr, table);
  }
}

function collectExprNames(expr: ParamRefExpr, refs: Set<string>): void {
  switch (expr.kind) {
    case 'param':
      refs.add(expr.name);
      return;
    case 'lit':
      return;
    case 'binop':
      collectExprNames(expr.left, refs);
      collectExprNames(expr.right, refs);
      return;
    case 'neg':
      collectExprNames(expr.expr, refs);
      return;
  }
}

export function resolveParams<T>(blob: T, table: ParamTable): T {
  return walkResolve(blob, table) as T;
}

function walkResolve(node: unknown, table: ParamTable): unknown {
  if (node === null || node === undefined) return node;
  if (Array.isArray(node)) {
    let changed = false;
    const out: unknown[] = new Array(node.length);
    for (let i = 0; i < node.length; i++) {
      const v = walkResolve(node[i], table);
      if (v !== node[i]) changed = true;
      out[i] = v;
    }
    return changed ? out : node;
  }
  if (typeof node !== 'object') return node;
  if (isParam(node)) {
    if (!node.paramRef) return node;
    if (typeof node.paramRef === 'string') {
      const entry = table.get(node.paramRef);
      if (entry.type === 'boolean') {
        // Boolean Params: encode as evaluated 0|1 to stay number-typed; consumers
        // (lowerer dispatcher's `enabled` check) will read entry.value directly
        // through a parallel resolveBooleanParam path. For numeric-shape Params,
        // this branch shouldn't be reached because boolean values are stored as
        // their own field on the record (see capture proxy). Defensive: pass
        // through as 0/1.
        return { ...node, evaluated: entry.value ? 1 : 0 };
      }
      return { ...node, evaluated: entry.value as number };
    }
    // Structured AST: walk the expression tree against the table.
    const evaluated = resolveExpr(node.paramRef, table);
    return { ...node, evaluated };
  }
  // Plain object: walk its entries.
  const obj = node as Record<string, unknown>;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    const v = walkResolve(obj[k], table);
    if (v !== obj[k]) changed = true;
    out[k] = v;
  }
  return changed ? out : node;
}

export function collectParamRefs(blob: unknown): Set<string> {
  const refs = new Set<string>();
  walkCollect(blob, refs);
  return refs;
}

function walkCollect(node: unknown, refs: Set<string>): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walkCollect(item, refs);
    return;
  }
  if (typeof node !== 'object') return;
  if (isParam(node)) {
    if (!node.paramRef) return;
    if (typeof node.paramRef === 'string') {
      refs.add(node.paramRef);
    } else {
      collectExprNames(node.paramRef, refs);
    }
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) walkCollect(obj[k], refs);
}
