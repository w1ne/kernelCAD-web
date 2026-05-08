// Symbolic parameter reference. See spec §E.1.
//
// A ParamRef is a branded handle returned by `kcad.param()` and `kcad.params({})`.
// Chain methods accept `Editable<T> = T | ParamRef<T>` for every editable opt;
// at capture time the proxy stores the symbolic ref in the FeatureRecord's
// `params` blob (via `Param.paramRef`); at lower time the dispatcher pre-resolves
// the ref through the session's ParamTable.
//
// As of v0.5 ParamRef<number> exposes arithmetic methods (.add, .subtract,
// .multiply, .divide, .negate) that build a structured expression AST. The
// expression is stored on `_expr` and resolved against the ParamTable at lower
// time. This lets agents write `param('r', 5).divide(2)` instead of being
// forced to use plain JS numbers (which would NaN-coerce the branded object).

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
