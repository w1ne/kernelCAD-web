// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Mesh stats shared by GLB `asset.extras.kernelcad.stats` and `asset_manifest`.
// Geometry stays in millimetres until this module converts it to Y-up metres.

import type { PBRMaterial } from '../../shared/intent/material';
import { createMaterialNameRegistry } from './materialNaming';
import {
  LOWPOLY_PALETTE_MATERIAL,
  measureMeshes,
  needsOwnMaterial,
  type GlbStats,
} from './lowPolyGlb';

export interface GlbStatsPart {
  readonly mesh: { readonly vertices: ArrayLike<number>; readonly triangles: ArrayLike<number> };
  readonly name?: string;
  readonly material?: PBRMaterial;
  readonly color?: string;
  readonly colorParamName?: string;
}

/** Rig metadata already produced for GLB extras or `asset_manifest`. */
export interface GlbRigMetadata {
  readonly rig?: Readonly<Record<string, unknown>>;
  /** Set when the rig metadata itself records an IK target. */
  readonly hasIk?: boolean;
}

export interface MeasureGlbStatsOptions {
  readonly axis?: 'y-up' | 'z-up';
  /** `lowpoly` collapses opaque parts onto the shared palette material. */
  readonly style?: 'pbr' | 'lowpoly';
  readonly rig?: GlbRigMetadata;
}

/**
 * Measure meshed parts the way a GLB export does: triangles and a metre
 * bounding box, plus named-material, draw-call, part, and rig flags.
 * `drawCalls` counts mesh primitives (one per part that has triangles).
 */
export function measureGlbStats(
  parts: readonly GlbStatsPart[],
  options?: MeasureGlbStatsOptions,
): GlbStats {
  const geometry = measureMeshes(parts.map((part) => part.mesh), options?.axis ?? 'y-up');
  return {
    ...geometry,
    ...countMaterials(parts, options?.style ?? 'pbr'),
    ...rigStatsFlags(options?.rig),
  };
}

/** `hasRig` when the rig map has a joint. `hasIk` only when that metadata says so. */
export function rigStatsFlags(metadata: GlbRigMetadata | undefined): { hasRig: boolean; hasIk: boolean } {
  const rig = metadata?.rig;
  const hasRig = rig !== undefined && Object.keys(rig).length > 0;
  const hasIk = metadata?.hasIk === true || (rig !== undefined && Object.values(rig).some(entryDeclaresIk));
  return { hasRig, hasIk };
}

function entryDeclaresIk(entry: unknown): boolean {
  if (entry === null || typeof entry !== 'object') return false;
  const record = entry as Record<string, unknown>;
  return record.ik === true || record.hasIk === true;
}

function countMaterials(
  parts: readonly GlbStatsPart[],
  style: 'pbr' | 'lowpoly',
): Pick<GlbStats, 'materials' | 'drawCalls' | 'parts'> {
  const names = createMaterialNameRegistry();
  const materials = new Set<string>();
  let drawCalls = 0;
  parts.forEach((part, index) => {
    const resolved = names.resolve({
      pbr: part.material,
      colorParamName: part.colorParamName,
      partName: part.name,
      materialIndex: index,
      color: part.color,
    });
    const sharesPalette = style === 'lowpoly' && !needsOwnMaterial(part.material);
    materials.add(sharesPalette ? LOWPOLY_PALETTE_MATERIAL : resolved.name);
    if (Math.floor(part.mesh.triangles.length / 3) > 0) drawCalls += 1;
  });
  return { materials: materials.size, drawCalls, parts: parts.length };
}
