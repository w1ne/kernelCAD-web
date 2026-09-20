// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Param, Vec3 } from '../shared/intent/types';
import { isValidEditableNumber, formatScalarForError } from '../shared/intent/types';
import { KernelError } from '../shared/intent/kernelError';
import { isParamRef, type Editable } from '../shared/runtime/paramRef';
import { toParam } from '../shared/runtime/editableHelpers';

export const mm = (n: Editable<number>): Param => toParam(n, 'mm');
export const ul = (n: Editable<number>): Param => toParam(n, 'unitless');

/** Targeted hint for the top parametric-authoring trap: JS arithmetic or
 *  string templating on a ParamRef (`param('w', 18) + 4`, `\`\${ref}4\``)
 *  produces `"[object Object]4"` / NaN strings that land in dimension slots.
 *  Returns a specific repair hint when the garbage matches that fingerprint;
 *  undefined otherwise (callers fall back to the generic hint). */
function paramArithmeticHint(value: unknown): string | undefined {
  const methodsHint =
    `use the ParamRef arithmetic methods — .add(n), .subtract(n), .multiply(n), .divide(n), .negate() — not JS operators (+ - * /) or template strings. Example: param('w', 18).add(4) instead of param('w', 18) + 4.`;
  if (typeof value === 'string') {
    if (/\[object Object\]/.test(value)) {
      return `invalid-args.param.js-arithmetic — this value looks like JS arithmetic or string concatenation on a ParamRef; ${methodsHint}`;
    }
    return `invalid-args.param.string-dimension — dimension arguments must be numbers, not strings; if this string came from templating/concatenating a ParamRef, ${methodsHint}`;
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    return `invalid-args.param.js-arithmetic — NaN here often means JS arithmetic was applied to a ParamRef; ${methodsHint}`;
  }
  if (isParamRef(value) && (value as { _type?: unknown })._type !== 'number') {
    return `invalid-args.param.type-mismatch — this slot needs a NUMERIC param; the ParamRef passed is '${(value as { _type?: string })._type}'. Declare the param with a numeric defaultValue.`;
  }
  return undefined;
}

export function assertEditableNumber(featureKind: string, paramName: string, value: unknown): void {
  if (isValidEditableNumber(value)) return;
  const targetedHint = paramArithmeticHint(value);
  throw new KernelError(
    'feature.invalid-args',
    `${featureKind}: ${paramName} must be a finite number or a numeric ParamRef; got ${formatScalarForError(value)}.`,
    featureKind,
    targetedHint ??
      `Pass a number (or a ParamRef returned by param()) for ${paramName}; primitives do NOT accept an options object such as { radius, height }. Use the positional signature: ${featureKind}(...).`,
  );
}

export function assertPositiveFinite(featureKind: string, paramName: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `${featureKind}: ${paramName} must be a positive finite number; got ${formatScalarForError(value)}.`,
      featureKind,
      `Pass a positive finite number for ${paramName}.`,
    );
  }
  return value;
}

// === W1.3 NURBS surfaces validation helpers ===

export function isRectangularGrid(grid: unknown[][]): boolean {
  if (!Array.isArray(grid) || grid.length === 0) return false;
  const nV = grid[0].length;
  if (nV === 0) return false;
  return grid.every(row => Array.isArray(row) && row.length === nV);
}

export function describeGridShape(grid: unknown): string {
  if (!Array.isArray(grid)) return String(grid);
  if (grid.length === 0) return '[]';
  const rowLens = (grid as unknown[][]).map(r => Array.isArray(r) ? r.length : 'NaN');
  return `${grid.length} rows, inner lengths [${rowLens.join(',')}]`;
}

export function validateNurbsControls(controls: Vec3[][]): void {
  if (!isRectangularGrid(controls as unknown[][])) {
    throw new KernelError(
      'feature.nurbs.degenerate-controls',
      `nurbsSurface: controls must be a non-empty rectangular Vec3 grid; got shape ${describeGridShape(controls)}.`,
      undefined,
      'nurbs.degenerate-controls — controls must be a non-empty rectangular Vec3 grid spanning a 2D extent.',
    );
  }
  for (const row of controls) {
    for (const p of row) {
      if (
        !Array.isArray(p) || p.length !== 3 ||
        !p.every(c => typeof c === 'number' && Number.isFinite(c))
      ) {
        throw new KernelError(
          'feature.nurbs.degenerate-controls',
          `nurbsSurface: every control point must be a finite Vec3; got ${JSON.stringify(p)}.`,
          undefined,
          'nurbs.degenerate-controls — control points must be finite Vec3 (3 numbers).',
        );
      }
    }
  }
}

export function validateNurbsDegree(controls: Vec3[][], degree: { u: number; v: number }): void {
  const nU = controls.length;
  const nV = controls[0].length;
  const bad =
    !Number.isFinite(degree.u) || !Number.isFinite(degree.v) ||
    degree.u < 1 || degree.v < 1 ||
    degree.u > nU - 1 || degree.v > nV - 1;
  if (bad) {
    throw new KernelError(
      'feature.nurbs.degree-mismatch',
      `nurbsSurface: degree must satisfy 1 <= degree.u <= ${nU - 1} and 1 <= degree.v <= ${nV - 1}; got degree.u=${degree.u}, degree.v=${degree.v}.`,
      undefined,
      `nurbs.degree-mismatch — degree.u must be in [1, nU-1] = [1, ${nU - 1}], degree.v in [1, nV-1] = [1, ${nV - 1}].`,
    );
  }
}
