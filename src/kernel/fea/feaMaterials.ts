// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/feaMaterials.ts
//
// Material table for the linear-static FEA path: Young's modulus, Poisson's
// ratio, and tensile yield, in SOLVER UNITS (mm / N / MPa) so the numbers go
// straight into the CalculiX `*ELASTIC` card with no conversion step that
// could silently drop a factor of 1e6.
//
// This module owns exactly ONE new fact per material: Poisson's ratio. E and
// yield are read LIVE from `MATERIAL_CATALOG` (src/kinematic/beamMaterials.ts)
// for every grade that already has a catalog row, so a catalog edit flows
// through to FEA without a second copy drifting. The same discipline as
// `modeling/properties/materialLibrary.ts`, which reconciles the catalog's
// density with the appearance table.
//
// The grade names here are FEA-facing and more specific than the catalog's
// bulk kinds, because a structural answer depends on the grade:
//   mild-steel     -> catalog `steel`     (250 MPa yield, 200 GPa)
//   aluminum-6061  -> catalog `aluminum`  (270 MPa yield, 70 GPa — 6061-T6)
//   pla            -> catalog `pla`
//   petg           -> catalog `pet`       (the catalog's PET row IS the PETG
//                                          print-grade datasheet composite)
//   abs            -> catalog `abs`
//   nylon          -> NO catalog row. This is the one grade whose E and yield
//                     are declared here, from PA12 SLS/FDM datasheet values.
//
// Poisson's ratio sources (pinned at write time):
//   - Mild steel 0.29, Al 6061-T6 0.33: MIL-HDBK-5J §3 room-temperature data.
//   - PLA 0.36 / PETG 0.40 / ABS 0.35 / PA12 0.39: mid-grade FDM/SLS
//     datasheet composites (Ultimaker / Prusa / EOS), the same provenance as
//     the catalog's polymer rows.
//
// A grade outside this table is NOT guessed: `resolveFeaMaterial` returns a
// structured failure naming the valid grades, and the caller turns that into
// a `feature.invalid-args` throw at capture time. Agents with measured
// properties pass explicit `{ E, nu, yield }` instead.

import { MATERIAL_CATALOG } from '../../kinematic/beamMaterials';
import type { MaterialKind } from '../../kinematic/types';
import { isFeaMaterialProps, type FeaMaterialProps } from '../../shared/intent/feaStudyRecord';

type CatalogKind = Exclude<MaterialKind, 'custom'>;

/** One FEA grade: where its stiffness/strength come from, plus its own nu. */
interface FeaGradeSpec {
  /** Catalog row supplying E and yield, or `null` when this grade declares
   *  them itself (no catalog row exists for it). */
  readonly catalog: CatalogKind | null;
  /** Poisson's ratio — the fact this table owns. */
  readonly nu: number;
  /** MPa — only for grades with `catalog: null`. */
  readonly yieldMPa?: number;
  /** MPa — only for grades with `catalog: null`. */
  readonly eMPa?: number;
}

const FEA_GRADES: Readonly<Record<string, FeaGradeSpec>> = Object.freeze({
  'mild-steel': { catalog: 'steel', nu: 0.29 },
  'aluminum-6061': { catalog: 'aluminum', nu: 0.33 },
  pla: { catalog: 'pla', nu: 0.36 },
  petg: { catalog: 'pet', nu: 0.4 },
  abs: { catalog: 'abs', nu: 0.35 },
  // PA12: no catalog row, so E and yield are declared here alongside nu.
  nylon: { catalog: null, nu: 0.39, eMPa: 1700, yieldMPa: 45 },
});

/** Every grade name the FEA path accepts, in table order. */
export const FEA_MATERIAL_NAMES: readonly string[] = Object.keys(FEA_GRADES);

export type ResolveFeaMaterialResult =
  | { readonly ok: true; readonly props: FeaMaterialProps; readonly name: string }
  | { readonly ok: false; readonly message: string; readonly hint: string };

/** Expand one grade row into solver-unit props. Catalog-backed grades read E
 *  and yield live (Pa -> MPa); self-declared grades read their own fields. */
function propsFor(spec: FeaGradeSpec): FeaMaterialProps {
  if (spec.catalog === null) {
    return { E: spec.eMPa!, nu: spec.nu, yield: spec.yieldMPa! };
  }
  const row = MATERIAL_CATALOG[spec.catalog];
  return {
    E: row.youngsModulusPa / 1e6,
    nu: spec.nu,
    yield: row.yieldStressPa / 1e6,
  };
}

/** Numeric props for every named grade — the agent-facing table dump used by
 *  the `kernelcad-fea` skill and `fea_summary`. */
export function feaMaterialTable(): Record<string, FeaMaterialProps> {
  const out: Record<string, FeaMaterialProps> = {};
  for (const [name, spec] of Object.entries(FEA_GRADES)) out[name] = propsFor(spec);
  return out;
}

function badProps(props: FeaMaterialProps): string | undefined {
  if (!(Number.isFinite(props.E) && props.E > 0)) return `E must be a positive finite number of MPa; got ${props.E}`;
  if (!(Number.isFinite(props.nu) && props.nu > -1 && props.nu < 0.5)) {
    return `nu must be a finite Poisson's ratio in (-1, 0.5); got ${props.nu}`;
  }
  if (!(Number.isFinite(props.yield) && props.yield > 0)) {
    return `yield must be a positive finite number of MPa; got ${props.yield}`;
  }
  return undefined;
}

/**
 * Resolve a study's `material` field to solver-unit props.
 *
 * Accepts a grade NAME from the table above, or explicit
 * `{ E, nu, yield }` (MPa / dimensionless / MPa) for a measured lot or a
 * grade the table does not carry. Never falls back to a default material —
 * an unknown name returns a failure naming every valid grade.
 */
export function resolveFeaMaterial(material: unknown): ResolveFeaMaterialResult {
  if (isFeaMaterialProps(material)) {
    const why = badProps(material);
    if (why !== undefined) {
      return {
        ok: false,
        message: `feaStudy: explicit material props are invalid — ${why}.`,
        hint: 'invalid-args.fea-study.material — pass { E, nu, yield } in MPa / dimensionless / MPa, or a named grade.',
      };
    }
    return { ok: true, props: { ...material }, name: 'custom' };
  }
  if (typeof material !== 'string' || material.length === 0) {
    return {
      ok: false,
      message:
        `feaStudy: material must be a grade name or { E, nu, yield }; got ${JSON.stringify(material)}. ` +
        `Valid grades: ${FEA_MATERIAL_NAMES.join(', ')}.`,
      hint: 'invalid-args.fea-study.material — pass one of the named grades, or explicit { E, nu, yield } in MPa.',
    };
  }
  const spec = FEA_GRADES[material];
  if (spec === undefined) {
    return {
      ok: false,
      message:
        `feaStudy: '${material}' is not a known FEA material grade. ` +
        `Valid grades: ${FEA_MATERIAL_NAMES.join(', ')}.`,
      hint: 'invalid-args.fea-study.material — pass one of the named grades, or explicit { E, nu, yield } in MPa if you have measured properties.',
    };
  }
  return { ok: true, props: propsFor(spec), name: material };
}
