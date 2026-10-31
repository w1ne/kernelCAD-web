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
// arithmetic. Plain JS arithmetic (`ref + 4`, `Math.sin(ref)`) also works
// inside a script run: the ref coerces to its current value and the param is
// recorded as coerced (see `Symbol.toPrimitive` and `bindParamCoercion`).

import { KernelError } from '../intent/kernelError';
import { invalidArgs } from '../intent/invalidArgs';

const PARAM_REF_BRAND = 'ParamRef' as const;

/** Structured expression AST for a ParamRef<number>. Node kinds: param leaf,
 *  numeric literal, binary op, negation, and the min/max/abs/clamp helpers.
 *  Walk via the resolver in `src/runtime/resolveParams.ts` to get a concrete
 *  number against a ParamTable. Boolean ParamRefs always have `kind: 'param'`. */
export type ParamRefExpr =
  | { kind: 'param'; name: string }
  | { kind: 'lit'; value: number }
  | { kind: 'binop'; op: '+' | '-' | '*' | '/'; left: ParamRefExpr; right: ParamRefExpr }
  | { kind: 'neg'; expr: ParamRefExpr }
  | { kind: 'min'; left: ParamRefExpr; right: ParamRefExpr }
  | { kind: 'max'; left: ParamRefExpr; right: ParamRefExpr }
  | { kind: 'abs'; expr: ParamRefExpr }
  | { kind: 'clamp'; value: ParamRefExpr; min: ParamRefExpr; max: ParamRefExpr };

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
    case 'min':
      return `min(${paramExprToDebugString(expr.left)}, ${paramExprToDebugString(expr.right)})`;
    case 'max':
      return `max(${paramExprToDebugString(expr.left)}, ${paramExprToDebugString(expr.right)})`;
    case 'abs':
      return `abs(${paramExprToDebugString(expr.expr)})`;
    case 'clamp':
      return `clamp(${paramExprToDebugString(expr.value)}, ${paramExprToDebugString(expr.min)}, ${paramExprToDebugString(expr.max)})`;
  }
}

export class ParamRef<T extends number | boolean = number | boolean> {
  readonly $param: string;
  readonly _brand: typeof PARAM_REF_BRAND = PARAM_REF_BRAND;
  readonly _type: T extends number ? 'number' : 'boolean';
  readonly _expr: ParamRefExpr;
  /**
   * Eager snapshot of the current value — set ONLY for boolean ParamRefs
   * (booleans have no arithmetic / composed expressions, so every boolean
   * ParamRef is a `param()`-declared leaf; there is no derived-boolean case
   * to keep in sync). Numeric ParamRefs leave this `undefined`: they stay
   * purely symbolic (`_expr` + `resolveExpr` against a live `ParamTable`)
   * so a Studio slider can re-lower a dimension without re-running the
   * whole script — collapsing to a number here would defeat that. Read
   * `b.value` in script control flow (`if (hasLid.value) {...}`), same as
   * `TypedParamRef` for choice/string params.
   */
  readonly value: T extends boolean ? boolean : undefined;

  constructor(expr: ParamRefExpr, type: T extends number ? 'number' : 'boolean', value?: T) {
    this._expr = expr;
    this._type = type;
    this.$param = paramExprToDebugString(expr);
    this.value = (type === 'boolean' ? value : undefined) as T extends boolean ? boolean : undefined;
    Object.freeze(this);
  }

