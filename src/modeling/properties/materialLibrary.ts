// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/properties/materialLibrary.ts
//
// The one place a MATERIAL NAME resolves to BOTH an engineering density and a
// default surface finish — the Fusion/Onshape model, where assigning a named
// material seeds how a part weighs (mass properties) AND how it looks
// (appearance), each independently overridable afterwards.
//
// This module does NOT own any numbers. It is a thin reconciliation layer over
// two tables that already exist and each stay the single source for their axis:
//   - density comes from `MATERIAL_CATALOG` (src/kinematic/beamMaterials.ts) —
//     the same rows the closed-form beam check reads. We never copy a density
//     here; a catalog edit flows straight through.
//   - the finish comes from `FINISHES` (src/shared/render/finishes.ts) — the
//     appearance vocabulary. We map a material to a finish TOKEN, never to raw
//     PBR floats.
//
// The two vocabularies disagreed and this file reconciles them:
//   - Spelling. The catalog spells it `aluminum` (US); the finish table spells
//     it `aluminium` (UK). We pick `aluminum` as the CANONICAL material name —
//     it is the density source-of-truth key AND the `MaterialKind` the beam
//     path already types on, both of which are out of scope to rename — and
//     alias `aluminium` onto it so either spelling resolves to the same
//     material (same density, same finish).
//   - Coverage gaps, handled honestly, never papered over with a fake number:
//       * `pet` has a catalog density but no natural finish token → its
//         `finish` is left undefined. Assigning `pet` seeds density only; the
//         shape keeps whatever appearance it already had.
//       * finish tokens like `brass` / `copper` / `glass` have NO engineering
//         density in the catalog, so they are NOT assignable materials here —
//         they stay pure appearance reachable via `.finish(...)`. We refuse to
//         invent a density for them; `resolveMaterial('brass')` throws and the
//         diagnostic points the author at `.finish('brass')` instead.
//
// A material name that is neither a catalog kind nor a known alias throws,
// naming the valid materials. There is NO silent fallback to water density or a
// default finish: a wrong name must surface, not quietly weigh a steel bracket
// as water.

import { KernelError } from '../../shared/intent/kernelError';
import { isFinishToken, type FinishToken } from '../../shared/render/finishes';
import { CATALOG_KINDS, MATERIAL_CATALOG } from '../../kinematic/beamMaterials';
import type { MaterialKind } from '../../kinematic/types';

/** A canonical material name — exactly the density-bearing catalog kinds. */
export type MaterialName = Exclude<MaterialKind, 'custom'>;

/**
 * Material name → its DEFAULT appearance finish token. Keyed exhaustively by
 * the catalog kinds so the material-library drift gate fails the moment the
 * catalog gains or loses a material without this map being updated.
 *
 * `undefined` is meaningful and intentional: the material has a density but no
 * natural finish (see `pet`). It is NOT a placeholder to be filled with the
 * nearest-looking token — that would be a fake finish for a material.
 */
export const MATERIAL_FINISH: Readonly<Record<MaterialName, FinishToken | undefined>> =
  Object.freeze({
    steel: 'steel',
    aluminum: 'aluminium', // US material name → UK finish token (the reconciliation)
    pla: 'pla',
    abs: 'abs',
    pet: undefined, // density-bearing, but there is no honest `pet` finish token
  });

/**
 * Alternate spellings → canonical material name. Kept deliberately tiny: this
 * is for genuinely different spellings of the SAME material (the aluminium /
 * aluminum split), not for near-synonyms or grades.
 */
export const MATERIAL_ALIASES: Readonly<Record<string, MaterialName>> = Object.freeze({
  aluminium: 'aluminum',
});

/** Every accepted spelling (canonical + aliases), for diagnostics. Canonical
 *  names first so the list reads catalog-order, then the alt spellings. */
export const ACCEPTED_MATERIAL_NAMES: readonly string[] = [
  ...CATALOG_KINDS,
  ...Object.keys(MATERIAL_ALIASES),
];

/** What a resolved material carries: its canonical name, the density seeded
 *  from the catalog, and the default finish (absent when the material has no
 *  natural finish, e.g. `pet`). `requested` echoes the caller's spelling so an
 *  alias resolution stays visible in provenance. */
export interface ResolvedMaterial {
  readonly name: MaterialName;
  readonly requested: string;
  /** kg/m^3, read live from `MATERIAL_CATALOG` — never copied here. */
  readonly density: number;
  /** Default appearance finish; undefined when the material has no finish. */
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

function isCanonical(name: string): name is MaterialName {
  return (CATALOG_KINDS as readonly string[]).includes(name);
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
  if (typeof requested !== 'string' || requested.length === 0) {
    return { ok: false, message: unknownMaterialMessage(requested) };
  }
  const canonical: MaterialName | undefined = isCanonical(requested)
    ? requested
    : MATERIAL_ALIASES[requested];
  if (canonical === undefined) {
    const hint = isFinishToken(requested)
      ? `'${requested}' is an appearance finish (use .finish('${requested}')), but it has ` +
        'no catalog density, so it is not an assignable material.'
      : 'Pass one of the catalog materials, or set an explicit density (kg/m^3).';
    return { ok: false, message: unknownMaterialMessage(requested), hint };
  }
  return {
    ok: true,
    material: {
      name: canonical,
      requested,
      density: MATERIAL_CATALOG[canonical].densityKgPerM3,
      finish: MATERIAL_FINISH[canonical],
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
