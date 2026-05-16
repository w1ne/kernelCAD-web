import * as THREE from 'three';
import { resolveColor } from '../../../shared/render/palette';
import type { PBRMaterial } from '../../../shared/intent/material';

/** Default mesh color when a feature has no .color() metadata. Held as a
 *  number for THREE; mirrors the long-standing "neutral CAD silver" tone the
 *  demo player has always rendered. resolveColor() returns hex strings, which
 *  THREE.Material.color.set() also accepts. */
export const DEFAULT_MESH_COLOR = 0xc8d2e0;

/**
 * Construct a MeshPhysicalMaterial from a full PBR record. All optional PBR
 * fields default to physically neutral values so the output is always a valid
 * renderable material. When `pbr` is undefined the renderer's default neutral
 * CAD silver (DEFAULT_MESH_COLOR) is used.
 *
 * This is the canonical material factory for the demo player. Exported so
 * unit tests can exercise it without mounting a full React tree.
 */
export function buildMaterialFromPBR(pbr: PBRMaterial | undefined): THREE.Material {
  const baseColor = pbr?.baseColor ?? DEFAULT_MESH_COLOR;
  const resolved: number | string = resolveColor(typeof baseColor === 'string' ? baseColor : undefined) ?? DEFAULT_MESH_COLOR;
  return new THREE.MeshPhysicalMaterial({
    color: resolved,
    metalness: pbr?.metalness ?? 0,
    roughness: pbr?.roughness ?? 0.5,
    clearcoat: pbr?.clearcoat ?? 0,
    clearcoatRoughness: pbr?.clearcoatRoughness ?? 0.03,
    ior: pbr?.ior ?? 1.5,
    transmission: pbr?.transmission ?? 0,
    sheen: pbr?.sheen ?? 0,
  });
}
