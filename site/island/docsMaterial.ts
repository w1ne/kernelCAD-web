// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One function turns a `DocsAppearance` into a three material, and both the
// prebaked model and the live Run result go through it. That is the whole
// design: a reader who presses Run must not see the shading change.

import * as THREE from 'three';
import { DEFAULT_COLOR, resolveColor } from '../../src/shared/render/palette';
import type { DocsAppearance } from './docsAppearance';

/**
 * Uncoloured geometry: bead-blasted aluminium.
 *
 * Tuned down from a lighter, shinier setting because an up-facing top face was
 * clipping to white and swallowing the fillet running along its edge — on the
 * Select geometry page, the rounded edge IS the thing being demonstrated. Value
 * and roughness here are set so a flat face stays off white and a fillet still
 * reads as a distinct band against it.
 */
const PLAIN = { color: '#B4BDC7', metalness: 0.2, roughness: 0.55 } as const;

export function docsMaterial(appearance: DocsAppearance | undefined): THREE.MeshStandardMaterial {
  // `.material({ baseColor })` wins over `.color()` — the same precedence the
  // kernel applies when it promotes a colour into a PBR record.
  const token = appearance?.baseColor ?? appearance?.color;
  const hex = resolveColor(token) ?? (token === undefined ? PLAIN.color : DEFAULT_COLOR);
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    metalness: appearance?.metalness ?? PLAIN.metalness,
    roughness: appearance?.roughness ?? PLAIN.roughness,
    // OCCT emits per-face islands with outward normals; without this the inside
    // of a shelled body reads as a hole.
    side: THREE.DoubleSide,
    // Push the filled surface a hair back in depth so the edge lines drawn on
    // top of it (docsEdges.ts) win the depth test cleanly. Edge lines are
    // coplanar with the faces they trace, and without this bias they shimmer and
    // drop out as the camera orbits. Offsetting the fill — rather than the lines
    // — keeps the lines at their true depth, so they never punch through a
    // surface that is genuinely in front of them.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}
