// src/agent/mcp/edits/addVariableSweep.ts
//
// NURBS Slice B Task 11: insert a `variableSweep(spine, sections, opts?)`
// binding into a .kcad.ts script immediately before the last top-level
// `return`. Pure string manipulation — mirrors addFeature / addNurbsCurve.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';

/**
 * One varying section reference: `t` is the spine parameter in [0, 1];
 * `profile_binding` is the variable name of an existing Sketch declared
 * earlier in the script.
 */
export interface VariableSweepSectionInput {
  t: number;
  profile_binding: string;
}

/**
 * Inputs for `add_variable_sweep`. `spine_binding` is the variable name of
 * an existing Curve3D / Sketch / Vec3[] declared earlier in the script.
 */
export interface AddVariableSweepInput {
  code: string;
  spine_binding: string;
  sections: VariableSweepSectionInput[];
  closed?: boolean;
  continuity?: 'C0' | 'C1' | 'C2';
  binding_name?: string;
}

/**
 * Insert `const <binding> = variableSweep(<spine>, [...], { ... });` into
 * `input.code` immediately before the last top-level `return`.
 *
 * Validates that `spine_binding` and every `section.profile_binding` are
 * already bound in the source (simple regex scan over `const <name>` and
 * `let <name>` declarations) — agents that pass undefined references get
 * a fast structured error instead of a confusing capture-time stack trace.
 */
export function addVariableSweep(input: AddVariableSweepInput): AddFeatureResult {
  if (!Array.isArray(input.sections) || input.sections.length < 2) {
    return {
      ok: false,
      error: 'add_variable_sweep: sections must contain at least 2 { t, profile_binding } entries.',
    };
  }
  for (const s of input.sections) {
    if (typeof s?.t !== 'number' || !Number.isFinite(s.t)) {
      return { ok: false, error: 'add_variable_sweep: every section.t must be a finite number.' };
    }
    if (typeof s?.profile_binding !== 'string' || !isValidIdentifier(s.profile_binding)) {
      return {
        ok: false,
        error: `add_variable_sweep: profile_binding must be a JS identifier; got ${JSON.stringify(s?.profile_binding)}.`,
      };
    }
  }
  for (let i = 1; i < input.sections.length; i++) {
    if (input.sections[i].t <= input.sections[i - 1].t) {
      return {
        ok: false,
        error: 'add_variable_sweep: section t values must be strictly increasing.',
      };
    }
  }
  if (input.sections[0].t !== 0 || input.sections[input.sections.length - 1].t !== 1) {
    return {
      ok: false,
      error: 'add_variable_sweep: first t must be 0 and last t must be 1.',
    };
  }
  if (typeof input.spine_binding !== 'string' || !isValidIdentifier(input.spine_binding)) {
    return {
      ok: false,
      error: `add_variable_sweep: spine_binding must be a JS identifier; got ${JSON.stringify(input.spine_binding)}.`,
    };
  }

  if (!bindingExists(input.code, input.spine_binding)) {
    return {
      ok: false,
      error: `add_variable_sweep: spine_binding "${input.spine_binding}" is not declared in the source.`,
    };
  }
  for (const s of input.sections) {
    if (!bindingExists(input.code, s.profile_binding)) {
      return {
        ok: false,
        error: `add_variable_sweep: profile_binding "${s.profile_binding}" is not declared in the source.`,
      };
    }
  }

  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  const sectionsLiteral = '[' + input.sections
    .map(s => `{ t: ${JSON.stringify(s.t)}, profile: ${s.profile_binding} }`)
    .join(', ') + ']';

  const optsParts: string[] = [];
  if (typeof input.closed === 'boolean') optsParts.push(`closed: ${JSON.stringify(input.closed)}`);
  if (input.continuity) optsParts.push(`continuity: ${JSON.stringify(input.continuity)}`);

  const feature_code = optsParts.length > 0
    ? `const ${binding} = variableSweep(${input.spine_binding}, ${sectionsLiteral}, { ${optsParts.join(', ')} });`
    : `const ${binding} = variableSweep(${input.spine_binding}, ${sectionsLiteral});`;

  return addFeature(input.code, feature_code);
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function isValidIdentifier(s: string): boolean {
  return IDENTIFIER_RE.test(s);
}

/** Regex check for `const <name>` or `let <name>` declaration anywhere in source. */
function bindingExists(code: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[^A-Za-z0-9_$])(?:const|let|var)\\s+${escaped}\\b`);
  return re.test(code);
}

function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_sweep_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_sweep_${max + 1}`;
}
