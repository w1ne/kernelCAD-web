// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/runFeaArgs.ts
//
// The inline study for `run_fea`. The documented path is a script that
// declares `shape.feaStudy({...})`; the call clients actually make is
// `run_fea({ code, material, fixed, loads })` against a script that declares
// nothing — every such call used to end in "The script declares no
// feaStudy". The same fields are now accepted on the call itself, validated by
// the SAME capture-time validator `feaStudy()` uses, and bound to the shape
// the script returns.
//
// Also folds the shapes models reach for onto the declared ones: a scalar
// `force` plus `direction`, `face`/`faces` for a load's selector, `support`
// for `fixed`, camelCase / snake_case option names.

import { buildFeaStudyFeatureSpec } from '../../../modeling/capture/authoringFeatureRecords';
import type { FeaStudyMetadata, FeaStudySpec } from '../../../shared/intent/feaStudyRecord';
import { isKernelError } from '../../../shared/intent/kernelError';

/** Example quoted in every argument diagnostic. */
export const RUN_FEA_EXAMPLE =
  "run_fea({ code: 'return box(100, 20, 10);', material: 'aluminum-6061', fixed: { atX: 0 }, " +
  'loads: [{ faces: { atX: 100 }, force: [0, 0, -200] }] })';

export type InlineStudyResult =
  | { kind: 'none' }
  | { kind: 'ok'; metadata: FeaStudyMetadata; merged?: true }
  | { kind: 'error'; error: string; errorCode: 'feature.invalid-args' };

type Raw = Record<string, unknown>;

/** `{ force: 200, direction: [0, 0, -1] }` -> `force: [0, 0, -200]`. */
function normalizeLoad(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const l = { ...(raw as Raw) };
  if (l.faces === undefined) l.faces = l.face ?? l.selector ?? l.at;
  if (l.force === undefined) l.force = l.force_n ?? l.forceN;
  const dir = l.direction;
  if (typeof l.force === 'number' && Array.isArray(dir) && dir.length === 3) {
    const len = Math.hypot(...(dir as number[])) || 1;
    l.force = (dir as number[]).map(d => (Number(l.force) * d) / len);
  }
  for (const k of ['face', 'selector', 'at', 'force_n', 'forceN', 'direction']) delete l[k];
  return l;
}

function firstDefined(raw: Raw, keys: readonly string[]): unknown {
  for (const k of keys) if (raw[k] !== undefined) return raw[k];
  return undefined;
}

/** The inline spec, from `study: {...}` or from top-level fields. */
export function inlineSpec(input: Raw): Raw | undefined {
  const fromStudy = typeof input.study === 'object' && input.study !== null ? (input.study as Raw) : undefined;
  const src = fromStudy ?? input;
  const material = src.material;
  const fixed = firstDefined(src, ['fixed', 'support', 'supports', 'fixed_faces', 'fixedFaces']);
  const loads = firstDefined(src, ['loads', 'load']);
  if (fromStudy === undefined && material === undefined && fixed === undefined && loads === undefined) return undefined;
  const loadList = loads === undefined ? undefined : Array.isArray(loads) ? loads : [loads];
  const spec: Raw = {
    material,
    fixed,
    loads: loadList?.map(normalizeLoad),
    meshSize: firstDefined(src, ['meshSize']),
    minSafetyFactor: firstDefined(src, ['minSafetyFactor', 'min_safety_factor']),
    name: typeof src.name === 'string' ? src.name : undefined,
  };
  for (const k of Object.keys(spec)) if (spec[k] === undefined) delete spec[k];
  return spec;
}

/** material + fixed + loads all given: a standalone study for the returned
 *  shape. Anything less is a set of overrides for the script's own study. */
export function isCompleteInlineSpec(spec: Raw): boolean {
  return spec.material !== undefined && spec.fixed !== undefined && spec.loads !== undefined;
}

/** The declared study as a spec the validator accepts again. */
function specOf(declared: FeaStudyMetadata): Raw {
  const { virtual: _virtual, ...rest } = declared;
  return { ...rest };
}

/**
 * Validate the inline study, if the call carries one. Errors are the
 * validator's own messages ("feaStudy: loads[0].force must be three finite
 * numbers ...") plus the example call.
 *
 * With `declared` (the script's own study) and an INCOMPLETE inline spec —
 * `run_fea({ file, material: 'steel' })` — the inline fields are overrides
 * merged onto the declared study (`merged: true`) rather than a whole study
 * that fails validation for the fields it left out.
 */
export function inlineFeaStudy(input: Raw, declared?: FeaStudyMetadata): InlineStudyResult {
  const spec = inlineSpec(input);
  if (spec === undefined) return { kind: 'none' };
  const merge = declared !== undefined && !isCompleteInlineSpec(spec);
  const full = merge ? { ...specOf(declared), ...spec } : spec;
  try {
    const built = buildFeaStudyFeatureSpec(full as unknown as FeaStudySpec, { kind: 'feature', id: '__inline__' });
    return { kind: 'ok', metadata: built.metadata as unknown as FeaStudyMetadata, ...(merge ? { merged: true } : {}) };
  } catch (e) {
    const message = isKernelError(e) || e instanceof Error ? e.message : String(e);
    return {
      kind: 'error',
      error: `run_fea inline study${merge ? ` (merged onto the script's study '${declared.name}')` : ''}: ${message} Example: ${RUN_FEA_EXAMPLE}.`,
      errorCode: 'feature.invalid-args',
    };
  }
}
