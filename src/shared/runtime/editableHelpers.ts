// Helpers that bridge user-side `Editable<T>` opts and capture-side `Param`
// records / numeric validation views. See spec §E.1, §E.3.

import type { EditableVec3, Param, Unit, Vec3Param } from '../intent/types';
import { isParamRef, paramExprToDebugString, type Editable } from './paramRef';
import type { ParamTable } from './paramTable';
import { resolveExpr } from './resolveParams';

/** Build a Param from an `Editable<number>` value. When the input is a
 *  ParamRef, the resulting Param carries `paramRef` so the dispatcher
 *  pre-resolve substitutes it at lower time. Leaf ParamRefs store the bare
 *  name string (back-compat with v0.4 captures); composed ParamRefs store
 *  the structured AST so the resolver can walk it. */
export function toParam(value: Editable<number>, unit: Unit): Param {
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
