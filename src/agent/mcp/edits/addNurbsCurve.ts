// src/agent/mcp/edits/addNurbsCurve.ts
//
// NURBS Slice B Task 11: insert a `nurbsCurve(controlPoints, opts?)` binding
// into a .kcad.ts script immediately before the last top-level `return`.
// Pure string manipulation — mirrors addFeature / addNurbsSurface.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';

/**
 * Inputs for `add_nurbs_curve`. `controlPoints` is a list of Vec3 control
 * points (mm). All other fields are optional NURBS knobs forwarded verbatim
 * to the `nurbsCurve(controlPoints, opts)` runtime call.
 */
export interface AddNurbsCurveInput {
  code: string;
  controlPoints: number[][];
  degree?: number;
  weights?: number[];
  knots?: number[];
  closed?: boolean;
  binding_name?: string;
}

/**
 * Insert `const <binding> = nurbsCurve([...], { ... });` into `input.code`
 * immediately before the last top-level `return` statement. The resulting
 * binding has type `Curve3D`; consume it via `variableSweep(spine, ...)`
 * or downstream Curve3D-accepting features.
 */
export function addNurbsCurve(input: AddNurbsCurveInput): AddFeatureResult {
  if (!Array.isArray(input.controlPoints) || input.controlPoints.length < 2) {
    return {
      ok: false,
      error: 'add_nurbs_curve: controlPoints must be a Vec3[] with at least 2 points.',
    };
  }
  for (const p of input.controlPoints) {
    if (!Array.isArray(p) || p.length !== 3 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return {
        ok: false,
        error: 'add_nurbs_curve: every controlPoint must be a [x, y, z] Vec3 of finite numbers.',
      };
    }
  }

  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  const optsParts: string[] = [];
  if (typeof input.degree === 'number') optsParts.push(`degree: ${JSON.stringify(input.degree)}`);
  if (input.weights) optsParts.push(`weights: ${JSON.stringify(input.weights)}`);
  if (input.knots) optsParts.push(`knots: ${JSON.stringify(input.knots)}`);
  if (typeof input.closed === 'boolean') optsParts.push(`closed: ${JSON.stringify(input.closed)}`);

  const controlPointsLiteral = JSON.stringify(input.controlPoints);
  const feature_code = optsParts.length > 0
    ? `const ${binding} = nurbsCurve(${controlPointsLiteral}, { ${optsParts.join(', ')} });`
    : `const ${binding} = nurbsCurve(${controlPointsLiteral});`;

  return addFeature(input.code, feature_code);
}

/**
 * Pick the next available `_curve_<N>` binding by scanning the source for
 * existing `const _curve_<N> = ` declarations. Independent counter from
 * surfaces / sweeps / features.
 */
function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_curve_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_curve_${max + 1}`;
}
