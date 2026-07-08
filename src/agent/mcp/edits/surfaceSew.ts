// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/surfaceSew.ts
//
// Insert a `const <binding> = sew([s0, s1, ...], opts?)` statement into a
// .kcad.ts script immediately before the last top-level return.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';
import { isValidIdentifier, bindingExists } from './sourceEditUtils';

export interface SurfaceSewInput {
  /** Current .kcad.ts source. */
  code: string;
  /** JS variable names of the surfaces to sew (each must be declared in source). */
  surface_bindings: string[];
  /** Edge-merging tolerance in mm. Default 1e-6. */
  tolerance?: number;
  /** When true the lowerer emits feature.surface-sew.open-shell if the result is not watertight. */
  require_closed?: boolean;
  /** JS const name for the resulting Shape binding. Auto-derived if omitted. */
  binding_name?: string;
}

function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_sewn_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_sewn_${max + 1}`;
}

export function surfaceSewEdit(input: SurfaceSewInput): AddFeatureResult {
  if (!Array.isArray(input.surface_bindings) || input.surface_bindings.length < 1) {
    return { ok: false, error: 'surface_sew: surface_bindings must be an array of at least 1 surface name.' };
  }
  for (const name of input.surface_bindings) {
    if (typeof name !== 'string' || !isValidIdentifier(name)) {
      return { ok: false, error: `surface_sew: surface_bindings must be valid JS identifiers; got ${JSON.stringify(name)}.` };
    }
    if (!bindingExists(input.code, name)) {
      return { ok: false, error: `surface_sew: binding "${name}" is not declared in the source.` };
    }
  }

  if (input.tolerance !== undefined && (typeof input.tolerance !== 'number' || !Number.isFinite(input.tolerance) || input.tolerance <= 0)) {
    return { ok: false, error: `surface_sew: tolerance must be a positive finite number; got ${JSON.stringify(input.tolerance)}.` };
  }

  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  const arrayLiteral = `[${input.surface_bindings.join(', ')}]`;
  const optsParts: string[] = [];
  if (input.tolerance !== undefined) optsParts.push(`tolerance: ${JSON.stringify(input.tolerance)}`);
  if (input.require_closed !== undefined) optsParts.push(`requireClosed: ${JSON.stringify(input.require_closed)}`);

  const feature_code = optsParts.length > 0
    ? `const ${binding} = sew(${arrayLiteral}, { ${optsParts.join(', ')} });`
    : `const ${binding} = sew(${arrayLiteral});`;

  return addFeature(input.code, feature_code);
}
