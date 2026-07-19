// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Feature edges drawn on top of the shaded model — the "shaded with edges" look
// every mechanical CAD tool ships. Without them a fillet reads as a soft
// gradient and a counterbore shoulder as a change in brightness; with them each
// becomes a line the eye lands on.
//
// The edges are computed HERE, in the viewer, from the same geometry that is
// being shaded — never baked into the model file. That is deliberate: the
// prebaked model and the live Run result must get their edges from this one
// function, or pressing Run could redraw the edges differently from the picture
// that loaded with the page. Both `showPrebaked` and `buildFeature` in
// docs-island.ts call `addEdges` on every mesh they add, so there is no second
// copy to drift.

import * as THREE from 'three';

/**
 * The dihedral angle, in degrees, above which a shared edge is drawn.
 *
 * `EdgesGeometry` keeps an interior edge only when the angle between its two
 * triangles exceeds this, and always keeps a boundary edge. That is the whole
 * trick: a box corner (90°) and a counterbore shoulder are kept, while the
 * triangulation *within* a flat face (0°) and the fine facets *along* a curved
 * wall are dropped — so the reader sees feature edges, not a wireframe mesh.
 *
 * 30° was tuned against the real docs pages. The corpus meshes coarsely, so a
 * fillet's blend surface is a few flat facets rather than a smooth sweep, and
 * the crease where the last facet meets the adjacent flat face lands well above
 * 30° — which is why fillet boundaries show at all. Lower (≈15°) starts drawing
 * the facets along cylinder walls (place & transform gained 230+ stray segments
 * at 1°); higher (≈45°) begins dropping the shallower fillet creases. 30° keeps
 * the features and none of the tessellation.
 */
export const EDGE_THRESHOLD_DEG = 30;

/**
 * A near-black desaturated blue-grey, not pure black.
 *
 * The parts are finished in anodised blues and teals, copper, light steel and a
 * light neutral. Pure black reads as a harsh cut-out on the darker anodised
 * faces; this tone sits just dark enough to hold a crisp line on the light
 * neutral while staying softer than black on the coloured metal.
 */
export const EDGE_COLOR = 0x1a2530;

// One material for every edge on the page. The colour never varies by body, so
// sharing it keeps the line count off the draw budget and means nothing here
// needs disposing — it lives for the life of the module. `depthTest` stays on;
// z-fighting is handled on the surface side (see below), not by letting edges
// punch through the model.
const edgeMaterial = new THREE.LineBasicMaterial({ color: EDGE_COLOR });

/**
 * Attach feature edges to a shaded mesh, as a child so they inherit its
 * transform and frame with it.
 *
 * Additive and never load-bearing: if `EdgesGeometry` cannot process this
 * geometry, the shaded mesh is left exactly as it was. A missing line is a
 * cosmetic loss; a thrown error here would blank the model, which is the one
 * outcome the docs viewer must never produce.
 */
export function addEdges(mesh: THREE.Mesh): void {
  try {
    const edges = new THREE.EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_DEG);
    mesh.add(new THREE.LineSegments(edges, edgeMaterial));
  } catch (err) {
    console.warn('docs: edges unavailable for a body', err);
  }
}
