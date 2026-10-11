// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/addVariableSweep.ts
//
// NURBS Slice B Task 11: insert a `variableSweep(spine, sections, opts?)`
// binding into a .kcad.ts script immediately before the last top-level
// `return`. Pure string manipulation — mirrors addFeature / addNurbsCurve.
//
// The spine and each section profile can be named by an existing binding
// (`spine_binding`, `sections[i].profile_binding`) or given INLINE
// (`spine_points`, `sections[i].radius` / `width`+`height`). Inline inputs
// exist because the binding-only form needed two or three prior authoring
// calls before a single sweep, and a client that called this tool first —
// which is what the tool's own description invites — failed every time.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';
import { isValidIdentifier, bindingExists } from './sourceEditUtils';

/**
 * One varying section. `t` is the spine parameter in [0, 1]. The profile is
 * EITHER an existing Sketch binding (`profile_binding`) OR inline: `radius`
 * (a circle) or `width` + `height` (a rectangle), centred on the spine.
 */
export interface VariableSweepSectionInput {
  t?: number;
  profile_binding?: string;
  radius?: number;
  width?: number;
  height?: number;
}

/**
 * Inputs for `add_variable_sweep`. The spine is EITHER `spine_binding` (an
 * existing Curve3D / Sketch / Vec3[] variable) OR `spine_points` (Vec3[]
 * interpolated with spline3d; `spine_closed: true` closes the loop, e.g. a
 * ring band).
 */
export interface AddVariableSweepInput {
  code: string;
  spine_binding?: string;
  spine_points?: Array<[number, number, number]>;
  spine_closed?: boolean;
  sections: VariableSweepSectionInput[];
  closed?: boolean;
  continuity?: 'C0' | 'C1' | 'C2';
  binding_name?: string;
}

export interface AddVariableSweepEdit extends AddFeatureResult {
  /** Binding the sweep was declared as. */
  binding?: string;
  /** Coded failure reason (always `feature.invalid-args` for a bad input). */
  errorCode?: string;
  /** What the edit inferred on the caller's behalf (e.g. evenly spaced t). */
  notes?: string[];
}

/** Example quoted in every argument diagnostic. */
export const VARIABLE_SWEEP_EXAMPLE =
  'add_variable_sweep({ code, spine_points: [[0, 0, 0], [0, 10, 30], [0, 0, 60]], ' +
  'sections: [{ t: 0, radius: 8 }, { t: 1, radius: 4 }] })';

function fail(message: string): AddVariableSweepEdit {
  return {
    ok: false,
    error: `add_variable_sweep: ${message} Example: ${VARIABLE_SWEEP_EXAMPLE}.`,
    errorCode: 'feature.invalid-args',
  };
}

const show = (v: unknown): string => JSON.stringify(v) ?? String(v);

/**
 * Insert `const <binding> = variableSweep(<spine>, [...], { ... });` (plus a
 * `spline3d(...)` spine line for `spine_points`) into `input.code`
 * immediately before the last top-level `return`.
 *
 * Every named binding is checked against the source (`const` / `let` / `var`
 * declarations) first, so an undefined reference is a fast structured error
 * instead of a capture-time stack trace.
 */
export function addVariableSweep(input: AddVariableSweepInput): AddVariableSweepEdit {
  if (typeof input.code !== 'string') {
    return fail(`\`code\` must be the .kcad.ts source to insert into (an empty string starts a new script); got ${show(input.code)}.`);
  }
  const notes: string[] = [];
  const sections = normalizeSections(input.sections, notes);
  if ('error' in sections) return sections;

  const sectionsError = validateSweepSections(sections, input.code);
  if (sectionsError) return sectionsError;

  const spine = resolveSpine(input);
  if ('error' in spine) return spine;

  const binding = input.binding_name ?? deriveDefaultBinding(input.code, '_sweep_');
  if (!isValidIdentifier(binding)) return fail(`binding_name must be a JS identifier; got ${show(binding)}.`);
  const sweepLine = buildVariableSweepSource(input, binding, spine.expr, buildSectionsLiteral(sections));
  const lines = spine.line !== undefined ? `${spine.line}\n${sweepLine}` : sweepLine;
  const edit = addFeature(input.code, lines);
  if (!edit.ok) {
    // No top-level return yet (a fresh script): append the sweep and return it.
    notes.push(`the script had no top-level return, so 'return ${binding};' was appended.`);
    return { ok: true, new_code: `${input.code.replace(/\s*$/, '')}\n${lines}\nreturn ${binding};\n`, binding, notes };
  }
  return { ...edit, binding, ...(notes.length > 0 ? { notes } : {}) };
}

/** Section list with `t` filled in: when EVERY section omits `t`, the
 *  stations are spread evenly over [0, 1] (and a note says so). */
function normalizeSections(
  raw: unknown,
  notes: string[],
): VariableSweepSectionInput[] | AddVariableSweepEdit & { error: string } {
  if (!Array.isArray(raw) || raw.length < 2) {
    return fail(`sections must contain at least 2 entries ({ t, profile_binding } or { t, radius }); got ${show(raw)}.`) as AddVariableSweepEdit & { error: string };
  }
  const list = raw as VariableSweepSectionInput[];
  if (list.every(s => s?.t === undefined)) {
    notes.push(`sections had no t; spread evenly as ${list.map((_, i) => +(i / (list.length - 1)).toFixed(4)).join(', ')}.`);
    return list.map((s, i) => ({ ...s, t: i / (list.length - 1) }));
  }
  return list;
}

