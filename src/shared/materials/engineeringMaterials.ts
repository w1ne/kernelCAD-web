// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/materials/engineeringMaterials.ts
//
// The ONE material vocabulary. Every consumer that turns a material NAME into
// numbers or an appearance resolves through this table:
//   - mass / inertia       (`arm.part({ material })`, `inspect({ of: 'mass', material })`,
//                           static-hold)           via modeling/properties/materialLibrary
//   - FEA                  (`shape.feaStudy({ material })`) via kernel/fea/feaMaterials
//   - closed-form beam     (`verify({ check: 'load-capacity' })`) via ./beamMaterials
//   - default finish       (`arm.part({ material })`, `.finish(<material>)`)
//   - BOM provenance       (the canonical name recorded on the assembly part)
//
// Canonical names are the engineering GRADES — the spelling a drawing, a BOM
// line or a structural answer needs. The older bulk spellings (`steel`,
// `aluminum`, `aluminium`, `pet`) are explicit aliases onto those grades: the
// catalog's `steel` row IS 250 MPa mild steel, its `aluminum` row IS 6061-T6
// and its `pet` row IS the PETG print-grade composite, so the alias is exact,
// not a guess.
//
// Numbers are not copied here. A grade either points at its `MATERIAL_CATALOG`
// row (density, E, yield) or — for the one grade with no catalog row (nylon) —
// declares those three values itself. This table owns exactly two facts per
// grade: Poisson's ratio (FEA) and the default finish token (appearance).
//
// A name that is neither a grade nor an alias resolves to `undefined`; every
// caller turns that into a loud failure naming `ACCEPTED_MATERIAL_NAMES`. There
// is no silent fallback to water density, a default grade or a default finish.

import type { FinishToken } from '../render/finishes';
import { MATERIAL_CATALOG, type CatalogKind, type MaterialProps } from './materialCatalog';

/** The canonical engineering grade names, in table order. */
export const ENGINEERING_MATERIAL_NAMES = [
  'mild-steel',
  'aluminum-6061',
  'pla',
  'petg',
  'abs',
  'asa',
  'nylon',
] as const;

export type EngineeringMaterialName = (typeof ENGINEERING_MATERIAL_NAMES)[number];

/** Alternate spellings → canonical grade. Keys are genuinely the same material
 *  under a bulk or regional name, never a near-synonym. */
export const MATERIAL_ALIASES = Object.freeze({
  steel: 'mild-steel',
  aluminum: 'aluminum-6061',
  aluminium: 'aluminum-6061',
  pet: 'petg',
} as const satisfies Record<string, EngineeringMaterialName>);

export type MaterialAlias = keyof typeof MATERIAL_ALIASES;

/** Every spelling any material consumer accepts: grades first, then aliases. */
export type AnyMaterialName = EngineeringMaterialName | MaterialAlias;

export const ACCEPTED_MATERIAL_NAMES: readonly AnyMaterialName[] = [
  ...ENGINEERING_MATERIAL_NAMES,
  ...(Object.keys(MATERIAL_ALIASES) as MaterialAlias[]),
];

/** Broad material family. Callers use it for policy that depends on whether
 *  the stock is metallic or polymeric (for example BOM process inference);
 *  it carries no structural numbers of its own. */
export type MaterialFamily = 'metal' | 'polymer';

interface EngineeringMaterialRow {
  /** Catalog row supplying density / E / yield, or `null` when the grade
   *  declares them in `own` (it has no catalog row). */
  readonly catalog: CatalogKind | null;
  readonly own?: MaterialProps;
  /** Poisson's ratio (FEA). */
  readonly nu: number;
  /** Default appearance finish token; `undefined` when no honest token exists. */
  readonly finish: FinishToken | undefined;
  readonly family: MaterialFamily;
}

// Poisson's ratio sources: mild steel 0.29 and Al 6061-T6 0.33 from MIL-HDBK-5J
// §3 room-temperature data; PLA 0.36 / PETG 0.40 / ABS 0.35 / PA12 0.39 from
// mid-grade FDM/SLS datasheet composites (the catalog's polymer provenance).
// Nylon (PA12): E 1700 MPa and yield 45 MPa from the same datasheet family;
// density 1010 kg/m^3 is the PA12 bulk density (ISO 1183).
const ROWS: Readonly<Record<EngineeringMaterialName, EngineeringMaterialRow>> = Object.freeze({
  'mild-steel': { catalog: 'steel', nu: 0.29, finish: 'steel', family: 'metal' },
  // US material name → UK-spelled finish token that exists in FINISHES.
  'aluminum-6061': { catalog: 'aluminum', nu: 0.33, finish: 'aluminium', family: 'metal' },
  pla: { catalog: 'pla', nu: 0.36, finish: 'pla', family: 'polymer' },
  // No `petg` finish token exists; density seeds, appearance is left alone.
  petg: { catalog: 'pet', nu: 0.4, finish: undefined, family: 'polymer' },
  abs: { catalog: 'abs', nu: 0.35, finish: 'abs', family: 'polymer' },
  // ASA (acrylonitrile styrene acrylate): density 1.05 g/cm^3 (ISO 1183), E
  // 2120 MPa and tensile strength 37 MPa (X-Y, ISO 527) from the Bambu Lab ASA
  // TDS V3.0; nu 0.35 as for ABS (same styrenic family). Z-direction layer
  // strength is lower (31 MPa) - pass explicit props for a Z-critical load.
  // No `asa` finish token; it renders with the ABS shell finish.
  asa: {
    catalog: null,
    own: { yieldStressPa: 37e6, youngsModulusPa: 2.12e9, densityKgPerM3: 1050 },
    nu: 0.35,
    finish: 'abs',
    family: 'polymer',
  },
  nylon: {
    catalog: null,
    own: { yieldStressPa: 45e6, youngsModulusPa: 1.7e9, densityKgPerM3: 1010 },
    nu: 0.39,
    finish: 'nylon',
    family: 'polymer',
  },
});

/** Resolve any accepted spelling to its canonical grade; `undefined` for an
 *  unknown name. Case-sensitive on purpose — `Steel` is a typo, not a match. */
export function canonicalMaterialName(name: unknown): EngineeringMaterialName | undefined {
  if (typeof name !== 'string' || name.length === 0) return undefined;
  if ((ENGINEERING_MATERIAL_NAMES as readonly string[]).includes(name)) {
    return name as EngineeringMaterialName;
  }
  return Object.prototype.hasOwnProperty.call(MATERIAL_ALIASES, name)
    ? MATERIAL_ALIASES[name as MaterialAlias]
    : undefined;
}

/** Density / E / yield (SI) for a canonical grade, read live from the catalog
 *  row when the grade has one. */
export function engineeringMaterialProps(name: EngineeringMaterialName): MaterialProps {
  const row = ROWS[name];
  if (row.catalog !== null) return MATERIAL_CATALOG[row.catalog];
  return row.own!;
}

/** Poisson's ratio for a canonical grade. */
export function poissonRatio(name: EngineeringMaterialName): number {
  return ROWS[name].nu;
}

/** Default finish token for a canonical grade (undefined when none). */
export function defaultFinish(name: EngineeringMaterialName): FinishToken | undefined {
  return ROWS[name].finish;
}

/** Metal or polymer for a canonical grade. */
export function materialFamily(name: EngineeringMaterialName): MaterialFamily {
  return ROWS[name].family;
}

/** The catalog row a grade reads, or null for a self-declared grade. Exposed
 *  for the drift tests. */
export function catalogRowOf(name: EngineeringMaterialName): CatalogKind | null {
  return ROWS[name].catalog;
}
