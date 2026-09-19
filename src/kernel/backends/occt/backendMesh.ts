// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/backendMesh.ts
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { stitchCracks, dropDegenerateTriangles } from './meshHeal';

/**
 * Export-grade mesher. Builds an OCCT `BRepMesh_IncrementalMesh_2` with
 * `isRelative=true` (linear tolerance is scaled by each edge's length), then
 * reads back per-face triangulation via replicad's `face.triangulation()`.
 *
 * Why bypass `shape.mesh()`: replicad's `mesh()` always re-runs `_mesh()`
 * with absolute (non-relative) deflection, which produces seam slivers on
 * adjacent curved faces (cones, sweeps) — the resulting STL fails open3d's
 * `is_watertight()` check even when the BREP is topologically perfect.
 * Relative-deflection mode + a tight angularTolerance produces matched
 * boundary discretization across faces, eliminating the slivers.
 *
 * Cost: ~3-4x slower mesh on cone-heavy parts, negligible on box / plate.
 * Used only for STL export; the preview path keeps the coarse defaults.
 */
export function meshShapeForExport(shape: replicad.Shape3D): { vertices: number[]; triangles: number[] } {
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (shape as any).wrapped;
  // Wipe any cached preview-grade triangulation so the fresh mesher actually
  // runs. `theForce=true` removes triangulation on all faces, not just those
  // marked dirty.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (oc as any).BRepTools.Clean(wrapped, true);

  // Whole-shape mesher escape hatch for pathologically dense imported packages.
  //
  // OCCT's shape-level BRepMesh ABORTS (throws a raw exception pointer) on some
  // very dense multi-face imported STEP — notably KiCad's LQFP-144 (2195 faces).
  // Worse, the aborted pass irreversibly damages the shape's geometry: a later
  // per-face retry (or even a STEP round-trip) then yields nothing. Recovery
  // after the fact is impossible, so the only safe path is to NOT run the
  // shape-level mesher on shapes dense enough to risk it, and mesh every face
  // independently instead (proven to succeed face-by-face where the whole-shape
  // pass fails). Every board component we currently ship meshes cleanly at the
  // shape level up to 1275 faces (ESP32-S3-WROOM-1); the LQFP-144 outlier is at
  // 2195. A 1600-face gate cleanly separates them, so every existing export
  // keeps its byte-identical shape-level triangulation and only the outliers
  // take the per-face path.
  const WHOLE_SHAPE_FACE_LIMIT = 1600;
  let faceCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _f of shape.faces) faceCount++;

  // Fresh tessellation with relative-deflection mode. The ctor performs the
  // meshing and stamps each face's triangulation in-place.
  // BRepMesh_IncrementalMesh_2(theShape, theLinDeflection, isRelative,
  //                            theAngDeflection, isInParallel)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mesher: any = null;
  if (faceCount <= WHOLE_SHAPE_FACE_LIMIT) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mesher = new (oc as any).BRepMesh_IncrementalMesh_2(
        wrapped,
        0.01, // linear deflection — scaled per-edge because isRelative=true,
              //   so absolute deflection is ~0.01 * edgeLength (e.g. 0.3 mm on a
              //   30 mm slant; 0.6 mm on a 60 mm radius) — finer than the
              //   absolute-mode 0.05 default, with uniform refinement across
              //   face boundaries.
        true, // isRelative — tolerance is fraction of edge length
        0.05, // angular deflection (rad). Replicad's default is 0.1; halving to
              //   0.05 reduces chord error on curved surfaces. Note: tightening
              //   further does not eliminate OCCT-mesher self-intersection on
              //   adjacent cone rings (a known mesher limitation, not tolerance
              //   sensitivity) — see cqe-task14 follow-up for the welding +
              //   self-intersection fix.
        false, // isInParallel
      );
    } catch {
      // A shape below the gate still aborted: best-effort per-face below rather
      // than crash the whole export (the aborted pass may have damaged this
      // shape, so its part can come out empty — the watertight verify reports it).
      mesher = null;
    }
  }
  if (mesher === null) {
    // No shape-level triangulation: mesh every face independently in ABSOLUTE
    // mode so the read-back loop finds populated triangulations.
    for (const face of shape.faces) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fw = (face as any).wrapped;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (oc as any).BRepTools.Clean(fw, true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fm = new (oc as any).BRepMesh_IncrementalMesh_2(fw, 0.02, false, 0.1, false);
        fm.delete();
      } catch {
        // Face left untriangulated; the read-back loop's fallback + the
        // watertight verify will surface any resulting hole.
      }
    }
  }
  try {
    // Read per-face triangulation directly. This is the same loop as
    // replicad's `Shape3D.mesh()` minus the redundant _mesh() call that
    // would overwrite our relative-mode triangulation with the absolute-mode
    // default.
    const rawTriangles: number[] = [];
    const rawVertices: number[] = [];
    for (const face of shape.faces) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tri = (face as any).triangulation(rawVertices.length / 3) as {
        vertices: number[];
        trianglesIndexes: number[];
      } | null;
      if (!tri || tri.vertices.length === 0) {
        // The whole-shape relative-deflection pass can leave individual faces
        // untriangulated (boolean leftovers at exact tangencies) — silently
        // skipping them leaves the entire face boundary as an open ring in
        // the STL. Retry the face alone in ABSOLUTE-deflection mode (the
        // relative-mode retry stays null on the regression corpus). The
        // fallback boundary won't match the neighbors' discretization;
        // the crack-stitch pass below makes the seam conformal.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fw = (face as any).wrapped;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (oc as any).BRepTools.Clean(fw, true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const faceMesher = new (oc as any).BRepMesh_IncrementalMesh_2(fw, 0.02, false, 0.1, false);
        faceMesher.delete();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tri = (face as any).triangulation(rawVertices.length / 3) as typeof tri;
        if (!tri || tri.vertices.length === 0) continue; // verify will report the hole
      }
      for (let i = 0; i < tri.trianglesIndexes.length; i++) rawTriangles.push(tri.trianglesIndexes[i]);
      for (let i = 0; i < tri.vertices.length; i++) rawVertices.push(tri.vertices[i]);
    }
    // Weld coincident vertices across face boundaries. OCCT's shape-level
    // mesher emits matching points on shared edges, but the per-face
    // read-back appends each face's vertex array independently — so a shared
    // edge ends up with two index sequences referring to coordinate-equal
    // but index-distinct vertices. open3d's `is_watertight()` requires each
    // edge to be shared by exactly two triangles via the *same* indices, so
    // without welding it reports the mesh as non-manifold (every shared edge
    // looks like four boundary edges instead of one shared edge).
    //
    // Quantize to 1e-7 mm — well below any geometric tolerance — to absorb
    // any floating-point drift between the per-face coordinate reads.
    const Q = 1e7;
    const canonical = new Map<string, number>();
    const vertices: number[] = [];
    const remap = new Int32Array(rawVertices.length / 3);
    for (let i = 0; i < rawVertices.length; i += 3) {
      const x = rawVertices[i];
      const y = rawVertices[i + 1];
      const z = rawVertices[i + 2];
      const key = `${Math.round(x * Q)},${Math.round(y * Q)},${Math.round(z * Q)}`;
      let idx = canonical.get(key);
      if (idx === undefined) {
        idx = vertices.length / 3;
        vertices.push(x, y, z);
        canonical.set(key, idx);
      }
      remap[i / 3] = idx;
    }
    const triangles: number[] = new Array(rawTriangles.length);
    for (let i = 0; i < rawTriangles.length; i++) triangles[i] = remap[rawTriangles[i]];
    const welded: { vertices: number[]; triangles: number[] } = {
      vertices,
      triangles: dropDegenerateTriangles(triangles),
    };
    // Heal T-junction cracks born at tangent junctions and along
    // fallback-face seams. No-op (0 splits) on conformal meshes.
    stitchCracks(welded, 0.05);
    welded.triangles = dropDegenerateTriangles(welded.triangles);
    return welded;
  } finally {
    if (mesher) mesher.delete();
  }
}
