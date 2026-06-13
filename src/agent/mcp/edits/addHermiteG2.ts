// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/addHermiteG2.ts
//
// NURBS Slice C Task 7: insert a `hermiteG2(a, b)` binding into a .kcad.ts
// script immediately before the last top-level `return`. The returned binding
// is a `Curve3D` (peer to nurbsCurve / spline3d) consumable by `variableSweep`
// or `surfaceFromBoundary`. Pure string manipulation — no AST.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';

export interface HermiteEndpointInput {
  point: [number, number, number];
  tangent: [number, number, number];
  curvature?: [number, number, number];
}

/**
 * Inputs for `add_hermite_g2`. `a` and `b` are the two endpoints — each must
 * supply a `point` and a `tangent` (Vec3, finite). `curvature` is optional
 * and defaults to the zero vector at lower time (degrades the curve to G1).
 */
export interface AddHermiteG2Input {
  code: string;
  a: HermiteEndpointInput;
  b: HermiteEndpointInput;
  binding_name?: string;
}

/**
 * Insert `const <binding> = hermiteG2({...}, {...});` into `input.code`
 * immediately before the last top-level `return`. The resulting binding has
 * type `Curve3D`. Validates Vec3 shapes (finite numbers, length 3) before
 * emitting source; capture-time emits `feature.hermite-g2.degenerate-tangent`
 * and `feature.hermite-g2.non-finite-input` if anything slips past.
 */
export function addHermiteG2(input: AddHermiteG2Input): AddFeatureResult {
  const aValidation = validateEndpoint('a', input.a);
  if (aValidation) return aValidation;
  const bValidation = validateEndpoint('b', input.b);
  if (bValidation) return bValidation;

  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  const aLiteral = endpointLiteral(input.a);
  const bLiteral = endpointLiteral(input.b);
  const feature_code = `const ${binding} = hermiteG2(${aLiteral}, ${bLiteral});`;
  return addFeature(input.code, feature_code);
}

function validateEndpoint(label: 'a' | 'b', e: HermiteEndpointInput): AddFeatureResult | null {
  if (!e || typeof e !== 'object') {
    return { ok: false, error: `add_hermite_g2: endpoint ${label} is missing.` };
  }
  if (!isFiniteVec3(e.point)) {
    return { ok: false, error: `add_hermite_g2: endpoint ${label}.point must be a Vec3 of finite numbers.` };
  }
  if (!isFiniteVec3(e.tangent)) {
    return { ok: false, error: `add_hermite_g2: endpoint ${label}.tangent must be a Vec3 of finite numbers.` };
  }
  if (e.curvature !== undefined && !isFiniteVec3(e.curvature)) {
    return { ok: false, error: `add_hermite_g2: endpoint ${label}.curvature must be a Vec3 of finite numbers.` };
  }
  return null;
}

function isFiniteVec3(v: unknown): v is [number, number, number] {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    typeof v[0] === 'number' && Number.isFinite(v[0]) &&
    typeof v[1] === 'number' && Number.isFinite(v[1]) &&
    typeof v[2] === 'number' && Number.isFinite(v[2])
  );
}

function endpointLiteral(e: HermiteEndpointInput): string {
  const parts = [
    `point: ${JSON.stringify(e.point)}`,
    `tangent: ${JSON.stringify(e.tangent)}`,
  ];
  if (e.curvature !== undefined) parts.push(`curvature: ${JSON.stringify(e.curvature)}`);
  return `{ ${parts.join(', ')} }`;
}

/**
 * Pick the next available `_curve_<N>` binding by scanning the source for
 * existing declarations. Shares the curve counter with nurbsCurve / spline3d
 * — every Curve3D binding lands in the same namespace so callers can swap
 * implementations without renaming.
 */
function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_curve_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_curve_${max + 1}`;
}
