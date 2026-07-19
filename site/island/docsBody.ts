// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Turning kernel output into a drawable three body — for the two paths that do
// it. The prebaked model (loaded before anyone touches the page) and the live
// Run result arrive differently: the prebake ships one welded geometry per body,
// the worker ships one array per OCCT face. Both are funnelled through
// `buildBody` here, so both are shaded by `docsMaterial` and edged by `addEdges`
// from identical geometry — nothing about pressing Run may change the picture.
//
// The edges are why the welding matters. `EdgesGeometry` reads topology: on a
// welded body a fillet's tangent boundary and a box corner are one continuous
// surface with a crease at the corner, and it draws the corner. On the raw
// per-face soup the worker sends, every face boundary is a loose edge and the
// whole wireframe would be drawn — so a body that shows a handful of edges when
// prebaked would light up with dozens the instant it was re-run. The live path
// therefore welds its faces exactly as prebake-docs-models.ts does (concatenate,
// then mergeVertices), which is what makes the two geometries identical rather
// than merely close, and the edges with them.
//
// This module is import-safe under node (three, three-stdlib, docsMaterial and
// docsEdges all are), so the render path can be asserted in a test without a
// browser — see docsBody.test.ts.

import * as THREE from 'three';
import { mergeVertices } from 'three-stdlib';
import { docsMaterial } from './docsMaterial';
import { addEdges } from './docsEdges';
import type { DocsMeshData } from './docsMesh';
import type { DocsMeshFeature } from './docs-worker';
import type { DocsAppearance } from './docsAppearance';

/**
 * One shaded, edged body from a single welded geometry. The transform, when
 * present, is the assembly solver's column-major 4x4 — three's own layout —
 * left on the object rather than applied to the vertices, so the raw
 * coordinates match what the bounds were computed from.
 */
function buildBody(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint16Array | Uint32Array,
  appearance: DocsAppearance | undefined,
  transform: Float32Array | readonly number[] | null | undefined,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const mesh = new THREE.Mesh(geometry, docsMaterial(appearance));
  addEdges(mesh);
  if (transform) {
    mesh.matrixAutoUpdate = false;
    mesh.matrix.fromArray(transform as number[]);
  }
  return mesh;
}

/** A prebaked body: geometry is already welded on disk, drawn as-is. */
export function buildPrebakedBody(
  feature: DocsMeshData,
  appearance: DocsAppearance | undefined,
): THREE.Mesh {
  return buildBody(feature.positions, feature.normals, feature.indices, appearance, feature.transform);
}

/**
 * A live Run body: the worker's per-face arrays, concatenated and welded into
 * one geometry — the exact operation prebake-docs-models.ts performs before it
 * writes the .kcm, so the result is the same welded body the reader already saw.
 */
export function buildLiveFeature(feature: DocsMeshFeature): THREE.Mesh {
  const totalVerts = feature.faces.reduce((s, f) => s + f.vertices.length, 0);
  const totalIndices = feature.faces.reduce((s, f) => s + f.indices.length, 0);
  const positions = new Float32Array(totalVerts);
  const normals = new Float32Array(totalVerts);
  const indices = new Uint32Array(totalIndices);
  let vOff = 0;
  let iOff = 0;
  for (const face of feature.faces) {
    positions.set(face.vertices, vOff);
    normals.set(face.normals, vOff);
    const base = vOff / 3;
    for (let i = 0; i < face.indices.length; i++) indices[iOff + i] = face.indices[i] + base;
    vOff += face.vertices.length;
    iOff += face.indices.length;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  // Lossless — differing normals keep hard edges split — and it is what makes
  // the edge topology match the prebaked model instead of merely resembling it.
  const welded = mergeVertices(geometry);

  return buildBody(
    welded.getAttribute('position').array as Float32Array,
    welded.getAttribute('normal').array as Float32Array,
    welded.getIndex()!.array as Uint16Array | Uint32Array,
    feature.appearance,
    feature.transform,
  );
}

/**
 * Free the GPU resources under a body tree: geometry and material for every
 * mesh, and the EdgesGeometry for every edge line. The edge material is the
 * shared singleton from docsEdges, so it is deliberately left alone. Run
 * replaces the whole model on every press, so an edge geometry not freed here
 * leaks once per Run.
 */
export function disposeBodyTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const material = node.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    } else if (node instanceof THREE.LineSegments) {
      node.geometry.dispose();
    }
  });
}
