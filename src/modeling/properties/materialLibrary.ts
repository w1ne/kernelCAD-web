// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/properties/materialLibrary.ts
//
// Resolves a MATERIAL NAME to BOTH an engineering density and a default
// surface finish — assigning a named material seeds how a part weighs (mass
// properties) AND how it looks (appearance), each independently overridable
// afterwards.
//
// This module does NOT own any numbers or names. The vocabulary, its aliases,
// the density source and the default finish all live in the single registry
// `src/kinematic/engineeringMaterials.ts`, which FEA and the beam check also
// resolve through — so `mild-steel` weighs, renders, solves and appears in a
// BOM under one name.
//
// Canonical names are the engineering grades (`mild-steel`, `aluminum-6061`,
// `pla`, `petg`, `abs`, `nylon`); the bulk spellings `steel`, `aluminum`,
// `aluminium`, `pet` are explicit aliases. Coverage gaps stay honest:
//   * `petg` has a density but no natural finish token → `finish` is
//     undefined; assigning it seeds density only.
//   * finish tokens like `brass` / `copper` / `glass` have NO engineering
//     density, so they are NOT assignable materials — `resolveMaterial('brass')`
//     throws and the diagnostic points the author at `.finish('brass')`.
//
// A material name that is neither a grade nor an alias throws, naming every
// accepted spelling. There is NO silent fallback to water density or a default
// finish: a wrong name must surface, not quietly weigh a steel bracket as water.

import { KernelError } from '../../shared/intent/kernelError';
import { isFinishToken, type FinishToken } from '../../shared/render/finishes';
import {
  ACCEPTED_MATERIAL_NAMES,
  ENGINEERING_MATERIAL_NAMES,
  MATERIAL_ALIASES,
  canonicalMaterialName,
  defaultFinish,
  engineeringMaterialProps,
  type EngineeringMaterialName,
} from '../../shared/materials/engineeringMaterials';

/** A canonical material name — exactly the engineering grades. */
export type MaterialName = EngineeringMaterialName;

export { ACCEPTED_MATERIAL_NAMES, MATERIAL_ALIASES };

/**
 * Material name → its DEFAULT appearance finish token, keyed exhaustively by
 * the canonical grades. A view over the registry, kept as a record so the
 * drift gate can check every entry against FINISHES.
 *
 * `undefined` is meaningful and intentional: the material has a density but no
 * natural finish (see `petg`). It is NOT a placeholder to be filled with the
 * nearest-looking token — that would be a fake finish for a material.
 */
export const MATERIAL_FINISH: Readonly<Record<MaterialName, FinishToken | undefined>> =
  Object.freeze(
    Object.fromEntries(ENGINEERING_MATERIAL_NAMES.map((n) => [n, defaultFinish(n)])) as Record<
      MaterialName,
      FinishToken | undefined
    >,
  );

/** What a resolved material carries: its canonical name, the density seeded
 *  from the catalog, and the default finish (absent when the material has no
 *  natural finish, e.g. `petg`). `requested` echoes the caller's spelling so an
 *  alias resolution stays visible in provenance. */
export interface ResolvedMaterial {
  readonly name: MaterialName;
  readonly requested: string;
  /** kg/m^3, read live from the registry's catalog row — never copied here. */
  readonly density: number;
  /** Default appearance finish; undefined when the material has no finish (petg). */
  readonly finish?: FinishToken;
}

export type ResolveMaterialResult =
  | { readonly ok: true; readonly material: ResolvedMaterial }
  | { readonly ok: false; readonly message: string; readonly hint?: string };

/** The unknown-material diagnostic. One source so the throwing and the
 *  Result-returning paths print the identical sentence + valid list. */
export function unknownMaterialMessage(name: unknown): string {
  return (
    `Material '${String(name)}' is not a known material. ` +
    `Valid materials: ${ACCEPTED_MATERIAL_NAMES.join(', ')}.`
  );
}

/**
 * Resolve a material name to its density + default finish, WITHOUT throwing —
 * for callers (like the mass-properties tool) that report errors as structured
 * values rather than exceptions.
 *
 * On an unknown name that IS a valid appearance finish (`brass`, `glass`, …),
 * the hint steers to `.finish(...)` and states plainly why it is not an
 * assignable material: no engineering density exists for it, and we will not
 * invent one.
 */
export function tryResolveMaterial(requested: unknown): ResolveMaterialResult {
  const canonical = canonicalMaterialName(requested);
  if (canonical === undefined) {
    if (typeof requested !== 'string' || requested.length === 0) {
      return { ok: false, message: unknownMaterialMessage(requested) };
    }
    const hint = isFinishToken(requested)
      ? `'${requested}' is an appearance finish (use .finish('${requested}')), but it has ` +
        'no catalog density, so it is not an assignable material.'
      : 'Pass one of the accepted material names, or set an explicit density (kg/m^3).';
    return { ok: false, message: unknownMaterialMessage(requested), hint };
  }
  return {
    ok: true,
    material: {
      name: canonical,
      requested: requested as string,
      density: engineeringMaterialProps(canonical).densityKgPerM3,
      finish: defaultFinish(canonical),
    },
  };
}

/**
 * Resolve a material name, THROWING a structured `feature.invalid-args`
 * `KernelError` on an unknown name — for capture-time callers (`arm.part`)
 * that already surface authoring mistakes as exceptions. Never falls back.
 */
export function resolveMaterial(requested: unknown, featureId?: string): ResolvedMaterial {
  const r = tryResolveMaterial(requested);
  if (r.ok) return r.material;
  throw new KernelError('feature.invalid-args', r.message, featureId, r.hint);
}
