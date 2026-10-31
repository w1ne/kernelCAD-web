// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/lowPolyGlb.ts
//
// Helpers for the GLB `style: 'lowpoly'` profile: game-ready, flat-shaded
// meshes that carry their colour in a `COLOR_0` vertex attribute so every
// opaque part shares ONE material (a scene of such assets merges into a
// single draw call), plus the measured stats a catalog needs (triangles,
// real-world size in metres, how far the model hangs below its origin).

import * as THREE from 'three';
import type { ExportMeshDeflection } from '../backends/occt/backendMesh';
import type { PBRMaterial } from '../../shared/intent/material';

/** Name of the one shared vertex-coloured material in a low-poly GLB. */
export const LOWPOLY_PALETTE_MATERIAL = 'kernelcad-palette';

export interface LowPolyGlbOptions {
  /** Largest angle between neighbouring facets on curved faces, in degrees.
   *  Default 30: a full circle becomes about 12 segments. */
  readonly angularDeg?: number;
  /** Fail the export when the whole file has more triangles than this. */
  readonly maxTriangles?: number;
}

export interface GlbStats {
  readonly triangles: number;
  /** Bounding-box size in metres, in the file's own axes (x, y, z). */
  readonly sizeM: readonly [number, number, number];
  /** Lowest point on the file's up axis, in metres (0 = stands on its origin). */
  readonly minUpM: number;
}

export interface PaletteZone {
  readonly name: string;
  readonly color: string;
  readonly parts: string[];
}

const DEFAULT_ANGULAR_DEG = 30;

/** Coarse tessellation: angular deflection drives facet count, the relative
 *  linear deflection is loose enough not to subdivide flat or gently curved
 *  faces. */
export function lowPolyDeflection(options: LowPolyGlbOptions | undefined): ExportMeshDeflection {
  const angularDeg = options?.angularDeg ?? DEFAULT_ANGULAR_DEG;
  if (!(angularDeg >= 5 && angularDeg <= 90)) {
    throw new Error(`export.glb.lowpoly-angle: lowpoly.angularDeg must be between 5 and 90 (got ${angularDeg}).`);
  }
  return { linear: 0.5, relative: true, angularRad: (angularDeg * Math.PI) / 180 };
}

/** A part is kept on its own material when the shared opaque one cannot show it. */
export function needsOwnMaterial(pbr: PBRMaterial | undefined): boolean {
  return (pbr?.transmission ?? 0) > 0 || (pbr?.opacity ?? 1) < 1;
}

/** Non-indexed geometry (so normals are per facet) with a constant
 *  `COLOR_0`. The colour is stored linear, as glTF requires. */
export function flatColoredGeometry(
  mesh: { readonly vertices: ArrayLike<number>; readonly triangles: ArrayLike<number> },
  color: THREE.Color,
): THREE.BufferGeometry {
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(mesh.vertices), 3));
  indexed.setIndex(Array.from(mesh.triangles));
  const flat = indexed.toNonIndexed();
  indexed.dispose();
  flat.computeVertexNormals();
  const count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

/** The one opaque material every low-poly part shares; colour comes from COLOR_0. */
export function paletteMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  material.name = LOWPOLY_PALETTE_MATERIAL;
  return material;
}

/** Collect the named colour zones of a low-poly file (one per material name + colour). */
export function createPaletteCollector(): {
  add(name: string, color: THREE.Color, part: string): void;
  zones(): PaletteZone[];
} {
  const byKey = new Map<string, PaletteZone>();
  return {
    add(name, color, part) {
      const hex = `#${color.getHexString()}`;
      const key = `${name}\u0000${hex}`;
      const zone = byKey.get(key) ?? { name, color: hex, parts: [] };
      zone.parts.push(part);
      byKey.set(key, zone);
    },
    zones: () => [...byKey.values()],
  };
}

/**
 * Measure world-frame meshes (kernelCAD millimetres, Z up) in metres, in the
 * axes of the written file: Y up (glTF default) or Z up.
 */
export function measureMeshes(
  meshes: ReadonlyArray<{ readonly vertices: ArrayLike<number>; readonly triangles: ArrayLike<number> }>,
  axis: 'y-up' | 'z-up',
): GlbStats {
  let triangles = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) {
    triangles += Math.floor(mesh.triangles.length / 3);
    for (let i = 0; i + 2 < mesh.vertices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = mesh.vertices[i + k]!;
        if (v < min[k]!) min[k] = v;
        if (v > max[k]!) max[k] = v;
      }
    }
  }
  if (!Number.isFinite(min[0])) return { triangles, sizeM: [0, 0, 0], minUpM: 0 };
  const size = [0, 1, 2].map((k) => round6((max[k]! - min[k]!) * 0.001)) as [number, number, number];
  // The y-up root rotation maps CAD (x, y, z) to file (x, z, -y).
  const sizeM: [number, number, number] = axis === 'y-up' ? [size[0], size[2], size[1]] : size;
  return { triangles, sizeM, minUpM: round6(min[2]! * 0.001) };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
