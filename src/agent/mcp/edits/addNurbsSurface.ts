// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';

/**
 * Inputs for `add_nurbs_surface`. Provide either:
 *  - `controls` + `degree` (with optional `weights`, `knots`, `periodic`)
 *    to construct a NURBS surface from an explicit control net, OR
 *  - `section_sketch_ids` to skin a surface through 2+ existing sketches.
 *
 * The chain `surface_N.thicken(t)` / `.toShape()` is inserted via the
 * separate `add_feature` MCP tool on the binding produced here.
 */
export interface AddNurbsSurfaceInput {
  code: string;
  controls?: number[][][];
  weights?: number[][];
  degree?: { u: number; v: number };
  knots?: { u: number[]; v: number[] };
  periodic?: { u: boolean; v: boolean };
  section_sketch_ids?: string[];
  binding_name?: string;
}

/**
 * Insert a `const <binding> = nurbsSurface({...})` or
 * `const <binding> = surfaceFromCurves([...])` statement into the user's
 * `.kcad.ts` immediately before the last top-level `return`.
 *
 * The resulting binding has type `Surface` (peer to `Shape`); use the
 * existing `add_feature` MCP tool to chain `.thicken(t)` / `.toShape()`
 * onto it in a follow-up edit.
 */
export function addNurbsSurface(input: AddNurbsSurfaceInput): AddFeatureResult {
  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  let feature_code: string;
  if (input.section_sketch_ids && input.section_sketch_ids.length > 0) {
    feature_code = `const ${binding} = surfaceFromCurves([${input.section_sketch_ids.join(', ')}]);`;
  } else {
    if (!input.controls || !input.degree) {
      return {
        ok: false,
        error: 'add_nurbs_surface: provide either section_sketch_ids OR (controls + degree).',
      };
    }
    const parts: string[] = [
      `controls: ${JSON.stringify(input.controls)}`,
      `degree: ${JSON.stringify(input.degree)}`,
    ];
    if (input.weights) parts.push(`weights: ${JSON.stringify(input.weights)}`);
    if (input.knots) parts.push(`knots: ${JSON.stringify(input.knots)}`);
    if (input.periodic) parts.push(`periodic: ${JSON.stringify(input.periodic)}`);
    feature_code = `const ${binding} = nurbsSurface({ ${parts.join(', ')} });`;
  }
  return addFeature(input.code, feature_code);
}

function deriveDefaultBinding(code: string): string {
  // Find the highest existing `surface_<N>` binding and return surface_<N+1>.
  let max = 0;
  for (const m of code.matchAll(/const\s+surface_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `surface_${max + 1}`;
}
