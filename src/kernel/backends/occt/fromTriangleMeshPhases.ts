// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/fromTriangleMeshPhases.ts
//
// Phase helpers for `OcctBackend.fromTriangleMesh`. Extracted verbatim so the
// static method stays under the complexity ratchet and `occtBackend.ts` — which
// already trips the file-size ratchet — does not grow.

import { getOC } from 'replicad';

type OcctApi = ReturnType<typeof getOC>;
type OcctHandle<K extends keyof OcctApi> = InstanceType<OcctApi[K]>;

/** Validate the mesh arrays and return the vertex count. */
export function validateTriangleMesh(
  initialized: boolean,
  vertices: Float32Array,
  indices: Uint32Array,
): number {
  if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
  if (indices.length === 0) {
    throw new Error('OcctBackend.fromTriangleMesh: need at least one triangle (got 0 indices)');
  }
  if (indices.length % 3 !== 0) {
    throw new Error(`OcctBackend.fromTriangleMesh: indices length must be a multiple of 3 (got ${indices.length})`);
  }
  if (vertices.length % 3 !== 0) {
    throw new Error(`OcctBackend.fromTriangleMesh: vertices length must be a multiple of 3 (got ${vertices.length})`);
  }
  const nVerts = vertices.length / 3;
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    if (idx >= nVerts) {
      throw new Error(`OcctBackend.fromTriangleMesh: index ${idx} at indices[${i}] out of range (nVerts=${nVerts})`);
    }
  }
  return nVerts;
}

/**
 * Feed every non-degenerate triangle into the sewing builder. Returns the
 * triangle count and how many were skipped as zero-area slivers.
 */
export function addTriangleFaces(
  oc: OcctApi,
  sewing: OcctHandle<'BRepBuilderAPI_Sewing'>,
  vertices: Float32Array,
  indices: Uint32Array,
): { nTris: number; skipped: number } {
  // Build each triangle: 3 vertices → 3 edges (MakeEdge_3) → wire (MakeWire_4)
  // → planar face (MakeFace_15). `replicad-opencascadejs` does not expose
  // `BRepBuilderAPI_MakePolygon`, so we walk the underlying primitives.
  //
  // Surface-nets / marching-cubes can emit zero-area "sliver" triangles
  // where two vertices coincide within float epsilon. OCCT's
  // BRepBuilderAPI_MakeEdge_3 rejects these, so we filter them here.
  // The threshold matches the sewing tolerance (1 µm).
  const DEGEN_EPS_SQ = 1e-12;  // (1 µm)² in mm²
  const nTris = indices.length / 3;
  let skipped = 0;
  for (let t = 0; t < nTris; t++) {
    const i0 = indices[3 * t];
    const i1 = indices[3 * t + 1];
    const i2 = indices[3 * t + 2];
    const ax = vertices[3 * i0], ay = vertices[3 * i0 + 1], az = vertices[3 * i0 + 2];
    const bx = vertices[3 * i1], by = vertices[3 * i1 + 1], bz = vertices[3 * i1 + 2];
    const cx = vertices[3 * i2], cy = vertices[3 * i2 + 1], cz = vertices[3 * i2 + 2];
    const dab = (bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2;
    const dbc = (cx - bx) ** 2 + (cy - by) ** 2 + (cz - bz) ** 2;
    const dca = (ax - cx) ** 2 + (ay - cy) ** 2 + (az - cz) ** 2;
    if (dab < DEGEN_EPS_SQ || dbc < DEGEN_EPS_SQ || dca < DEGEN_EPS_SQ) {
      skipped++;
      continue;
    }
    const p0 = new oc.gp_Pnt_3(ax, ay, az);
    const p1 = new oc.gp_Pnt_3(bx, by, bz);
    const p2 = new oc.gp_Pnt_3(cx, cy, cz);
    const e01 = new oc.BRepBuilderAPI_MakeEdge_3(p0, p1);
    const e12 = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2);
    const e20 = new oc.BRepBuilderAPI_MakeEdge_3(p2, p0);
    const edge01 = e01.Edge();
    const edge12 = e12.Edge();
    const edge20 = e20.Edge();
    const wireBuilder = new oc.BRepBuilderAPI_MakeWire_4(edge01, edge12, edge20);
    const wire = wireBuilder.Wire();
    const faceBuilder = new oc.BRepBuilderAPI_MakeFace_15(wire, true);
    sewing.Add(faceBuilder.Face());
    // OCCT WASM is heap-managed; release intermediates explicitly.
    p0.delete?.();
    p1.delete?.();
    p2.delete?.();
    e01.delete?.();
    e12.delete?.();
    e20.delete?.();
    wireBuilder.delete?.();
    faceBuilder.delete?.();
  }
  return { nTris, skipped };
}
