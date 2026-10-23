// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/paramValidation.ts
//
// Check a parameter edit against the declaration BEFORE it is applied, so an
// invalid value never starts a rebuild and the model on screen stays the last
// valid one. Type, range and choices are checked by the kernel's own
// ParamTable (the same messages a script gets); the slider step is checked
// here because the table treats it as presentation only.

import { ParamTable, type SerializedParamEntry, type SerializedParamTable } from '../../shared/runtime/paramTable';

export interface ParamEditInput {
  name: string;
  value: number | boolean | string;
}

/** Tolerance on a step multiple: slider values accumulate float error. */
const STEP_EPSILON = 1e-6;

function onGrid(value: number, base: number, step: number): boolean {
  const multiples = (value - base) / step;
  return Math.abs(multiples - Math.round(multiples)) <= STEP_EPSILON * Math.max(1, Math.abs(multiples));
}

/** A value is on the step grid anchored at `min` (or 0) — or at the declared
 *  default, which the script author chose and the slider starts from. */
function stepError(entry: SerializedParamEntry, value: number): string | null {
  const step = entry.meta?.step;
  if (!step || step <= 0) return null;
  if (onGrid(value, entry.meta?.min ?? 0, step)) return null;
  if (typeof entry.defaultValue === 'number' && onGrid(value, entry.defaultValue, step)) return null;
  return `param '${entry.name}': ${value} is not a multiple of its step ${step}${entry.meta?.min !== undefined ? ` from ${entry.meta.min}` : ''}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * First problem with `edits`, or null when every edit is valid. A param the
 * declaration does not list is an error; with no declaration at all (no
 * build has reported its params yet) nothing can be checked and the edit
 * passes — the kernel still refuses a bad value.
 */
export function validateParamEdits(
  declared: readonly SerializedParamEntry[] | SerializedParamTable,
  edits: readonly ParamEditInput[],
): string | null {
  const entries = Array.isArray(declared) ? declared : Object.values(declared);
  if (entries.length === 0) return null;
  const table: SerializedParamTable = {};
  for (const entry of entries) table[entry.name] = entry;
  const probe = ParamTable.deserialize(table);
  for (const edit of edits) {
    const entry = table[edit.name];
    if (!entry) return `param '${edit.name}' is not declared by this model`;
    if (typeof edit.value === 'number' && !Number.isFinite(edit.value)) {
      return `param '${edit.name}': ${edit.value} is not a finite number`;
    }
    try {
      probe.set(edit.name, edit.value);
    } catch (error) {
      return errorText(error);
    }
    if (entry.type === 'number' && typeof edit.value === 'number') {
      const step = stepError(entry, edit.value);
      if (step) return step;
    }
  }
  return null;
}