  add(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'add');
    return inheritCoercion(new ParamRef<number>(
      { kind: 'binop', op: '+', left: this._expr, right: operandExpr(other, 'add') },
      'number',
    ), this, other);
  }

  subtract(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'subtract');
    return inheritCoercion(new ParamRef<number>(
      { kind: 'binop', op: '-', left: this._expr, right: operandExpr(other, 'subtract') },
      'number',
    ), this, other);
  }

  multiply(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'multiply');
    return inheritCoercion(new ParamRef<number>(
      { kind: 'binop', op: '*', left: this._expr, right: operandExpr(other, 'multiply') },
      'number',
    ), this, other);
  }

  divide(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'divide');
    return inheritCoercion(new ParamRef<number>(
      { kind: 'binop', op: '/', left: this._expr, right: operandExpr(other, 'divide') },
      'number',
    ), this, other);
  }

  negate(this: ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'negate');
    return inheritCoercion(new ParamRef<number>({ kind: 'neg', expr: this._expr }, 'number'), this);
  }

  /** Smaller of this ref and `other`; symbolic, so it re-evaluates on param
   *  changes. `min(4)` is equivalent to `clamp(-∞, 4)` without constructing
   *  infinities. */
  min(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'min');
    return inheritCoercion(new ParamRef<number>(
      { kind: 'min', left: this._expr, right: operandExpr(other, 'min') },
      'number',
    ), this, other);
  }

  /** Larger of this ref and `other`; symbolic. */
  max(this: ParamRef<number>, other: number | ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'max');
    return inheritCoercion(new ParamRef<number>(
      { kind: 'max', left: this._expr, right: operandExpr(other, 'max') },
      'number',
    ), this, other);
  }

  /** Absolute value of this ref; symbolic. */
  abs(this: ParamRef<number>): ParamRef<number> {
    assertNumericReceiver(this, 'abs');
    return inheritCoercion(new ParamRef<number>({ kind: 'abs', expr: this._expr }, 'number'), this);
  }

  /** Clamp this ref into `[min, max]`; symbolic. Both bounds accept numbers or
   *  numeric ParamRefs. Literal bounds are checked at construction so an
   *  obviously inverted range fails at the call site, not at lower time. */
  clamp(
    this: ParamRef<number>,
    min: number | ParamRef<number>,
    max: number | ParamRef<number>,
  ): ParamRef<number> {
    assertNumericReceiver(this, 'clamp');
    const minExpr = operandExpr(min, 'clamp');
    const maxExpr = operandExpr(max, 'clamp');
    if (minExpr.kind === 'lit' && maxExpr.kind === 'lit' && minExpr.value > maxExpr.value) {
      invalidArgs({
        api: 'ParamRef.clamp(min, max)',
        path: 'max',
        got: maxExpr.value,
        requires: `a finite upper bound >= min (got min=${minExpr.value})`,
        hintSlug: 'invalid-args.param.invalid-args',
        example: "param('wall', 2).clamp(1, 8)",
      });
    }
    return inheritCoercion(new ParamRef<number>({ kind: 'clamp', value: this._expr, min: minExpr, max: maxExpr }, 'number'), this, min, max);
  }

  /** String contexts (template literals, String(ref)) render the symbolic
   *  expression instead of `[object Object]`, so a ref that leaks into a
   *  message or a concatenated string stays identifiable. */
  toString(): string {
    return this.$param;
  }

  /**
   * JS operators (`+ - * /`, comparisons, `Math.*`) coerce via this hook.
   * Inside a script run, a numeric ParamRef is bound to its capture session
   * (`bindParamCoercion`): coercion returns the param's current value and
   * records the param as coerced. The number no longer tracks the param, so
   * an edit to a coerced param re-runs the script with the new default
   * (`updateModelParams`) instead of re-lowering captured records; with
   * dependency-aware reuse only the features whose inputs changed rebuild.
   * Outside a run (an unbound ref) coercion still throws, because there is
   * no value to return. String-hint coercion (template literals) returns the
   * symbolic expression for readable diagnostics.
   */
  [Symbol.toPrimitive](hint: string): string | number {
    if (hint === 'string') return this.$param;
    const coercion = COERCIONS.get(this);
    if (coercion && this._type === 'number') {
      for (const name of paramExprNames(this._expr)) coercion.noteCoerced(name);
      return evaluateParamExpr(this._expr, coercion.valueOf);
    }
    throw new KernelError(
      'feature.invalid-args',
      `JS arithmetic on a ParamRef outside a script run is not supported: tried to coerce ParamRef '${this.$param}' to a primitive (hint: '${hint}').`,
      undefined,
      `invalid-args.param.js-arithmetic — plain arithmetic on param() values works inside a .kcad.ts script; outside one, use the ParamRef methods: .add(n), .subtract(n), .multiply(n), .divide(n), .negate(), .min(n), .max(n), .abs(), .clamp(lo, hi).`,
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

/** How a numeric ParamRef reads its current value and reports a coercion,
 *  bound per capture session by `param()`. */
export interface ParamCoercion {
  valueOf: (name: string) => number;
  noteCoerced: (name: string) => void;
}

// A WeakMap, not a field: ParamRefs are frozen and serialized into records;
// the binding must not change their shape or their structural hash.
const COERCIONS = new WeakMap<object, ParamCoercion>();

/** Let `ref` (and every ParamRef derived from it) coerce to a number. */
export function bindParamCoercion<R extends ParamRef>(ref: R, coercion: ParamCoercion): R {
  COERCIONS.set(ref, coercion);
  return ref;
}

/** A derived ref coerces like the first bound ref it was built from. */
function inheritCoercion<R extends ParamRef>(result: R, ...sources: unknown[]): R {
  for (const source of sources) {
    const coercion = isParamRef(source) ? COERCIONS.get(source) : undefined;
    if (coercion) {
      COERCIONS.set(result, coercion);
      break;
    }
  }
  return result;
}

/** Leaf param names an expression reads. */
export function paramExprNames(expr: ParamRefExpr, out: Set<string> = new Set()): Set<string> {
  switch (expr.kind) {
    case 'param': out.add(expr.name); break;
    case 'lit': break;
    case 'binop': case 'min': case 'max': paramExprNames(expr.left, out); paramExprNames(expr.right, out); break;
    case 'neg': case 'abs': paramExprNames(expr.expr, out); break;
    case 'clamp': paramExprNames(expr.value, out); paramExprNames(expr.min, out); paramExprNames(expr.max, out); break;
  }
  return out;
}

/** Evaluate an expression with `valueOf` for each param leaf. */
export function evaluateParamExpr(expr: ParamRefExpr, valueOf: (name: string) => number): number {
  const ev = (e: ParamRefExpr): number => {
    switch (e.kind) {
      case 'param': return valueOf(e.name);
      case 'lit': return e.value;
      case 'neg': return -ev(e.expr);
      case 'abs': return Math.abs(ev(e.expr));
      case 'min': return Math.min(ev(e.left), ev(e.right));
      case 'max': return Math.max(ev(e.left), ev(e.right));
      case 'clamp': return Math.min(Math.max(ev(e.value), ev(e.min)), ev(e.max));
      case 'binop': {
        const l = ev(e.left), r = ev(e.right);
        return e.op === '+' ? l + r : e.op === '-' ? l - r : e.op === '*' ? l * r : l / r;
      }
    }
  };
  return ev(expr);
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
  value?: T,
): ParamRef<T> {
  return new ParamRef<T>({ kind: 'param', name }, type, value);
}

/**
 * Typed (non-numeric-arithmetic) parameter kinds. `choice` and `string`
 * params never participate in the symbolic ParamRef expression AST used by
 * numbers — there is no meaningful "add 2 to a choice". Instead they resolve
 * EAGERLY at `param()` call time: the ref simply carries the current value
 * (the default at declare time, which is what `set_param` rewrites and the
 * script re-evaluates against). Script bodies read `.value` — e.g.
 * `if (HasLid.value) { ... }` or `sketch.text(Label.value)` — instead of a
 * symbolic re-evaluation against a live ParamTable. This is documented in
 * the typed-params spec: simplest-correct option, since these values drive
 * control flow / lookups / text content rather than dimensions, and don't
 * need to re-evaluate downstream geometry expressions the way numeric
 * ParamRefs do.
 */
export type TypedParamKind = 'choice' | 'string' | 'color';

export class TypedParamRef<T extends string = string> {
  readonly $param: string;
  readonly _brand: typeof PARAM_REF_BRAND = PARAM_REF_BRAND;
  readonly _type: TypedParamKind;
  readonly value: T;

  constructor(name: string, type: TypedParamKind, value: T) {
    this.$param = name;
    this._type = type;
    this.value = value;
    Object.freeze(this);
  }

  toString(): string {
    return this.value;
  }

  [Symbol.toPrimitive](hint: string): string {
    if (hint === 'string' || hint === 'default') return this.value;
    throw new KernelError(
      'feature.invalid-args',
      `A '${this._type}' ParamRef ('${this.$param}') cannot be coerced to a number. Use .value for the string, or String(ref) / template literals.`,
      undefined,
      `invalid-args.param.type-mismatch — a '${this._type}' ParamRef cannot be coerced to a number; use .value.`,
    );
  }
}

export function isTypedParamRef(value: unknown): value is TypedParamRef {
  const type = isParamRef(value) ? (value as { _type?: unknown })._type : undefined;
  return type === 'choice' || type === 'string' || type === 'color';
}

export function makeTypedParamRef<T extends string = string>(
  name: string,
  type: TypedParamKind,
  value: T,
): TypedParamRef<T> {
  return new TypedParamRef<T>(name, type, value);
}
