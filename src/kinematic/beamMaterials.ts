// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/beamMaterials.ts
//
// Bulk-material catalog for the closed-form Euler-Bernoulli load path.
//
// Pinned at plan-write time. Catalog kinds carry yield stress, Young's
// modulus, and density; the closed-form bending-stress check only reads
// `yieldStressPa`, but `youngsModulusPa` lives in the same row for the
// follow-up deflection gate (K-coded with the same beam-not-applicable
// envelope) and `densityKgPerM3` mirrors the URDF / SDF inertial-block
// density field on `arm.part({ density })`.
//
// Sources:
//   - Steel / Aluminum 6061-T6: MIL-HDBK-5J §3 (room-temp tensile data).
//   - PLA / ABS / PET: composite of Ultimaker / Prusa material datasheets
//     (mid-grade FDM-print bulk numbers; specific manufacturer-grade
//     overrides go via material: 'custom').
//
// Agents needing a material outside the catalog pass `material: 'custom'`
// with explicit `yieldStressMPa` and `youngsModulusGPa`; an optional
// `density` overrides the catalog row's density when set on a catalog
// kind. No silent fallback to a default material — `checkLoadCapacity`
// fires K8 `kinematic.no-material-declared` when a load names a part
// without a corresponding material entry.

import type { MaterialDeclarationEntry, MaterialKind } from './types';

/** Numeric material properties consumed by the beam math (SI units). */
export interface MaterialProps {
  /** Pa — bending-stress comparison fires when σ exceeds this. */
  readonly yieldStressPa: number;
  /** Pa — reserved for the follow-up deflection gate. */
  readonly youngsModulusPa: number;
  /** kg/m^3 — copied to part-level mass/CoM helpers when needed. */
  readonly densityKgPerM3: number;
}

/** Catalog spans the five materials in the spec §5 / T6 numbers; 'custom'
 *  is intentionally not in the table — the resolver builds its props from
 *  the agent's inline yield + modulus values. */
export const MATERIAL_CATALOG: Readonly<
  Record<Exclude<MaterialKind, 'custom'>, MaterialProps>
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

export type ResolveMaterialResult =
  | { readonly ok: true; readonly props: MaterialProps }
  | { readonly ok: false; readonly missingField: 'yieldStressMPa' | 'youngsModulusGPa' };

/**
 * Resolve a per-part `MaterialDeclarationEntry` to its numeric SI props.
 *
 * - Catalog kinds (`steel` / `aluminum` / `pla` / `abs` / `pet`) read from
 *   `MATERIAL_CATALOG`. Optional inline overrides on the same entry
 *   (`yieldStressMPa`, `youngsModulusGPa`, `density`) replace the
 *   corresponding catalog field per-call — useful for measured properties
 *   on a specific lot of PLA, for example, without losing the catalog's
 *   default density.
 * - `material: 'custom'` requires both `yieldStressMPa` and
 *   `youngsModulusGPa`. Missing either field returns
 *   `{ ok: false, missingField }` and the caller emits K8.
 */
export function resolveMaterialProps(
  entry: MaterialDeclarationEntry,
): ResolveMaterialResult {
  if (entry.material === 'custom') {
    if (entry.yieldStressMPa === undefined || !Number.isFinite(entry.yieldStressMPa)) {
      return { ok: false, missingField: 'yieldStressMPa' };
    }
    if (entry.youngsModulusGPa === undefined || !Number.isFinite(entry.youngsModulusGPa)) {
      return { ok: false, missingField: 'youngsModulusGPa' };
    }
    return {
      ok: true,
      props: {
        yieldStressPa: entry.yieldStressMPa * 1e6,
        youngsModulusPa: entry.youngsModulusGPa * 1e9,
        densityKgPerM3: entry.density ?? 0,
      },
    };
  }
  const catalog = MATERIAL_CATALOG[entry.material];
  return {
    ok: true,
    props: {
      yieldStressPa:
        entry.yieldStressMPa !== undefined && Number.isFinite(entry.yieldStressMPa)
          ? entry.yieldStressMPa * 1e6
          : catalog.yieldStressPa,
      youngsModulusPa:
        entry.youngsModulusGPa !== undefined && Number.isFinite(entry.youngsModulusGPa)
          ? entry.youngsModulusGPa * 1e9
          : catalog.youngsModulusPa,
      densityKgPerM3:
        entry.density !== undefined && Number.isFinite(entry.density)
          ? entry.density
          : catalog.densityKgPerM3,
    },
  };
}
