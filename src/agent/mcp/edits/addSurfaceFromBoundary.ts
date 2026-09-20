// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/addSurfaceFromBoundary.ts
//
// NURBS Slice C Task 7: insert a `surfaceFromBoundary([c1, c2, c3, c4], opts?)`
// binding into a .kcad.ts script immediately before the last top-level
// `return`. Pure string manipulation — mirrors addNurbsCurve / addVariableSweep.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';
import { isValidIdentifier, bindingExists } from './sourceEditUtils';

/**
 * Inputs for `add_surface_from_boundary`. `curve_bindings` is a tuple of 4
 * existing Curve3D variable names declared earlier in the script (bottom,
 * right, top, left in that order). All other fields are optional knobs
 * forwarded verbatim to the `surfaceFromBoundary(curves, opts)` runtime call.
 */
export interface AddSurfaceFromBoundaryInput {
  code: string;
  curve_bindings: [string, string, string, string];
  continuity?: 'C0' | 'C1' | 'C2' | Array<'C0' | 'C1' | 'C2'>;
  sampling?: number;
  binding_name?: string;
}

/**
 * Insert `const <binding> = surfaceFromBoundary([c1, c2, c3, c4], { ... });`
 * into `input.code` immediately before the last top-level `return`. The
 * resulting binding has type `Surface`; chain `.thicken(t)` / `.toShape()`
 * via the existing `add_feature` MCP tool on the binding name.
 *
 * Validates that every `curve_bindings[i]` is already declared in the source
 * (regex scan over `const/let/var <name>`). Agents that pass undefined refs
 * get a fast structured error instead of a capture-time stack trace.
 */
export function addSurfaceFromBoundary(input: AddSurfaceFromBoundaryInput): AddFeatureResult {
  const bindingsError = validateCurveBindings(input);
  if (bindingsError !== null) return { ok: false, error: bindingsError };
  const continuityError = validateContinuity(input.continuity);
  if (continuityError !== null) return { ok: false, error: continuityError };
  const samplingError = validateSampling(input.sampling);
  if (samplingError !== null) return { ok: false, error: samplingError };

  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  return addFeature(input.code, buildSurfaceFeatureCode(input, binding));
}

function validateCurveBindings(input: AddSurfaceFromBoundaryInput): string | null {
  if (!Array.isArray(input.curve_bindings) || input.curve_bindings.length !== 4) {
    return 'add_surface_from_boundary: curve_bindings must be a tuple of exactly 4 Curve3D variable names.';
  }
  for (const name of input.curve_bindings) {
    if (typeof name !== 'string' || !isValidIdentifier(name)) {
      return `add_surface_from_boundary: curve_bindings must be JS identifiers; got ${JSON.stringify(name)}.`;
    }
  }
  for (const name of input.curve_bindings) {
    if (!bindingExists(input.code, name)) {
      return `add_surface_from_boundary: curve binding "${name}" is not declared in the source.`;
    }
  }
  return null;
}

function validateContinuity(continuity: AddSurfaceFromBoundaryInput['continuity']): string | null {
  if (continuity === undefined) return null;
  if (Array.isArray(continuity)) {
    if (continuity.length !== 4) {
      return `add_surface_from_boundary: continuity array must be length 4; got ${continuity.length}.`;
    }
    for (const c of continuity) {
      if (c !== 'C0' && c !== 'C1' && c !== 'C2') {
        return `add_surface_from_boundary: continuity entries must be 'C0' | 'C1' | 'C2'; got ${JSON.stringify(c)}.`;
      }
    }
  } else if (
    continuity !== 'C0' &&
    continuity !== 'C1' &&
    continuity !== 'C2'
  ) {
    return `add_surface_from_boundary: continuity must be 'C0' | 'C1' | 'C2' or an array of 4; got ${JSON.stringify(continuity)}.`;
  }
  return null;
}

function validateSampling(sampling: number | undefined): string | null {
  if (sampling === undefined) return null;
  if (typeof sampling !== 'number' || !Number.isFinite(sampling) || sampling < 1) {
    return `add_surface_from_boundary: sampling must be a finite positive integer; got ${JSON.stringify(sampling)}.`;
  }
  return null;
}

function buildSurfaceFeatureCode(input: AddSurfaceFromBoundaryInput, binding: string): string {
  const curveLiteral = `[${input.curve_bindings.join(', ')}]`;

  const optsParts: string[] = [];
  if (input.continuity !== undefined) optsParts.push(`continuity: ${JSON.stringify(input.continuity)}`);
  if (input.sampling !== undefined) optsParts.push(`sampling: ${JSON.stringify(input.sampling)}`);

  return optsParts.length > 0
    ? `const ${binding} = surfaceFromBoundary(${curveLiteral}, { ${optsParts.join(', ')} });`
    : `const ${binding} = surfaceFromBoundary(${curveLiteral});`;
}

/**
 * Pick the next available `_surface_<N>` binding by scanning the source for
 * existing declarations. Independent counter from curves / sweeps / features.
 */
function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_surface_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_surface_${max + 1}`;
}
