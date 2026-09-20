// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/materials/materialCatalog.ts
//
// Bulk-material property rows (density, Young's modulus, yield) — the numeric
// source every material consumer reads. A leaf module: the engineering-grade
// registry (`engineeringMaterials.ts`) and the beam resolver
// (`beamMaterials.ts`) both import it, so neither has to import the other.
//
// Sources:
//   - Steel / Aluminum 6061-T6: MIL-HDBK-5J §3 (room-temp tensile data).
//   - PLA / ABS / PET: composite of Ultimaker / Prusa material datasheets
//     (mid-grade FDM-print bulk numbers; specific manufacturer-grade
//     overrides go via material: 'custom').

/** Numeric material properties consumed by the beam math (SI units). */
export interface MaterialProps {
  /** Pa — bending-stress comparison fires when σ exceeds this. */
  readonly yieldStressPa: number;
  /** Pa — reserved for the follow-up deflection gate. */
  readonly youngsModulusPa: number;
  /** kg/m^3 — copied to part-level mass/CoM helpers when needed. */
  readonly densityKgPerM3: number;
}

/** Keys of the property rows. These are row ids, not the public material
 *  vocabulary — the public names are the grades in `engineeringMaterials.ts`,
 *  which alias these bulk spellings. */
export type CatalogKind = 'steel' | 'aluminum' | 'pla' | 'abs' | 'pet';

/** Catalog spans the five materials in the spec §5 / T6 numbers; 'custom'
 *  is intentionally not in the table — the resolver builds its props from
 *  the agent's inline yield + modulus values. */
export const MATERIAL_CATALOG: Readonly<
  Record<CatalogKind, MaterialProps>
> = Object.freeze({
  steel: {
    yieldStressPa: 250e6,
    youngsModulusPa: 200e9,
    densityKgPerM3: 7850,
  },
  aluminum: {
    yieldStressPa: 270e6,
    youngsModulusPa: 70e9,
    densityKgPerM3: 2700,
  },
  pla: { yieldStressPa: 50e6, youngsModulusPa: 3.5e9, densityKgPerM3: 1240 },
  abs: { yieldStressPa: 40e6, youngsModulusPa: 2.3e9, densityKgPerM3: 1040 },
  pet: { yieldStressPa: 55e6, youngsModulusPa: 2.7e9, densityKgPerM3: 1380 },
});

/** Catalog keys (everything except `custom`) — the runtime-valid bulk kinds. */
export const CATALOG_KINDS: ReadonlyArray<CatalogKind> = [
  'steel',
  'aluminum',
  'pla',
  'abs',
  'pet',
];