function validateProfile(s: VariableSweepSectionInput, i: number, code: string): AddVariableSweepEdit | null {
  if (s.profile_binding !== undefined) {
    if (typeof s.profile_binding !== 'string' || !isValidIdentifier(s.profile_binding)) {
      return fail(`profile_binding must be a JS identifier; got ${show(s.profile_binding)} (sections[${i}]).`);
    }
    if (!bindingExists(code, s.profile_binding)) {
      return fail(`profile_binding "${s.profile_binding}" is not declared in the source (sections[${i}]). Declare it first, or give the section inline as { t, radius } / { t, width, height }.`);
    }
    return null;
  }
  const positive = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (s.radius !== undefined) {
    return positive(s.radius) ? null : fail(`sections[${i}].radius must be a positive number in mm; got ${show(s.radius)}.`);
  }
  if (s.width !== undefined || s.height !== undefined) {
    return positive(s.width) && positive(s.height)
      ? null
      : fail(`sections[${i}] needs both width and height as positive numbers in mm; got width=${show(s.width)}, height=${show(s.height)}.`);
  }
  return fail(`sections[${i}] has no profile: give profile_binding (an existing Sketch), radius, or width + height; got ${show(s)}.`);
}

function validateSweepSections(sections: VariableSweepSectionInput[], code: string): AddVariableSweepEdit | null {
  for (const [i, s] of sections.entries()) {
    if (typeof s?.t !== 'number' || !Number.isFinite(s.t)) {
      return fail(`every section.t must be a finite number; sections[${i}].t is ${show(s?.t)}.`);
    }
    const profileError = validateProfile(s, i, code);
    if (profileError) return profileError;
  }
  for (let i = 1; i < sections.length; i++) {
    if ((sections[i].t as number) <= (sections[i - 1].t as number)) {
      return fail(`section t values must be strictly increasing; got ${sections.map(s => s.t).join(', ')}.`);
    }
  }
  if (sections[0].t !== 0 || sections[sections.length - 1].t !== 1) {
    return fail(`first t must be 0 and last t must be 1; got first ${show(sections[0].t)}, last ${show(sections[sections.length - 1].t)}.`);
  }
  return null;
}

function isVec3List(v: unknown): v is Array<[number, number, number]> {
  return Array.isArray(v) && v.every(p => Array.isArray(p) && p.length === 3 && p.every(c => typeof c === 'number' && Number.isFinite(c)));
}

/** The spine expression to pass to variableSweep, plus a spline3d line to
 *  insert first when the spine was given as points. */
function resolveSpine(input: AddVariableSweepInput): { expr: string; line?: string } | AddVariableSweepEdit & { error: string } {
  const named = input.spine_binding;
  if (named !== undefined && input.spine_points !== undefined) {
    return fail('pass either spine_binding or spine_points, not both.') as AddVariableSweepEdit & { error: string };
  }
  if (input.spine_points !== undefined) {
    if (!isVec3List(input.spine_points) || input.spine_points.length < 2) {
      return fail(`spine_points must be at least 2 [x, y, z] points in mm; got ${show(input.spine_points)}.`) as AddVariableSweepEdit & { error: string };
    }
    const spineName = deriveDefaultBinding(input.code, '_spine_');
    const closed = input.spine_closed === true ? ', { closed: true }' : '';
    return { expr: spineName, line: `const ${spineName} = spline3d(${JSON.stringify(input.spine_points)}${closed});` };
  }
  if (typeof named !== 'string' || !isValidIdentifier(named)) {
    return fail(`spine_binding must be a JS identifier naming an existing Curve3D / Sketch / Vec3[] (or pass spine_points instead); got ${show(named)}.`) as AddVariableSweepEdit & { error: string };
  }
  if (!bindingExists(input.code, named)) {
    return fail(`spine_binding "${named}" is not declared in the source. Declare it first (e.g. add_curve), or pass spine_points.`) as AddVariableSweepEdit & { error: string };
  }
  return { expr: named };
}

function profileExpr(s: VariableSweepSectionInput): string {
  if (s.profile_binding !== undefined) return s.profile_binding;
  if (s.radius !== undefined) return `path().circle(0, 0, ${s.radius})`;
  const w = (s.width as number) / 2;
  const h = (s.height as number) / 2;
  return `path().moveTo(${-w}, ${-h}).lineTo(${w}, ${-h}).lineTo(${w}, ${h}).lineTo(${-w}, ${h}).close()`;
}

function buildSectionsLiteral(sections: VariableSweepSectionInput[]): string {
  return '[' + sections
    .map(s => `{ t: ${JSON.stringify(s.t)}, profile: ${profileExpr(s)} }`)
    .join(', ') + ']';
}

function buildVariableSweepSource(
  input: AddVariableSweepInput,
  binding: string,
  spineExpr: string,
  sectionsLiteral: string,
): string {
  const optsParts: string[] = [];
  if (typeof input.closed === 'boolean') optsParts.push(`closed: ${JSON.stringify(input.closed)}`);
  if (input.continuity) optsParts.push(`continuity: ${JSON.stringify(input.continuity)}`);

  return optsParts.length > 0
    ? `const ${binding} = variableSweep(${spineExpr}, ${sectionsLiteral}, { ${optsParts.join(', ')} });`
    : `const ${binding} = variableSweep(${spineExpr}, ${sectionsLiteral});`;
}

function deriveDefaultBinding(code: string, prefix: '_sweep_' | '_spine_'): string {
  let max = 0;
  for (const m of code.matchAll(new RegExp(`const\\s+${prefix}(\\d+)\\s*=`, 'g'))) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}
