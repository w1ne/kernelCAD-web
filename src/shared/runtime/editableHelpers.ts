// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Helpers that bridge user-side `Editable<T>` opts and capture-side `Param`
// records / numeric validation views. See spec §E.1, §E.3.

import type { EditableVec3, Param, Unit, Vec3Param } from '../intent/types';
import { ParamRef, isParamRef, isTypedParamRef, paramExprToDebugString, type Editable, type ParamRefExpr } from './paramRef';
import type { ParamTable } from './paramTable';
import { resolveExpr } from './resolveParams';
import { KernelError } from '../intent/kernelError';

/** Build a Param from an `Editable<number>` value. When the input is a
 *  ParamRef, the resulting Param carries `paramRef` so the dispatcher
 *  pre-resolve substitutes it at lower time. Leaf ParamRefs store the bare
 *  name string (back-compat with v0.4 captures); composed ParamRefs store
 *  the structured AST so the resolver can walk it.
 *
 *  A `choice`/`string` TypedParamRef is not assignable to `Editable<number>`
 *  in the type system (see `KernelCadApi.param` overloads), so this only
 *  fires if a script bypasses typing (e.g. `as any`). Fail loudly instead of
 *  crashing on the missing `_expr` field. */
export function toParam(value: Editable<number>, unit: Unit): Param {
  if (isTypedParamRef(value)) {
    throw new KernelError(
      'feature.invalid-args',
      `A '${value._type}' ParamRef ('${value.$param}') cannot be used where a number is expected. Use .value for the string, or a numeric param() instead.`,
      undefined,
      `invalid-args.param.type-mismatch — a '${value._type}' ParamRef cannot be used as a numeric Editable; use .value.`,
    );
  }
  if (isParamRef(value)) {
    const expr = value._expr;
    if (expr.kind === 'param') {
      return {
        expression: `{$param:${expr.name}}`,
        unit,
        evaluated: 0,
        paramRef: expr.name,
      };
    }
    return {
      expression: `{$paramExpr:${paramExprToDebugString(expr)}}`,
      unit,
      evaluated: 0,
      paramRef: expr,
    };
  }
  return { expression: String(value), unit, evaluated: value };
}

/** Convert an EditableVec3 (3-tuple of number|ParamRef) to a Vec3Param
 *  (named struct of three Params). Single helper used by all transform +
 *  assembly capture sites. */
export function toVec3Param(
  input: EditableVec3,
  unit: Unit,
): Vec3Param {
  // Vec3Param passthrough: agent passed `connector.worldOrigin` or similar.
  // Trust the existing Param shapes; do not re-wrap (would lose the
  // symbolic paramRef chain). Unit override is intentionally ignored on
  // this path — the input Params already declare their unit.
  if (!Array.isArray(input)) {
    return input;
  }
  return {
    x: toParam(input[0], unit),
    y: toParam(input[1], unit),
    z: toParam(input[2], unit),
  };
}

/** Resolve a Vec3Param against the live ParamTable to a concrete numeric
 *  Vec3 at lower time. Each Param is walked via the existing resolver, so
 *  ParamRefExpr ASTs (e.g. `param('x', 10).divide(2)`) are evaluated. */
export function resolveVec3Param(
  v: Vec3Param,
  table: ParamTable,
): [number, number, number] {
  return [
    resolveParamScalar(v.x, table),
    resolveParamScalar(v.y, table),
    resolveParamScalar(v.z, table),
  ];
}

function resolveParamScalar(p: Param, table: ParamTable): number {
  if (p.paramRef === undefined) return p.evaluated;
  if (typeof p.paramRef === 'string') {
    return table.get(p.paramRef).value as number;
  }
  return resolveExpr(p.paramRef, table);
}

/** Current numeric value of an already-captured Param. A symbolic Param's
 *  `evaluated` is a capture-time placeholder (0) until the dispatcher
 *  pre-resolves it, so capture-time VALIDATION must read the value through
 *  the table instead — never through `.evaluated`. */
export function paramValue(p: Param, table: ParamTable): number {
  return resolveParamScalar(p, table);
}

/** The symbolic view of a captured Param: its ParamRef expression, or a
 *  literal for a plain number. */
export function paramExpr(p: Param): ParamRefExpr {
  if (p.paramRef === undefined) return { kind: 'lit', value: p.evaluated };
  if (typeof p.paramRef === 'string') return { kind: 'param', name: p.paramRef };
  return p.paramRef;
}

/** Fold literal-only subtrees so arithmetic on plain numbers stays a plain
 *  number (and a record built from numbers is byte-identical to one built by
 *  `toParam(number)`). */
function foldExpr(expr: ParamRefExpr): ParamRefExpr {
  switch (expr.kind) {
    case 'lit':
    case 'param':
      return expr;
    case 'neg': {
      const inner = foldExpr(expr.expr);
      return inner.kind === 'lit' ? { kind: 'lit', value: -inner.value } : { kind: 'neg', expr: inner };
    }
    case 'binop': {
      const left = foldExpr(expr.left);
      const right = foldExpr(expr.right);
      if (left.kind === 'lit' && right.kind === 'lit' && !(expr.op === '/' && right.value === 0)) {
        const l = left.value;
        const r = right.value;
        const value = expr.op === '+' ? l + r : expr.op === '-' ? l - r : expr.op === '*' ? l * r : l / r;
        return { kind: 'lit', value };
      }
      return { kind: 'binop', op: expr.op, left, right };
    }
  }
}

/** Build a Param from an expression AST. Literal-only expressions collapse to
 *  a plain numeric Param (with -0 normalised to 0); anything that references a
 *  param stays symbolic and is resolved at lower time like any other
 *  ParamRef. */
export function paramFromExpr(expr: ParamRefExpr, unit: Unit): Param {
  const folded = foldExpr(expr);
  if (folded.kind === 'lit') {
    const v = folded.value === 0 ? 0 : folded.value;
    return toParam(v, unit);
  }
  return toParam(new ParamRef<number>(folded, 'number'), unit);
}

/** Resolve an Editable<number> to its current numeric value at capture time
 *  (looking up the param table when symbolic). Used for validation, which
 *  needs concrete numbers for bounds / mutual-exclusion checks. Composed
 *  ParamRefs are evaluated against the table via the same expression walker
 *  the dispatcher uses at lower time. */
export function currentValue(value: Editable<number>, table: ParamTable): number {
  if (!isParamRef(value)) return value;
  return resolveExpr(value._expr, table);
}

/** Same for Editable<boolean>. */
export function currentBool(value: Editable<boolean>, table: ParamTable): boolean {
  if (!isParamRef(value)) return value;
  const entry = table.get(value.$param);
  return entry.value as boolean;
}

/** Build a Param from an Editable<boolean>. Encodes booleans as
 *  evaluated 0|1 (unitless). Slice-3 stores `enabled` opts via this helper
 *  so the dispatcher's pre-resolve substitutes paramRefs uniformly. Boolean
 *  ParamRefs are leaves only (not composable per design), so the stored
 *  paramRef is always a bare name string. */
export function toBoolParam(value: Editable<boolean>): Param {
  if (isParamRef(value)) {
    return {
      expression: `{$param:${value.$param}}`,
      unit: 'unitless',
      evaluated: 0,
      paramRef: value.$param,
    };
  }
  return {
    expression: String(value),
    unit: 'unitless',
    evaluated: value ? 1 : 0,
  };
}
