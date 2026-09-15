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

import type { MaterialDeclarationEntry } from './types';
import { MATERIAL_CATALOG, CATALOG_KINDS, type CatalogKind, type MaterialProps } from './materialCatalog';
import { canonicalMaterialName, engineeringMaterialProps } from './engineeringMaterials';

// The property rows live in the leaf `materialCatalog.ts`; re-exported here so
// existing `beamMaterials` importers keep working.
export { MATERIAL_CATALOG, CATALOG_KINDS };
export type { CatalogKind, MaterialProps };

export type ResolveMaterialResult =
  | { readonly ok: true; readonly props: MaterialProps }
  | {
      readonly ok: false;
      readonly reason: 'missing-custom-field';
      readonly missingField: 'yieldStressMPa' | 'youngsModulusGPa';
    }
  | {
      readonly ok: false;
      readonly reason: 'unknown-material';
      /** The offending value as the caller passed it, for the diagnostic. */
      readonly material: string;
    };

/**
 * Resolve a per-part `MaterialDeclarationEntry` to its numeric SI props.
 *
 * - Any accepted material name — an engineering grade (`mild-steel`,
 *   `aluminum-6061`, `pla`, `petg`, `abs`, `nylon`) or one of its bulk aliases
 *   (`steel`, `aluminum`, `aluminium`, `pet`) — resolves through the single
 *   registry in `engineeringMaterials.ts`, the same one mass and FEA use.
 *   Optional inline overrides on the same entry (`yieldStressMPa`,
 *   `youngsModulusGPa`, `density`) replace the corresponding field per-call —
 *   useful for measured properties on a specific lot of PLA, for example,
 *   without losing the registry's default density.
 * - `material: 'custom'` requires both `yieldStressMPa` and
 *   `youngsModulusGPa`. Missing either field returns
 *   `{ ok: false, reason: 'missing-custom-field', missingField }` and the
 *   caller emits K8.
 * - An unrecognised `material` value (a typo or a bare SKU that is neither
 *   `'custom'` nor an accepted name) returns
 *   `{ ok: false, reason: 'unknown-material', material }` instead of crashing
 *   on an undefined row — the caller turns this into a clear diagnostic
 *   naming the offending value.
 */
export function resolveMaterialProps(
  entry: MaterialDeclarationEntry,
): ResolveMaterialResult {
  if (entry.material === 'custom') {
    if (entry.yieldStressMPa === undefined || !Number.isFinite(entry.yieldStressMPa)) {
      return { ok: false, reason: 'missing-custom-field', missingField: 'yieldStressMPa' };
    }
    if (entry.youngsModulusGPa === undefined || !Number.isFinite(entry.youngsModulusGPa)) {
      return { ok: false, reason: 'missing-custom-field', missingField: 'youngsModulusGPa' };
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
  // Guard the lookup: a value outside the accepted names (a typo or a bare SKU
  // string) would otherwise read `yieldStressPa` off `undefined`.
  const grade = canonicalMaterialName(entry.material);
  if (grade === undefined) {
    return { ok: false, reason: 'unknown-material', material: String(entry.material) };
  }
  const catalog = engineeringMaterialProps(grade);
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
