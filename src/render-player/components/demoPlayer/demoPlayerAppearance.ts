// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render-player/components/demoPlayer/demoPlayerAppearance.ts
//
// Per-frame material overrides for animationView appearance tracks: set the
// base colour and/or emissive colour on every mesh material of the named
// feature groups. Render-only; geometry and transforms are untouched.

import * as THREE from 'three';
import { KCAD_FEATURE_GROUP_KEY } from './demoPlayerGeometry';

export interface FeatureAppearanceOverride {
  featureId: string;
  /** `#rrggbb` base colour. */
  color?: string;
  /** `#rrggbb` emissive colour; black = off. */
  emissive?: string;
}

type ColoredMaterial = THREE.Material & { color?: THREE.Color; emissive?: THREE.Color };

/** Apply overrides to the loaded feature groups; returns how many groups
 *  matched. Unknown feature ids are skipped. */
export function applyFeatureAppearance(
  scene: THREE.Scene,
  overrides: readonly FeatureAppearanceOverride[],
): { updated: number } {
  const groups = new Map<string, THREE.Group>();
  for (const child of scene.children) {
    if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
      groups.set(String(child.userData.featureId), child);
    }
  }
  let updated = 0;
  for (const override of overrides) {
    const group = groups.get(override.featureId);
    if (!group) continue;
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const materials = (Array.isArray(obj.material) ? obj.material : [obj.material]) as ColoredMaterial[];
      for (const material of materials) {
        if (override.color !== undefined && material.color instanceof THREE.Color) {
          material.color.set(override.color);
        }
        if (override.emissive !== undefined && material.emissive instanceof THREE.Color) {
          material.emissive.set(override.emissive);
        }
      }
    });
    updated += 1;
  }
  return { updated };
}
