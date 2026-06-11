// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Symbolic parameter reference. See spec §E.1.
//
// A ParamRef is a branded handle returned by `kcad.param()` and `kcad.params({})`.
// Chain methods accept `Editable<T> = T | ParamRef<T>` for every editable opt;
// at capture time the proxy stores the symbolic ref in the FeatureRecord's
// `params` blob (via `Param.paramRef`); at lower time the dispatcher pre-resolves
// the ref through the session's ParamTable.
//
// As of v0.4.1 ParamRef<number> exposes arithmetic methods (.add, .subtract,
// .multiply, .divide, .negate) that build a structured expression AST. The
// expression is stored on `_expr` and resolved against the ParamTable at lower
// time. This lets agents write `param('r', 5).divide(2)` instead of plain JS
// arithmetic — which is rejected loudly: `Symbol.toPrimitive` throws on
// numeric/default coercion (see below) so `ref + 4` fails at the operator
// instead of flowing `"[object Object]4"` / NaN into geometry (#439).

import { KernelError } from '../intent/kernelError';

const PARAM_REF_BRAND = 'ParamRef' as const;

/** Structured expression AST for a ParamRef<number>. Four node kinds:
 *  param leaf, numeric literal, binary op, and negation. Walk via the resolver
 *  in `src/runtime/resolveParams.ts` to get a concrete number against a
 *  ParamTable. Boolean ParamRefs always have `kind: 'param'`. */
export type ParamRefExpr =
  | { kind: 'param'; name: string }
  | { kind: 'lit'; value: number }
  | { kind: 'binop'; op: '+' | '-' | '*' | '/'; left: ParamRefExpr; right: ParamRefExpr }
  | { kind: 'neg'; expr: ParamRefExpr };

/** Build a debug-friendly string for an expression — used to populate
 *  `ParamRef.$param` so that diagnostic messages and serialized blobs that
 *  reference the ref read sensibly. Matches a leaf's bare name and parenthesizes
 *  composed expressions, e.g. `(x / 2)`. */
export function paramExprToDebugString(expr: ParamRefExpr): string {
  switch (expr.kind) {
    case 'param':
      return expr.name;
    case 'lit':
      return String(expr.value);
    case 'binop':
      return `(${paramExprToDebugString(expr.left)} ${expr.op} ${paramExprToDebugString(expr.right)})`;
    case 'neg':
      return `(-${paramExprToDebugString(expr.expr)})`;
  }
}

export class ParamRef<T extends number | boolean = number | boolean> {
  readonly $param: string;
  readonly _brand: typeof PARAM_REF_BRAND = PARAM_REF_BRAND;
  readonly _type: T extends number ? 'number' : 'boolean';
  readonly _expr: ParamRefExpr;

  constructor(expr: ParamRefExpr, type: T extends number ? 'number' : 'boolean') {
    this._expr = expr;
    this._type = type;
    this.$param = paramExprToDebugString(expr);
    Object.freeze(this);
  }

  add(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'add');
    return new ParamRef<number>(
      { kind: 'binop', op: '+', left: this._expr, right: operandExpr(other, 'add') },
      'number',
    );
  }

  subtract(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'subtract');
    return new ParamRef<number>(
      { kind: 'binop', op: '-', left: this._expr, right: operandExpr(other, 'subtract') },
      'number',
    );
  }

  multiply(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'multiply');
    return new ParamRef<number>(
      { kind: 'binop', op: '*', left: this._expr, right: operandExpr(other, 'multiply') },
      'number',
    );
  }

  divide(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'divide');
    return new ParamRef<number>(
      { kind: 'binop', op: '/', left: this._expr, right: operandExpr(other, 'divide') },
      'number',
    );
  }

  negate(this: ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'negate');
    return new ParamRef<number>({ kind: 'neg', expr: this._expr }, 'number');
  }

  /** String contexts (template literals, String(ref)) render the symbolic
   *  expression instead of `[object Object]`, so a ref that leaks into a
   *  message or a concatenated string stays identifiable. */
  toString(): string {
    return this.$param;
  }

  /**
   * JS operators (`+ - * /`, comparisons) coerce via this hook. Deliberately
   * NOT a value-returning `valueOf`: a ParamRef has no binding to the live
   * ParamTable at authoring time, and even if it did, coercing to a plain
   * number would bake a frozen snapshot into the captured record — the
   * dimension would silently stop re-evaluating on param updates. That trades
   * a loud failure for a silent one, so numeric/default coercion throws with
   * the exact fix instead. String-hint coercion (template literals) returns
   * the symbolic expression for readable diagnostics.
   */
  [Symbol.toPrimitive](hint: string): string {
    if (hint === 'string') return this.$param;
    throw new KernelError(
      'feature.invalid-args',
      `JS arithmetic on a ParamRef is not supported: tried to coerce ParamRef '${this.$param}' to a primitive (hint: '${hint}'). The result would be a frozen number that no longer re-evaluates when the param changes.`,
      undefined,
      `invalid-args.param.js-arithmetic — use the ParamRef arithmetic methods instead of JS operators: .add(n), .subtract(n), .multiply(n), .divide(n), .negate(). Example: param('w', 18).add(4) instead of param('w', 18) + 4. These return derived ParamRefs that re-evaluate whenever the underlying param changes.`,
    );
  }
}

function assertNumericReceiver(ref: ParamRef, method: string): void {
  if (ref._type !== 'number') {
    throw new KernelError(
      'feature.invalid-args',
      `ParamRef.${method}() requires a numeric ParamRef; got '${ref._type}' ParamRef '${ref.$param}'.`,
      undefined,
      `invalid-args.param.type-mismatch — ParamRef.${method}() requires a numeric ParamRef; got '${ref._type}' ParamRef '${ref.$param}'.`,
    );
  }
}

function operandExpr(other: number | ParamRef<number>, method: string): ParamRefExpr {
  if (typeof other === 'number') {
    if (!Number.isFinite(other)) {
      throw new KernelError(
        'feature.invalid-args',
        `ParamRef.${method}() operand must be a finite number; got ${other}.`,
        undefined,
        `invalid-args.param.invalid-args — ParamRef.${method}() operand must be a finite number; got ${other}.`,
      );
    }
    return { kind: 'lit', value: other };
  }
  if (isParamRef(other)) {
    if (other._type !== 'number') {
      throw new KernelError(
        'feature.invalid-args',
        `ParamRef.${method}() operand must be a numeric ParamRef; got '${other._type}' ParamRef '${other.$param}'.`,
        undefined,
        `invalid-args.param.type-mismatch — ParamRef.${method}() operand must be a numeric ParamRef; got '${other._type}' ParamRef '${other.$param}'.`,
      );
    }
    return other._expr;
  }
  throw new KernelError(
    'feature.invalid-args',
    `ParamRef.${method}() operand must be a number or numeric ParamRef.`,
    undefined,
    `invalid-args.param.invalid-args — ParamRef.${method}() operand must be a number or numeric ParamRef.`,
  );
}

export type Editable<T extends number | boolean> = T | ParamRef<T>;

export function isParamRef(value: unknown): value is ParamRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { _brand?: unknown })._brand === PARAM_REF_BRAND &&
    typeof (value as { $param?: unknown }).$param === 'string'
  );
}

export function makeParamRef<T extends number | boolean>(
  name: string,
  type: T extends number ? 'number' : 'boolean',
): ParamRef<T> {
  return new ParamRef<T>({ kind: 'param', name }, type);
}
