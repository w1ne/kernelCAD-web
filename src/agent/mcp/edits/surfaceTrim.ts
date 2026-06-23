// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/surfaceTrim.ts
//
// Insert a `const <binding> = <surface>.trimTo(<by>)` or
// `const <binding> = <surface>.split(<by>)` statement into a .kcad.ts script
// immediately before the last top-level return.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';

export interface SurfaceTrimInput {
  /** Current .kcad.ts source. */
  code: string;
  /** JS variable name of the surface to trim/split (must be declared in source). */
  surface_binding: string;
  /** JS variable name of the cutter (Surface, Shape, or Curve3D; must be declared in source). */
  by_binding: string;
  /** Which op — 'trim' discards the smaller half; 'split' keeps both halves. */
  op: 'trim' | 'split';
  /** JS const name for the resulting Surface binding. Auto-derived if omitted. */
  binding_name?: string;
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function isValidIdentifier(s: string): boolean {
  return IDENTIFIER_RE.test(s);
}

function bindingExists(code: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[^A-Za-z0-9_$])(?:const|let|var)\\s+${escaped}\\b`);
  return re.test(code);
}

function deriveDefaultBinding(code: string, op: 'trim' | 'split'): string {
  const prefix = op === 'trim' ? '_trimmed_' : '_split_';
  let max = 0;
  for (const m of code.matchAll(new RegExp(`const\\s+${prefix.replace('_', '_')}(\\d+)\\s*=`, 'g'))) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

export function surfaceTrimEdit(input: SurfaceTrimInput): AddFeatureResult {
  for (const [label, value] of [['surface_binding', input.surface_binding], ['by_binding', input.by_binding]] as const) {
    if (typeof value !== 'string' || !isValidIdentifier(value)) {
      return { ok: false, error: `surface_trim: ${label} must be a valid JS identifier; got ${JSON.stringify(value)}.` };
    }
  }
  if (!bindingExists(input.code, input.surface_binding)) {
    return { ok: false, error: `surface_trim: binding "${input.surface_binding}" is not declared in the source.` };
  }
  if (!bindingExists(input.code, input.by_binding)) {
    return { ok: false, error: `surface_trim: cutter binding "${input.by_binding}" is not declared in the source.` };
  }

  const binding = input.binding_name ?? deriveDefaultBinding(input.code, input.op);
  const method = input.op === 'trim' ? 'trimTo' : 'split';
  const feature_code = `const ${binding} = ${input.surface_binding}.${method}(${input.by_binding});`;
  return addFeature(input.code, feature_code);
}
