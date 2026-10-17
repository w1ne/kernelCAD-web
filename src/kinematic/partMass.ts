// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/partMass.ts
//
// Local (shape-frame) mass properties of one assembly part, shared by the
// static-hold and motion-load checks. Mass precedence:
//   1. `massKg` on the part (catalog / datasheet mass): CoM and inertia from
//      the geometry, scaled to that mass;
//   2. volume x `density` (explicit, or the named `material`'s density);
//   3. volume x 1000 kg/m^3 (water), flagged `densityDefaulted`.

import type { AssemblyPartStored } from '../modeling/capture/assembly';
import type { SceneBackendPart } from '../kernel/backends/sceneBackend';
import { tryResolveMaterial } from '../modeling/properties/materialLibrary';
import type { M3, V3 } from './rigidBodyLoads';

export const DEFAULT_DENSITY = 1000;

export interface PartMassLocal {
  readonly mass: number;
  /** Shape-local CoM, mm. */
  readonly comLocalMm: V3;
  /** Shape-local centroidal inertia, kg·m². */
  readonly inertiaLocal: M3;
  readonly source: 'massKg' | 'density' | 'material' | 'default';
}

export function resolvePartDensity(part: AssemblyPartStored): { density: number; source: PartMassLocal['source'] } {
  if (part.density !== undefined) return { density: part.density, source: part.material !== undefined ? 'material' : 'density' };
  if (part.material !== undefined) {
    const resolved = tryResolveMaterial(part.material);
    if (resolved.ok) return { density: resolved.material.density, source: 'material' };
  }
  return { density: DEFAULT_DENSITY, source: 'default' };
}

export function localPartMass(part: AssemblyPartStored, scenePart: SceneBackendPart): PartMassLocal {
  const { density, source } = resolvePartDensity(part);
  const mp = scenePart.shape.massProperties(density);
  const k = part.massKg !== undefined && mp.mass > 0 ? part.massKg / mp.mass : 1;
  const inertiaLocal = mp.inertiaMatrix.map((row) => row.map((v) => v * k)) as unknown as M3;
  return {
    mass: mp.mass * k,
    comLocalMm: mp.com,
    inertiaLocal,
    source: part.massKg !== undefined ? 'massKg' : source,
  };
}
