// Helpers that bridge user-side `Editable<T>` opts and capture-side `Param`
// records / numeric validation views. See spec §E.1, §E.3.

import type { Param, Unit } from '../intent/types';
import { isParamRef, type Editable } from './paramRef';
import type { ParamTable } from './paramTable';

/** Build a Param from an `Editable<number>` value. When the input is a
 *  ParamRef, the resulting Param carries `paramRef` so the dispatcher
 *  pre-resolve substitutes it at lower time. */
export function toParam(value: Editable<number>, unit: Unit): Param {
  if (isParamRef(value)) {
    return {
      expression: `{$param:${value.$param}}`,
      unit,
      evaluated: 0,
      paramRef: value.$param,
    };
  }
  return { expression: String(value), unit, evaluated: value };
}

/** Resolve an Editable<number> to its current numeric value at capture time
 *  (looking up the param table when symbolic). Used for validation, which
 *  needs concrete numbers for bounds / mutual-exclusion checks. */
export function currentValue(value: Editable<number>, table: ParamTable): number {
  if (!isParamRef(value)) return value;
  const entry = table.get(value.$param);
  return entry.value as number;
}

/** Same for Editable<boolean>. */
export function currentBool(value: Editable<boolean>, table: ParamTable): boolean {
  if (!isParamRef(value)) return value;
  const entry = table.get(value.$param);
  return entry.value as boolean;
}

/** Build a Param from an Editable<boolean>. Encodes booleans as
 *  evaluated 0|1 (unitless). Slice-3 stores `enabled` opts via this helper
 *  so the dispatcher's pre-resolve substitutes paramRefs uniformly. */
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
