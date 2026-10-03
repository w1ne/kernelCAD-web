// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Param, Vec3 } from '../shared/intent/types';
import { isValidEditableNumber } from '../shared/intent/types';
import { KernelError } from '../shared/intent/kernelError';
import { invalidArgs } from '../shared/intent/invalidArgs';
import type { ArgUnit } from '../shared/intent/invalidArgs';
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

/**
 * One minimal correct call per API that `assertEditableNumber` /
 * `assertPositiveFinite` guard, so those two shared guards can put a
 * copy-pasteable example in every message instead of a bare "pass a positive
 * finite number". Unknown kinds fall back to a generic positional call.
 */
const API_EXAMPLES: Record<string, string> = {
  box: 'box(40, 30, 10)',
  cylinder: 'cylinder(20, 5)',
  sphere: 'sphere(10)',
  torus: 'torus(20, 5)',
  spurGear: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, bore: 5 })',
  internalSpurGear: 'internalSpurGear({ module: 1, teeth: 54, faceWidth: 8, rimThickness: 4 })',
  spring: 'spring({ length: 30, coilRadius: 5, wireRadius: 1, turns: 8 })',
  extrudeRect: 'extrudeRect(40, 30, 10)',
  extrudeCircle: 'extrudeCircle(10, 5)',
  extrudePolygon: 'extrudePolygon([[0, 0], [20, 0], [20, 10], [0, 10]], 5)',
  extrudeRoundedRect: 'extrudeRoundedRect(40, 30, 10, 3)',
};

/** What a named argument means, so the requirement says more than "positive".
 *  Keyed `<api>.<arg>` first, then the bare arg name. */
const ARG_MEANING: Record<string, { why: string; unit?: ArgUnit }> = {
  'spurGear.module': {
    why: "the ISO module (pitch diameter / teeth), NOT diametral pitch and not the pitch diameter; both gears of a mesh need the same module",
    unit: 'mm',
  },
  'internalSpurGear.module': {
    why: 'the ISO module (pitch diameter / teeth); it must match the mating pinion',
    unit: 'mm',
  },
  'spurGear.faceWidth': { why: 'the axial thickness of the gear blank', unit: 'mm' },
  'internalSpurGear.faceWidth': { why: 'the axial thickness of the ring blank', unit: 'mm' },
  'spurGear.bore': { why: 'the centre bore diameter, not the radius', unit: 'mm' },
  'internalSpurGear.rimThickness': {
    why: 'the material left outside the root circle of the internal teeth',
    unit: 'mm',
  },
  'spring.length': { why: 'the free length along the coil axis', unit: 'mm' },
  'spring.coilRadius': { why: 'the radius of the coil centreline, not the outer diameter', unit: 'mm' },
  'spring.wireRadius': { why: 'the radius of the wire cross-section, not its diameter', unit: 'mm' },
  'spring.turns': { why: 'the number of complete coils', unit: 'count' },
  radius: { why: 'a radius, not a diameter', unit: 'mm' },
  diameter: { why: 'a diameter, not a radius', unit: 'mm' },
};

function argMeaning(featureKind: string, paramName: string): { why: string; unit?: ArgUnit } {
  return ARG_MEANING[`${featureKind}.${paramName}`] ?? ARG_MEANING[paramName] ?? { why: '', unit: 'mm' };
}

function apiExample(featureKind: string, paramName: string): string {
  return API_EXAMPLES[featureKind] ?? `${featureKind}(...) with a numeric ${paramName}`;
}

export function assertEditableNumber(featureKind: string, paramName: string, value: unknown): void {
  if (isValidEditableNumber(value)) return;
  const targetedHint = paramArithmeticHint(value);
  invalidArgs({
    api: `${featureKind}(${paramName})`,
    path: paramName,
    got: value,
    showType: true,
    requires:
      'a finite number, or a numeric ParamRef from param(); the primitives take POSITIONAL arguments, they do not accept an options object such as { radius, height }',
    example: apiExample(featureKind, paramName),
    featureId: featureKind,
    hint: targetedHint,
  });
}

export function assertPositiveFinite(featureKind: string, paramName: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    const { why, unit } = argMeaning(featureKind, paramName);
    invalidArgs({
      api: `${featureKind}(${paramName})`,
      path: paramName,
      got: value,
      showType: typeof value !== 'number',
      requires: why === '' ? 'a finite number > 0' : `a finite number > 0 — ${why}`,
      unit,
      example: apiExample(featureKind, paramName),
      featureId: featureKind,
    });
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
