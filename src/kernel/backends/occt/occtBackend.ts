// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import opencascade from 'replicad-opencascadejs';
import type { ShapeBackend, BackendTarget } from '../backend';
import type { SceneBackend } from '../sceneBackend';
import type { Vec3, PlaneSpec, CardinalPlane } from '../../../shared/intent/types';
import type { RuntimeMesh } from '../runtimeMesh';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { isSameEdge } from './edgeQueries';
import { buildNurbsSketchOnPlane, hasNurbsSegments } from './pathNurbsLowerer';
import { encodeBinaryStl } from './exportStlBinary';
import { verifyWatertight, stitchCracks, dropDegenerateTriangles, type WatertightReport } from './meshHeal';
import { resolveColor } from '../../../shared/render/palette';
import { type PBRMaterial } from '../../../shared/intent/material';
import { sceneToWorldFrameParts } from './sceneToWorldFrame';
import { computeMassProperties, type MassProperties } from '../../../modeling/properties/massProperties';

type ReplicadEdge = replicad.Edge;
type ReplicadFace = replicad.Face;

let initialized = false;

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

/**
 * Initialize OpenCascade WASM and bind it to Replicad.
 *
 * Idempotent — safe to call multiple times. Must be awaited before any
 * `OcctBackend` static factory or method that constructs/measures shapes.
 *
 * Uses the same factory-style import as `HeadlessKernel` so it works in both
 * Node (vitest) and bundler (vite) contexts. Browser builds can pre-resolve
 * the WASM URL via Vite's `?url` syntax in their own init shim.
 */
export async function initOcct(): Promise<void> {
  if (initialized) return;
  let OC: unknown;
  if (typeof opencascade === 'function') {
    OC = await (opencascade as unknown as () => Promise<unknown>)();
  } else if (
    opencascade &&
    typeof (opencascade as { default?: () => Promise<unknown> }).default === 'function'
  ) {
    OC = await (opencascade as { default: () => Promise<unknown> }).default();
  } else {
    throw new Error('Could not find opencascade factory function');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replicad.setOC(OC as any);
  initialized = true;
}

type ReplicadShape3D = replicad.Shape3D;

/**
 * `ShapeBackend` implementation backed by Replicad / OpenCascade.
 *
 * Wraps a `replicad.Shape3D` and exposes the canonical kernelCAD operations
 * (transforms, booleans, measurements, exports). Static factories
 * (`box`, `cylinder`, `sphere`, plus extrude/revolve helpers) build new
 * shapes; instance methods are immutable — every transform/boolean returns
 * a new `OcctBackend` wrapping a fresh OCCT shape.
 *
 * NOTE: synchronous `exportSTL` / `exportSTEP` throw, because Replicad's
 * blob exporters are async. Use `exportSTLAsync` / `exportSTEPAsync` from
 * code that can await.
 */
export class OcctBackend implements ShapeBackend {
  readonly target: BackendTarget = 'export-occt';
  // erasableSyntaxOnly forbids constructor parameter properties — declare explicitly.
  private shape: ReplicadShape3D;
  readonly kind?: 'box' | 'cylinder' | 'sphere' | 'sketch';
  /** v0.2: per-shape face/edge identity tracking. Undefined for shapes that don't
   *  participate in history walks (legacy paths that don't construct lineage). */
  readonly historyMap?: import('../../naming/evolutionRecord').HistoryMap;
  private _drawing: replicad.Drawing | null = null;
  private _commands: SketchCommand[] | null = null;
  // When `_commands` contains at least one Slice D NURBS segment (`spline`,
  // `nurbsSegment`, `hermiteG2_2d`) the replicad 2D pen can't build the path
  // (the pen has no NURBS segment constructor — see the
  // `docs/audit/2026-05-18-slice-d-path-nurbs-symbols.md` audit). For those
  // sketches `_drawing` is left null and consumers (`extrudeFromSketch`,
  // `revolveFromSketch`, `liftSketchToFace`, `loftFromSketches`) lower the
  // SketchCommand[] freshly per target plane via `buildNurbsSketchOnPlane`
  // — composing a mixed wire from replicad pen-run edges + direct-OCCT
  // NURBS edges.
  private _hasNurbs: boolean = false;
  /** W3: face-bound replicad Sketch returned from `Drawing.sketchOnFace(face,
   *  scaleMode)`. When set, `extrudeFromSketch` calls `sketch.extrude(d)`
   *  directly so the extrusion follows the face normal (replicad's default for
   *  face-bound sketches). `_drawing` / `_commands` are left null for this
   *  branch — the sketch is already lifted into a 3D coordinate frame and
   *  cannot be reused on another plane. */
  private _faceBoundSketch: replicad.SketchInterface | null = null;

  constructor(
    shape: ReplicadShape3D,
    kind?: 'box' | 'cylinder' | 'sphere' | 'sketch',
    historyMap?: import('../../naming/evolutionRecord').HistoryMap,
  ) {
    this.shape = shape;
    this.kind = kind;
    this.historyMap = historyMap;
  }

  /**
   * Internal accessor for `edgeSelection.pickEdges` — returns the underlying replicad
   * shape so the helper can iterate `shape.faces` / `shape.edges`. Treat as
   * implementation detail; do not export from `index.ts`.
   */
  getReplicadShape(): ReplicadShape3D {
    return this.shape;
  }

  clone(): OcctBackend {
    return new OcctBackend(this.shape.clone() as ReplicadShape3D, this.kind, this.historyMap);
  }

  /**
   * Internal accessor — returns the original `SketchCommand[]` if this is a
   * sketch-tagged backend, else `null`. Consumers (e.g. the revolve lowerer)
   * use this to validate the profile before calling `revolveFromSketch`.
   */
  getSketchCommands(): SketchCommand[] | null {
    return this._commands;
  }

  static box(x: number, y: number, z: number, centered = false): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    // `replicad.makeBaseBox` returns a box centered in X and Y, anchored at Z=0.
    // Normalize to two well-known anchorings:
    //   - centered=false (default): box spans [0, x] x [0, y] x [0, z] (anchored at origin corner)
    //   - centered=true:            box spans [-x/2, x/2] x [-y/2, y/2] x [-z/2, z/2]
    const b = replicad.makeBaseBox(x, y, z) as ReplicadShape3D;
    const placed = centered
      ? (b.translate(0, 0, -z / 2) as ReplicadShape3D)
      : (b.translate(x / 2, y / 2, 0) as ReplicadShape3D);
    return new OcctBackend(placed, 'box');
  }

  static cylinder(h: number, r: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    return new OcctBackend(replicad.makeCylinder(r, h) as ReplicadShape3D, 'cylinder');
  }

  static sphere(r: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    return new OcctBackend(replicad.makeSphere(r) as ReplicadShape3D, 'sphere');
  }

  /**
   * Extrude a centered axis-aligned rectangular profile (width × height) on
   * the XY plane up to `height` along Z. The resulting solid is centered
   * about the origin in X/Y and spans `Z = 0..height`.
   */
  static extrudeRect(w: number, h: number, height: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    const sketch = replicad.drawRectangle(w, h).sketchOnPlane('XY');
    // `sketchOnPlane` may return Sketches for multi-face drawings; rect is single.
    const single = sketch as unknown as { extrude: (d: number) => ReplicadShape3D };
    return new OcctBackend(single.extrude(height));
  }

  /**
   * Extrude a circle of radius `r` (centered at origin on the XY plane) up to
   * `height` along Z.
   */
  static extrudeCircle(r: number, height: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    const sketch = replicad.drawCircle(r).sketchOnPlane('XY');
    const single = sketch as unknown as { extrude: (d: number) => ReplicadShape3D };
    return new OcctBackend(single.extrude(height));
  }

  /**
   * Extrude a closed polygon along +Z by `depth`.
   *
   * `points` is an array of `[x, y]` tuples in millimetres. Winding is normalized
   * — CW input is silently reversed to CCW before extrusion. The polygon must
   * have at least 3 distinct points; depth must be positive.
   *
   * @throws {Error} If fewer than 3 points or non-positive depth.
   * @throws {Error} If OCCT fails to construct or extrude (e.g. self-intersection).
   */
  static extrudePolygon(points: [number, number][], depth: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    if (points.length < 3) {
      throw new Error(`OcctBackend.extrudePolygon: need at least 3 points (got ${points.length})`);
    }
    if (depth <= 0) {
      throw new Error(`OcctBackend.extrudePolygon: depth must be positive (got ${depth})`);
    }

    const ccw = ensureCCW(points);

    // Build a 2D drawing using replicad's DrawingPen API:
    // draw(start).lineTo(p1)...lineTo(pn-1).close() returns a Drawing;
    // sketchOnPlane('XY') promotes it to a Sketch; extrude lifts it to a
    // 3D solid.
    let pen = replicad.draw(ccw[0]);
    for (let i = 1; i < ccw.length; i++) {
      pen = pen.lineTo(ccw[i]) as typeof pen;
    }
    const drawing = pen.close();
    const sketch = drawing.sketchOnPlane('XY');
    const single = sketch as unknown as { extrude: (d: number) => ReplicadShape3D };
    return new OcctBackend(single.extrude(depth));
  }

  /**
   * Extrude a rectangle with rounded corners along +Z by `depth`.
   *
   * `radius` is auto-clamped to `min(width/2, height/2)` so over-sized radii
   * don't trigger an OCCT error. Zero radius is treated as a sharp rectangle.
   *
   * @throws {Error} If `depth <= 0`.
   */
  static extrudeRoundedRect(width: number, height: number, radius: number, depth: number): OcctBackend {
    if (depth <= 0) {
      throw new Error(`OcctBackend.extrudeRoundedRect: depth must be positive (got ${depth})`);
    }
    // Replicad's drawRoundedRectangle requires r < min(width/2, height/2) when
    // building symmetric arcs — at the exact maximum the hLine segment becomes
    // zero-length and the tangentArc call fails. Cap at 99.99 % of the limit.
    const maxR = Math.min(width / 2, height / 2);
    const clamped = Math.min(Math.max(0, radius), maxR * 0.9999);
    const drawing = replicad.drawRoundedRectangle(width, height, clamped);
    const sketch = drawing.sketchOnPlane('XY');
    const single = sketch as unknown as { extrude: (d: number) => ReplicadShape3D };
    return new OcctBackend(single.extrude(depth));
  }

  /**
   * Build a sketch-tagged OcctBackend from an array of SketchCommands.
   *
   * The resulting instance has `kind === 'sketch'` and holds a Replicad Drawing
   * internally. It cannot be transformed or measured as a 3D solid — only
   * consumed by `extrudeFromSketch`.
   *
   * @throws {Error} If commands is empty, has no close command, or first command is not moveTo.
   */
  static fromSketchCommands(commands: SketchCommand[]): OcctBackend {
    if (commands.length === 0) {
      throw new Error('OcctBackend.fromSketchCommands: empty commands array.');
    }
    const closeIdx = commands.findIndex(c => c.kind === 'close');
    if (closeIdx === -1) {
      throw new Error('OcctBackend.fromSketchCommands: missing close command.');
    }
    const first = commands[0];
    if (first.kind !== 'moveTo') {
      throw new Error('OcctBackend.fromSketchCommands: first command must be moveTo.');
    }
    // NURBS Slice D — when the command list contains any of the three new
    // segment kinds, the replicad 2D pen can't build the path. Defer wire
    // construction to consumption time so the lowerer can target the right
    // plane (XY / XZ / YZ). `_drawing` stays null; `_hasNurbs` flips on so
    // every consumer dispatches to `buildNurbsSketchOnPlane`.
    if (hasNurbsSegments(commands)) {
      const back = new OcctBackend(undefined as unknown as ReplicadShape3D, 'sketch');
      back._commands = commands;
      back._hasNurbs = true;
      return back;
    }
    let pen = replicad.draw([first.x.evaluated, first.y.evaluated]);
    let currentX = first.x.evaluated;
    let currentY = first.y.evaluated;
    for (let i = 1; i < closeIdx; i++) {
      const c = commands[i];
      if (c.kind === 'lineTo') {
        pen = pen.lineTo([c.x.evaluated, c.y.evaluated]) as typeof pen;
      } else if (c.kind === 'tangentArc') {
        pen = pen.tangentArcTo([c.x.evaluated, c.y.evaluated]) as typeof pen;
      } else if (c.kind === 'threePointsArc') {
        pen = pen.threePointsArcTo([c.x.evaluated, c.y.evaluated], [c.midX.evaluated, c.midY.evaluated]) as typeof pen;
      } else if (c.kind === 'sagittaArc') {
        pen = pen.sagittaArcTo([c.x.evaluated, c.y.evaluated], c.sagitta.evaluated) as typeof pen;
      } else if (c.kind === 'bulgeArc') {
        pen = pen.bulgeArcTo([c.x.evaluated, c.y.evaluated], c.bulge.evaluated) as typeof pen;
      } else if (c.kind === 'radiusArc') {
        const cx = c.x.evaluated;
        const cy = c.y.evaluated;
        const cr = c.radius.evaluated;
        const chord = Math.hypot(cx - currentX, cy - currentY);
        if (chord < 1e-9) {
          throw new Error(`radiusArc: degenerate chord (start ≈ end) at point (${cx}, ${cy})`);
        }
        if (Math.abs(cr) < chord / 2) {
          throw new Error(`radiusArc: radius (${cr}) too small for chord length ${chord.toFixed(3)} — needs |radius| >= chord/2`);
        }
        const halfChord = chord / 2;
        const sagittaMagnitude = Math.abs(cr) - Math.sqrt(cr * cr - halfChord * halfChord);
        const signedSagitta = Math.sign(cr) * sagittaMagnitude;
        pen = pen.sagittaArcTo([cx, cy], signedSagitta) as typeof pen;
      } else if (c.kind === 'smoothSpline') {
        pen = pen.smoothSplineTo([c.x.evaluated, c.y.evaluated]) as typeof pen;
      }
      // Update position after every non-close command (all have explicit x/y endpoint)
      if ('x' in c && 'y' in c) {
        currentX = c.x.evaluated;
        currentY = c.y.evaluated;
      }
    }
    const drawing = pen.close();
    const back = new OcctBackend(undefined as unknown as ReplicadShape3D, 'sketch');
    back._drawing = drawing;
    back._commands = commands;
    return back;
  }

  /** Build a sketch-tagged OcctBackend directly from a replicad Drawing
   *  (e.g. the result of `drawText(...)` plus translate/rotate transforms).
   *  Used by `textLowerer.ts`. The returned backend has `kind === 'sketch'`
   *  and is consumed identically to one produced by `fromSketchCommands`. */
  static fromDrawing(drawing: replicad.Drawing): OcctBackend {
    const back = new OcctBackend(undefined as unknown as ReplicadShape3D, 'sketch');
    back._drawing = drawing;
    // No SketchCommand[] available — leave _commands null so any
    // downstream caller relying on _commands gracefully no-ops.
    return back;
  }

  /** W3: wrap a face-bound `replicad.Sketch` (returned from
   *  `drawing.sketchOnFace(face, scaleMode)`) as a sketch-tagged OcctBackend.
   *  Composes with `extrudeFromSketch` / `.cut()` exactly like a sketch built
   *  from `fromSketchCommands` / `fromDrawing`, except the extrude direction
   *  is the face normal (replicad's `Sketch.extrude(d)` semantics) rather
   *  than +Z. Used by `projectCurveLowerer` to escape a wrapped 2D curve into
   *  the 3D Shape pipeline. */
  static fromFaceBoundSketch(sketch: replicad.SketchInterface): OcctBackend {
    const back = new OcctBackend(undefined as unknown as ReplicadShape3D, 'sketch');
    back._faceBoundSketch = sketch;
    return back;
  }

  /**
   * Extrude a sketch-tagged OcctBackend into a 3D solid.
   *
   * The input must have `kind === 'sketch'` and a non-null `_drawing`. The
   * returned OcctBackend is a normal 3D solid with no `kind` tag.
   *
   * @throws {Error} If `sketch` is not a sketch-tagged backend.
   * @throws {Error} If `depth <= 0`.
   */
  static extrudeFromSketch(sketch: OcctBackend, depth: number): OcctBackend {
    if (
      sketch.kind !== 'sketch'
      || (!sketch._drawing && !sketch._hasNurbs && !sketch._faceBoundSketch)
    ) {
      throw new Error('OcctBackend.extrudeFromSketch: input is not a sketch.');
    }
    if (depth <= 0) {
      throw new Error(`OcctBackend.extrudeFromSketch: depth must be positive (got ${depth})`);
    }
    if (sketch._faceBoundSketch) {
      // W3: extrude the already face-bound sketch directly. replicad
      // extrudes along the face normal for face-bound sketches.
      const fb = sketch._faceBoundSketch as unknown as { extrude: (d: number) => ReplicadShape3D };
      return new OcctBackend(fb.extrude(depth));
    }
    if (sketch._hasNurbs && sketch._commands) {
      // NURBS path — build a fresh `replicad.Sketch` on XY from the captured
      // SketchCommand[], composing pen-run edges with direct-OCCT NURBS edges.
      const built = buildNurbsSketchOnPlane(sketch._commands, 'XY');
      return new OcctBackend(built.extrude(depth) as ReplicadShape3D);
    }
    const lifted = sketch._drawing!.sketchOnPlane('XY');
    const single = lifted as unknown as { extrude: (d: number) => ReplicadShape3D };
    return new OcctBackend(single.extrude(depth));
  }

  /**
   * Revolve a sketch-tagged OcctBackend around the Z axis. The sketch's
   * 2D drawing is lifted onto the XZ plane (so the path's first coord is
   * radial-X, second coord is axial-Z) and revolved around `[0,0,1]`.
   *
   * @param sketch the sketch-tagged backend whose drawing is the profile.
   * @param angleDeg sweep angle in degrees. Default 360 (full revolve).
   *   Values in (0, 360) produce a partial revolve via replicad's native
   *   `angle` option (preserves topology / face identity better than
   *   revolving 360 and cutting with a boolean half-space). Values outside
   *   `(0, 360]` are rejected by the caller (lowerer) — this method
   *   does not re-validate.
   *
   * The returned `OcctBackend` is a normal 3D solid with no `kind` tag.
   *
   * @throws {Error} If `sketch.kind !== 'sketch'` or `sketch._drawing` is null.
   * @throws {Error} If Replicad rejects the geometry (e.g. self-intersecting
   *   profile). Caller must catch and map to a diagnostic.
   */
  static revolveFromSketch(sketch: OcctBackend, angleDeg: number = 360): OcctBackend {
    if (sketch.kind !== 'sketch' || (!sketch._drawing && !sketch._hasNurbs)) {
      throw new Error('OcctBackend.revolveFromSketch: input is not a sketch.');
    }
    if (sketch._hasNurbs && sketch._commands) {
      // NURBS path — build the wire on XZ (so path-y becomes world-z) and
      // revolve around world Z, matching the Drawing-side behaviour.
      const built = buildNurbsSketchOnPlane(sketch._commands, 'XZ');
      const revolvable = built as unknown as {
        revolve: (
          axis?: [number, number, number],
          opts?: { origin?: [number, number, number]; angle?: number },
        ) => ReplicadShape3D;
      };
      if (angleDeg === 360) {
        return new OcctBackend(revolvable.revolve([0, 0, 1]));
      }
      return new OcctBackend(revolvable.revolve([0, 0, 1], { angle: angleDeg }));
    }
    const lifted = sketch._drawing!.sketchOnPlane('XZ');
    const single = lifted as unknown as {
      revolve: (
        axis?: [number, number, number],
        opts?: { origin?: [number, number, number]; angle?: number },
      ) => ReplicadShape3D;
    };
    if (angleDeg === 360) {
      return new OcctBackend(single.revolve([0, 0, 1]));
    }
    return new OcctBackend(single.revolve([0, 0, 1], { angle: angleDeg }));
  }

  /**
   * Lift a sketch-tagged backend's drawing onto a plane and return access to
   * its profile face. Centralizes the cast pattern + multi-face check used
   * by `sweepFromSketch`. The `SWEEP_MULTI_FACE_PROFILE:` prefix is preserved
   * in the message that surfaces in the `feature.kernel-failed` diagnostic
   * for sweep, so agents can still discriminate cause via the message.
   *
   * @throws {Error} If `sketch.kind !== 'sketch'` or `_drawing` is null.
   * @throws {Error} If the drawing produces multiple faces (Sketches plural).
   *
   * Public so direct-OCCT lowerers (e.g. `variableSweepLowerer`) that need
   * the lifted profile wire can reuse it without duplicating the cast +
   * multi-face guard.
   */
  static liftSketchToFace(
    sketch: OcctBackend,
    plane: 'XY' | 'XZ' | 'YZ',
  ): { face: () => { outerWire: () => replicad.Wire } } {
    if (sketch.kind !== 'sketch' || (!sketch._drawing && !sketch._hasNurbs)) {
      throw new Error('OcctBackend.liftSketchToFace: input is not a sketch.');
    }
    if (sketch._hasNurbs && sketch._commands) {
      const built = buildNurbsSketchOnPlane(sketch._commands, plane);
      // The NURBS path always produces a single closed `replicad.Sketch`
      // (assembleWire either returns one wire or throws); the multi-face
      // guard below is therefore a no-op here, but we keep the same shape
      // of the returned object so callers (`sweepFromSketch`,
      // `variableSweepLowerer`) don't branch.
      const liftedSketch = built as unknown as { face: () => { outerWire: () => replicad.Wire } };
      return { face: liftedSketch.face.bind(liftedSketch) };
    }
    const lifted = sketch._drawing!.sketchOnPlane(plane);
    if (typeof (lifted as { face?: unknown }).face !== 'function') {
      throw new Error('SWEEP_MULTI_FACE_PROFILE: profile drawing produces multiple faces; sweep accepts a single closed loop');
    }
    const liftedSketch = lifted as unknown as { face: () => { outerWire: () => replicad.Wire } };
    return { face: liftedSketch.face.bind(liftedSketch) };
  }

  /**
   * Sweep a sketch-tagged OcctBackend's profile along a 3D polyline rail.
   *
   * The profile is the sketch's outer wire lifted onto the XY plane. The rail
   * is assembled from sequential straight edges between rail points. Replicad's
   * `genericSweep` produces the swept Shape3D.
   *
   * @param sketch sketch-tagged backend (built via `fromSketchCommands`)
   * @param rail polyline of 3D points; must have ≥ 2 entries
   * @param opts.frenet if true, profile rotates with the rail's tangent + curvature
   *   (use for helices, twisted rails); if false (default), profile keeps fixed
   *   world-up vector (use for straight pipes, planar polyline rails)
   * @param opts.transitionMode how corners between consecutive rail edges are
   *   bridged: `'right'` (default — sharp corner, matches replicad's own
   *   default), `'transformed'` (extend tangents past the corner — useful
   *   for slight kinks where 'right' would clip the profile), `'round'`
   *   (insert a tangent arc — needed when the profile diameter exceeds the
   *   corner clearance). The choice only matters when the rail has interior
   *   vertices; for smooth single-edge spines the three modes are
   *   indistinguishable.
   * @param opts.spine how the rail points become the spine curve:
   *   `'polyline'` (default — consecutive straight edges; corners are real
   *   and `transitionMode` applies) or `'smooth'` (a single C2 B-spline edge
   *   approximated through the rail points — use when the rail samples a
   *   smooth curve such as a helix; per-segment polyline spines on dense
   *   rails make OCCT pipe-shell emit per-segment tubes that do not sew,
   *   leaving open square rings in the export mesh).
   *
   * @throws {Error} If `sketch.kind !== 'sketch'` or `_drawing` is null.
   * @throws {Error} If `rail.length < 2`.
   * @throws {Error} If Replicad rejects the sweep (caller maps to diagnostic).
   */
  static sweepFromSketch(
    sketch: OcctBackend,
    rail: [number, number, number][],
    opts: {
      frenet?: boolean;
      transitionMode?: 'right' | 'transformed' | 'round';
      spine?: 'polyline' | 'smooth';
    } = {},
  ): OcctBackend {
    // The kind/_drawing check is now inside liftSketchToFace; keep the
    // explicit message for the rail check (different concern).
    if (rail.length < 2) {
      throw new Error(`OcctBackend.sweepFromSketch: rail needs at least 2 points (got ${rail.length}).`);
    }
    const smoothSpine = (opts.spine ?? 'polyline') === 'smooth';
    let spineWire: replicad.Wire;
    if (smoothSpine) {
      // Single C2 B-spline edge approximated through the rail points.
      // Parameter choices:
      // - tolerance 1e-3 mm: the rail points lie exactly on the source curve
      //   (e.g. helix() samples), so a 1 µm approximation keeps the spine on
      //   that curve to well below manufacturing/export tolerance while
      //   still letting GeomAPI_PointsToBSpline drop redundant knots.
      // - degMin 3: cubic minimum so the C2 continuity OCCT pipe-shell needs
      //   for stable frame transport is met by construction (degree 1-2
      //   approximations satisfy C2 only piecewise-trivially).
      // - degMax 6: replicad's default cap; higher degrees gain nothing on
      //   sampled rails and risk oscillation.
      const spineEdge = replicad.makeBSplineApproximation(
        rail as unknown as Parameters<typeof replicad.makeBSplineApproximation>[0],
        { tolerance: 1e-3, degMin: 3, degMax: 6 },
      );
      spineWire = replicad.assembleWire([spineEdge]);
    } else {
      // Build the spine wire from rail edges (consecutive line segments).
      const edges: replicad.Edge[] = [];
      for (let i = 1; i < rail.length; i++) {
        const a = rail[i - 1];
        const b = rail[i];
        edges.push(replicad.makeLine(
          a as unknown as Parameters<typeof replicad.makeLine>[0],
          b as unknown as Parameters<typeof replicad.makeLine>[1],
        ));
      }
      spineWire = replicad.assembleWire(edges);
    }
    // Lift via the shared helper (handles sketch-kind check + multi-face guard).
    const { face } = OcctBackend.liftSketchToFace(sketch, 'XY');
    let profileWire = face().outerWire();
    if (smoothSpine) {
      // Place the profile AT the rail start, normal along the spine's start
      // tangent (replicad's own `Sketch.sweepSketch` builds the profile on
      // exactly this plane). Lifting on world-XY at the origin and letting
      // OCCT transport the profile→spine offset through the rotating frame
      // distorts the solid whenever the rail does not start at the origin
      // with a +Z tangent (e.g. a Z-axis helix starts at (r, 0, 0) with a
      // mostly-tangential direction).
      const tangent = spineWire.tangentAt(0).normalize();
      const [tx, ty, tz] = [tangent.x, tangent.y, tangent.z];
      // Rotate the profile's +Z normal onto the start tangent.
      const dot = Math.min(1, Math.max(-1, tz));
      if (dot < 1 - 1e-12) {
        const angleDeg = (Math.acos(dot) * 180) / Math.PI;
        // axis = +Z × tangent; degenerate only when tangent ∥ ±Z — for the
        // antiparallel case any axis perpendicular to Z works, pick +X.
        const axis: [number, number, number] =
          Math.hypot(-ty, tx) < 1e-12 ? [1, 0, 0] : [-ty, tx, 0];
        profileWire = profileWire.rotate(angleDeg, [0, 0, 0], axis);
      }
      profileWire = profileWire.translate(rail[0]);
    }
    // Sweep. Default `forceProfileSpineOthogonality: true` (replicad's typo'd
    // spelling preserved on-wire) — without it, a perpendicular profile on a
    // planar rail silently collapses to a flat shape because the spine's
    // tangent is co-planar with the profile. Replicad's own `Sketch.sweepSketch`
    // sets this to true by default for the same reason.
    const swept = replicad.genericSweep(profileWire, spineWire, {
      frenet: opts.frenet ?? false,
      forceProfileSpineOthogonality: true,
      transitionMode: opts.transitionMode ?? 'right',
    });
    return new OcctBackend(swept);
  }

  /**
   * Loft a sequence of sketch-tagged backends into a single solid by
   * interpolating between them. Each input sketch is lifted onto its target
   * plane (per the `planes` array, in order), then Replicad's `loftWith`
   * builds the swept-surface solid through all sections.
   *
   * @param sketches in order: first section through last section. Length ≥ 2.
   * @param planes per-section plane specifications. Length must equal sketches.length.
   * @param opts.ruled if true, transitions between sections are STRAIGHT
   *   (ruled surface) rather than smoothly interpolated. Use for polyhedral lofts.
   * @param opts.startPoint optional explicit start point before first section.
   * @param opts.endPoint optional explicit end point after last section.
   *
   * @throws {Error} If fewer than 2 sketches.
   * @throws {Error} If planes.length !== sketches.length.
   * @throws {Error} If any sketch.kind !== 'sketch' or _drawing is null.
   * @throws {Error} If Replicad rejects the loft (caller maps to diagnostic).
   */
  static loftFromSketches(
    sketches: OcctBackend[],
    planes: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>,
    opts: {
      ruled?: boolean;
      startPoint?: [number, number, number];
      endPoint?: [number, number, number];
    } = {},
  ): OcctBackend {
    if (sketches.length < 2) {
      throw new Error(`OcctBackend.loftFromSketches: need at least 2 sketches (got ${sketches.length}).`);
    }
    if (planes.length !== sketches.length) {
      throw new Error(`OcctBackend.loftFromSketches: planes count ${planes.length} must equal sketches count ${sketches.length}.`);
    }
    // Lift each sketch onto its target plane.
    const lifted: unknown[] = [];
    for (let i = 0; i < sketches.length; i++) {
      const s = sketches[i];
      if (s.kind !== 'sketch' || (!s._drawing && !s._hasNurbs)) {
        throw new Error(`OcctBackend.loftFromSketches: input ${i} is not a sketch.`);
      }
      const p = planes[i];
      if (s._hasNurbs && s._commands) {
        // NURBS path — build the sketch directly on the target plane. The
        // `origin` offset isn't applied (loft for NURBS-bearing sketches
        // currently assumes the path coordinates are already in their final
        // position). If a non-zero origin is needed, the path can encode it
        // explicitly via the SketchCommand coordinates.
        lifted.push(buildNurbsSketchOnPlane(s._commands, p.plane));
      } else {
        const drawing = s._drawing!;
        lifted.push(drawing.sketchOnPlane(p.plane, p.origin as unknown as Parameters<typeof drawing.sketchOnPlane>[1]));
      }
    }
    // Replicad's Sketch.loftWith expects the receiver as the first section
    // and an array (or one) of "other" sections.
    const [first, ...rest] = lifted;
    const loftConfig: { ruled?: boolean; startPoint?: unknown; endPoint?: unknown } = {};
    if (opts.ruled !== undefined) loftConfig.ruled = opts.ruled;
    if (opts.startPoint) loftConfig.startPoint = opts.startPoint;
    if (opts.endPoint) loftConfig.endPoint = opts.endPoint;
    const lofted = (first as { loftWith: (others: unknown[], cfg: typeof loftConfig) => ReplicadShape3D })
      .loftWith(rest, loftConfig);
    return new OcctBackend(lofted);
  }

  /**
   * Build a polyhedral solid OcctBackend from a triangle mesh.
   *
   * Internally: per triangle build a 3-edge polygon → planar face,
   * feed all faces into BRepBuilderAPI_Sewing, wrap the resulting
   * TopoDS_Shell with BRepBuilderAPI_MakeSolid.
   *
   * Throws if the resulting shell isn't closed (sewing tolerance 1 µm).
   *
   * Reuse path: `sdf.materialize` (W2.3) is the first caller; future
   * `lib.fromSTL` / `lib.fromOBJ` / `lib.fromGLB` callers + the orphaned
   * `importedMesh` FeatureKind consume the same helper.
   *
   * @param vertices Float32Array, length = 3 * nVertices (xyzxyzxyz…)
   * @param indices  Uint32Array, length = 3 * nTriangles (i0 i1 i2 i0 i1 i2 …)
   */
  static fromTriangleMesh(vertices: Float32Array, indices: Uint32Array): OcctBackend {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    // 1 µm sewing tolerance — well-tuned for marching-cubes output at default
    // resolution (verified on unit cube in this file's other tests).
    // Args: tol, option=true, cutting=true, nonManifold=true, FaceMode=false
    const sewing = new oc.BRepBuilderAPI_Sewing(1e-3, true, true, true, false);

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
    if (skipped > 0 && skipped === nTris) {
      throw new Error(`OcctBackend.fromTriangleMesh: all ${nTris} triangles were degenerate (zero-area within 1µm). Mesh has no usable geometry.`);
    }

    sewing.Perform(new oc.Message_ProgressRange_1());
    const sewedShape = sewing.SewedShape();
    sewing.delete?.();

    // SewedShape returns a TopoDS_Shape (typically a shell, sometimes a
    // compound or single face depending on connectivity). Inspect the
    // shape type before forcing a Shell cast.
    // TopAbs_ShapeEnum values: COMPOUND=0, COMPSOLID=1, SOLID=2, SHELL=3,
    // FACE=4, WIRE=5, EDGE=6, VERTEX=7, SHAPE=8.
    const shapeTypeRaw = sewedShape.ShapeType();
    const shapeTypeVal = typeof shapeTypeRaw === 'object' && shapeTypeRaw !== null
      ? (shapeTypeRaw as { value?: number }).value ?? shapeTypeRaw
      : shapeTypeRaw;
    let shell: unknown;
    if (shapeTypeVal === 3) {
      // SHELL — direct cast.
      shell = oc.TopoDS.Shell_1(sewedShape);
    } else {
      // Not a clean shell — sewing produced a compound or worse. Surface
      // as kernel-failed for the materialize lowerer to translate. The
      // most common cause is non-watertight mesh (open boundaries).
      throw new Error(`OcctBackend.fromTriangleMesh: sewing produced shape type ${shapeTypeVal} (expected SHELL=3); mesh is likely not watertight.`);
    }
    const makeSolid = new oc.BRepBuilderAPI_MakeSolid_3(shell);
    if (!makeSolid.IsDone()) {
      makeSolid.delete?.();
      throw new Error('OcctBackend.fromTriangleMesh: BRepBuilderAPI_MakeSolid failed (shell not closed)');
    }
    const solid = makeSolid.Solid();
    makeSolid.delete?.();

    // Wrap as a replicad Shape3D via the same path replicad uses for raw
    // TopoDS shapes returned by OCCT builders — `replicad.cast` inspects the
    // ShapeType and produces the right wrapper (Solid for closed solids).
    const wrapped = replicad.cast(solid) as ReplicadShape3D;
    return new OcctBackend(wrapped);
  }

  translate(x: number, y: number, z: number): OcctBackend {
    return new OcctBackend(this.shape.translate(x, y, z) as ReplicadShape3D);
  }

  rotate(axis: Vec3, degrees: number, pivot: Vec3 = [0, 0, 0]): OcctBackend {
    return new OcctBackend(this.shape.rotate(degrees, pivot, axis) as ReplicadShape3D);
  }

  /**
   * Apply an SE(3) Transform to this shape. Decomposes T = Translate · Rotate
   * into one rotate + one translate (about world origin) and dispatches to
   * the existing primitives. Used by the `solvedAssembly` lowerer to apply
   * forward-kinematics transforms to per-part shapes; also a convenience for
   * any caller holding a `Transform` value directly. The same decomposition
   * lives at capture time in `Shape.transform(t)` — both layers stay in sync
   * because both call `Transform.decomposeToTranslateAndRotate()`.
   */
  applyTransform(t: import('../../../shared/runtime/se3').Transform): OcctBackend {
    const { translate, rotateAxis, rotateDeg } = t.decomposeToTranslateAndRotate();
    const [tx, ty, tz] = translate;
    const hasRotate = rotateDeg !== 0;
    const hasTranslate = tx !== 0 || ty !== 0 || tz !== 0;
    if (!hasRotate && !hasTranslate) return this;
    if (!hasRotate) return this.translate(tx, ty, tz);
    const rotated = this.rotate([rotateAxis[0], rotateAxis[1], rotateAxis[2]], rotateDeg);
    if (!hasTranslate) return rotated;
    return rotated.translate(tx, ty, tz);
  }

  scale(s: number | Vec3): OcctBackend {
    const sx = typeof s === 'number' ? s : s[0];
    const sy = typeof s === 'number' ? s : s[1];
    const sz = typeof s === 'number' ? s : s[2];
    if (sx === sy && sy === sz) {
      return new OcctBackend(this.shape.scale(sx) as ReplicadShape3D);
    }
    // Non-uniform: gp_GTrsf + BRepBuilderAPI_GTransform applies a per-axis
    // diagonal directly to the TopoDS_Shape (replicad's own Shape.scale is
    // uniform-only, so we drop into raw OCCT here).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const gtrsf = new oc.gp_GTrsf_1();
    gtrsf.SetValue(1, 1, sx);
    gtrsf.SetValue(2, 2, sy);
    gtrsf.SetValue(3, 3, sz);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (this.shape as any).wrapped;
    const builder = new oc.BRepBuilderAPI_GTransform_2(wrapped, gtrsf, true);
    const resultShape = builder.Shape();
    const newShape = replicad.cast(resultShape) as ReplicadShape3D;
    builder.delete();
    gtrsf.delete();
    return new OcctBackend(newShape);
  }

  /**
   * Boolean union of the source and its reflection — the symmetric-part
   * shortcut. Equivalent to `this.union(this.reflect(plane))` but exposed
   * as a single method so the user-facing API and the lowerer can each
   * call it directly.
   *
   * For pure reflection without union, use `reflect(plane)`.
   *
   * NOTE: Replicad's transform primitives destroy the original OCCT shape
   * after returning the transformed copy. To safely produce the union of
   * the source and its reflection we must clone the source shape before
   * reflecting, so the original OCCT object stays alive for the fuse call.
   *
   * @throws {Error} If Replicad's boolean union fails (typically because
   *   the source touches the mirror plane, producing zero-thickness
   *   intersections).
   */
  mirror(plane: PlaneSpec): OcctBackend {
    const originalClone = this.shape.clone();
    const originalForUnion = new OcctBackend(originalClone);
    const reflected = this.reflect(plane);
    return originalForUnion.union(reflected);
  }

  /**
   * Pure reflection across a plane. The result has the same volume as the
   * source but with handedness flipped.
   *
   * Note on naming: this method calls the underlying Replicad `mirror()`
   * primitive, which is a pure-reflection operation (replaces the shape
   * with its reflection — does NOT perform a boolean union with the source).
   * kernelCAD's user-facing `Shape.mirror()` is a separate higher-level
   * method that does perform the union (the symmetric-part shortcut);
   * see `Shape.mirror` in `src/modeling/capture/proxy.ts`. Different verbs, different
   * layers — both names appear in our API for clarity.
   *
   * For offset planes (e.g. `{ plane: 'yz', offset: 5 }`) we decompose:
   * translate origin to offset → reflect across cardinal plane → translate
   * back. This is equivalent to reflecting across the plane x = offset,
   * which maps x' = 2*offset - x.
   *
   * @param plane Cardinal plane ('xy' | 'xz' | 'yz') or
   *              { plane: '<cardinal>', offset: number } for a parallel
   *              plane at the given offset along the plane's normal axis.
   */
  reflect(plane: PlaneSpec): OcctBackend {
    // Map kernelCAD cardinal names to Replicad's PlaneName (uppercase).
    const cardinalToReplicad: Record<CardinalPlane, 'XY' | 'XZ' | 'YZ'> = {
      xy: 'XY',
      xz: 'XZ',
      yz: 'YZ',
    };

    if (typeof plane === 'string') {
      const replicadPlane = cardinalToReplicad[plane];
      return new OcctBackend(this.shape.mirror(replicadPlane) as ReplicadShape3D);
    }

    // Offset form: reflect across a cardinal plane translated by `offset` along
    // its normal axis. Normal axes: xy → Z, xz → Y, yz → X.
    // offset is optional; treat a missing value as 0 (mirror through the origin plane).
    const { plane: cardinal, offset: rawOffset } = plane;
    const offset = rawOffset ?? 0;
    const replicadPlane = cardinalToReplicad[cardinal];

    // Determine the translation needed to shift the shape so that the offset
    // plane becomes the origin plane, reflect, then shift back.
    let tx = 0, ty = 0, tz = 0;
    if (cardinal === 'yz') tx = -offset;
    else if (cardinal === 'xz') ty = -offset;
    else if (cardinal === 'xy') tz = -offset;

    const shifted = this.shape.translate(tx, ty, tz) as ReplicadShape3D;
    const reflected = shifted.mirror(replicadPlane) as ReplicadShape3D;
    const restored = reflected.translate(-tx, -ty, -tz) as ReplicadShape3D;
    return new OcctBackend(restored);
  }

  /**
   * Apply a fillet of the given `radius` to all edges in `edges`.
   *
   * The returned `OcctBackend` has **no** `kind` tag — the result is no
   * longer a raw primitive. See `edgeSelection.pickEdges` for how to obtain
   * the edge list.
   *
   * @throws {Error} If `edges` is empty.
   * @throws {Error} If OCCT fails (e.g. radius too large for the geometry) —
   *   the original exception is re-thrown so the lowerer can catch and
   *   emit a `feature.kernel-failed` diagnostic.
   */
  fillet(edges: ReplicadEdge[], radius: number): OcctBackend {
    if (edges.length === 0) {
      throw new Error('OcctBackend.fillet: edge list must not be empty');
    }
    const result = this.shape.fillet(radius, (f) => f.inList(edges)) as ReplicadShape3D;
    return new OcctBackend(result);
  }

  /**
   * Apply a chamfer of the given `distance` to all edges in `edges`.
   *
   * The returned `OcctBackend` has **no** `kind` tag — the result is no
   * longer a raw primitive. See `edgeSelection.pickEdges` for how to obtain
   * the edge list.
   *
   * @throws {Error} If `edges` is empty.
   * @throws {Error} If OCCT fails (e.g. distance too large for the geometry) —
   *   the original exception is re-thrown so the lowerer can catch and
   *   emit a `feature.kernel-failed` diagnostic.
   */
  chamfer(edges: ReplicadEdge[], distance: number): OcctBackend {
    if (edges.length === 0) {
      throw new Error('OcctBackend.chamfer: edge list must not be empty');
    }
    const result = this.shape.chamfer(distance, (f) => f.inList(edges)) as ReplicadShape3D;
    return new OcctBackend(result);
  }

  /**
   * Variable-radius fillet: each group has its own radius. Edges that don't
   * match any group pass through unfilleted (Replicad's natural behavior
   * when the RadiusConfig function returns null). Uses geometric matching
   * (`isSameEdge`-style endpoint comparison) so per-group edge sets that
   * came from a separate `.edges` access on the same shape still match.
   *
   * @throws {Error} If Replicad rejects the geometry.
   */
  filletVariable(groups: Array<{ edges: ReplicadEdge[]; radius: number }>): OcctBackend {
    if (groups.length === 0) {
      return new OcctBackend(this.shape);  // no-op
    }
    const radiusFn = (e: ReplicadEdge): number | null => {
      for (const g of groups) {
        for (const ge of g.edges) {
          if (isSameEdge(e, ge)) return g.radius;
        }
      }
      return null;
    };
    const result = this.shape.fillet(radiusFn) as ReplicadShape3D;
    return new OcctBackend(result);
  }

  /**
   * Variable-distance chamfer — same shape as `filletVariable` but for chamfers.
   */
  chamferVariable(groups: Array<{ edges: ReplicadEdge[]; distance: number }>): OcctBackend {
    if (groups.length === 0) {
      return new OcctBackend(this.shape);  // no-op
    }
    const distanceFn = (e: ReplicadEdge): number | null => {
      for (const g of groups) {
        for (const ge of g.edges) {
          if (isSameEdge(e, ge)) return g.distance;
        }
      }
      return null;
    };
    const result = this.shape.chamfer(distanceFn) as ReplicadShape3D;
    return new OcctBackend(result);
  }

  /**
   * Hollow out the shape by removing `face` and offsetting all remaining
   * faces inward by `thickness` (mm). The result is a thin-walled shell
   * with the supplied face left open.
   *
   * The returned `OcctBackend` has **no** `kind` tag — once shelled, the
   * shape is no longer a raw primitive.
   *
   * @throws {Error} If `thickness <= 0`.
   * @throws {Error} If OCCT fails (e.g. thickness exceeds the shape's
   *   minimum thickness or geometry is degenerate). The lowerer catches
   *   and emits a `feature.kernel-failed` diagnostic.
   */
  shell(face: ReplicadFace, thickness: number): OcctBackend {
    if (thickness <= 0) {
      throw new Error(`OcctBackend.shell: thickness must be positive (got ${thickness})`);
    }
    const result = this.shape.shell(thickness, (f) => f.inList([face])) as ReplicadShape3D;
    return new OcctBackend(result);
  }

  union(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new OcctBackend((this.shape as any).fuse(o) as ReplicadShape3D);
  }

  subtract(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new OcctBackend((this.shape as any).cut(o) as ReplicadShape3D);
  }

  intersect(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new OcctBackend((this.shape as any).intersect(o) as ReplicadShape3D);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  splitByPlane(_normal: Vec3, _offset: number): [ShapeBackend, ShapeBackend] {
    throw new Error('splitByPlane not implemented in v0.1');
  }

  boundingBox(opts?: { exact?: boolean }): { min: Vec3; max: Vec3 } {
    if (opts?.exact) {
      const exact = this.tessellatedBoundingBox();
      if (exact) return exact;
      // Empty / unmeshable shape — fall through to Bnd_Box.
    }
    const bb = this.shape.boundingBox;
    const [minP, maxP] = bb.bounds;
    // OCCT's Bnd_Box inflates bounds by a tolerance gap; remove it so that
    // exact-axis-aligned primitives report integral coordinates. NOTE: even
    // gap-corrected, Bnd_Box stays padded on curved B-spline faces (control-
    // point hull); pass { exact: true } for a tessellation-tight box.
    const wrapped = (bb as unknown as { wrapped?: { GetGap?: () => number } }).wrapped;
    const gap =
      wrapped && typeof wrapped.GetGap === 'function' ? wrapped.GetGap() : 0;
    return {
      min: [minP[0] + gap, minP[1] + gap, minP[2] + gap] as Vec3,
      max: [maxP[0] - gap, maxP[1] - gap, maxP[2] - gap] as Vec3,
    };
  }

  /** Fold the standard-mesher vertex AABB. Returns undefined when the
   *  shape yields no triangles (empty compound). */
  private tessellatedBoundingBox(): { min: Vec3; max: Vec3 } | undefined {
    const p = this.getMesh().positions;
    if (p.length === 0) return undefined;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      if (p[i] < minX) minX = p[i];
      if (p[i] > maxX) maxX = p[i];
      if (p[i + 1] < minY) minY = p[i + 1];
      if (p[i + 1] > maxY) maxY = p[i + 1];
      if (p[i + 2] < minZ) minZ = p[i + 2];
      if (p[i + 2] > maxZ) maxZ = p[i + 2];
    }
    return { min: [minX, minY, minZ] as Vec3, max: [maxX, maxY, maxZ] as Vec3 };
  }

  /**
   * Compute mass, centre of mass, and inertia tensor about the CoM.
   *
   * Default density is 1000 kg/m^3 (water). Steel is ~7850, aluminum
   * ~2700, ABS ~1050. URDF + SDF `<inertial>` blocks consume these
   * values; pass a part-specific density to get a physically-meaningful
   * dynamics simulation.
   *
   * Backed by OCCT's `BRepGProp::VolumeProperties`. Mirrors the access
   * pattern in `curve3dEval.ts` for `LinearProperties`.
   */
  massProperties(density: number = 1000): MassProperties {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (this.shape as any).wrapped;
    return computeMassProperties(wrapped, density);
  }

  volume(): number {
    return Math.abs(replicad.measureVolume(this.shape));
  }

  surfaceArea(): number {
    return replicad.measureArea(this.shape);
  }

  isEmpty(): boolean {
    return this.shape.faces.length === 0;
  }

  /**
   * Enumerate the actual TopAbs_SOLID children of this BREP. This is the
   * authoritative part-connectivity fact: a compound with two solids is two
   * disconnected manufactured bodies even when their preview triangles happen
   * to touch or overlap numerically.
   */
  solidComponents(): readonly OcctBackend[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (this.shape as any).wrapped;
    const components: OcctBackend[] = [];
    const explorer = new oc.TopExp_Explorer_2(
      wrapped,
      oc.TopAbs_ShapeEnum.TopAbs_SOLID,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    try {
      while (explorer.More()) {
        const solid = oc.TopoDS.Solid_1(explorer.Current());
        components.push(new OcctBackend(replicad.cast(solid) as ReplicadShape3D));
        explorer.Next();
      }
    } finally {
      explorer.delete();
    }
    return components;
  }

  getMesh(): RuntimeMesh {
    // NOT the viewport mesh, despite what this comment used to say. The Studio
    // viewer renders `meshShape()` output from the worker; nothing in the render
    // path calls getMesh(). Its real consumers are ANALYSIS:
    // mechanicalPlausibility (disconnected-solid detection), mates/
    // mechanicalTransmission, and boundingBox({ exact: true }).
    //
    // So these tolerances are oracle inputs, not cosmetics — changing them moves
    // verification verdicts and exact-bbox numbers. They are deliberately left
    // at their historical values while FINE_MESH_OPTIONS was corrected; do not
    // "unify" them with the render presets without re-baselining the mates and
    // plausibility suites.
    //
    // angularTolerance is RADIANS (see meshing.ts MeshOptions): 0.3 rad ~ 17°.
    const meshed = this.shape.mesh({ tolerance: 0.05, angularTolerance: 0.3 });
    const positions = new Float32Array(meshed.vertices);
    const normalsSrc = meshed.normals ?? new Array(meshed.vertices.length).fill(0);
    return {
      positions,
      normals: new Float32Array(normalsSrc),
      indices: new Uint32Array(meshed.triangles),
    };
  }

  exportSTL(): Uint8Array {
    throw new Error(
      'OcctBackend.exportSTL is synchronous-incompatible — Replicad returns a Blob; use exportSTLAsync()',
    );
  }

  async exportSTLAsync(): Promise<Uint8Array> {
    return (await this.exportSTLWithReportAsync()).bytes;
  }

  /**
   * Export-grade STL with a watertight report. Meshes via the export
   * pipeline (relative-deflection whole-shape mesh, per-face absolute
   * fallback, position-key weld, crack stitch — see meshShapeForExport),
   * then runs the O(n) edge-adjacency verify on the exact mesh that is
   * encoded, so the report describes the bytes written.
   */
  async exportSTLWithReportAsync(): Promise<{
    bytes: Uint8Array;
    report: WatertightReport;
    triangleCount: number;
  }> {
    const mesh = meshShapeForExport(this.shape);
    const report = verifyWatertight(mesh);
    const buf = encodeBinaryStl({ vertices: mesh.vertices, triangles: mesh.triangles });
    return { bytes: Uint8Array.from(buf), report, triangleCount: mesh.triangles.length / 3 };
  }

  exportSTEP(): Uint8Array {
    throw new Error(
      'OcctBackend.exportSTEP is synchronous-incompatible — Replicad returns a Blob; use exportSTEPAsync()',
    );
  }

  async exportSTEPAsync(): Promise<Uint8Array> {
    const blob = this.shape.blobSTEP();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  /**
   * Slice A DXF entry path: extract a single planar outer wire (with optional
   * hole wires) from this shape, projected to the wire's plane and returned
   * as 2D vertex polylines. Returns `null` when the shape has no planar face
   * suitable for DXF export — non-planar 3D solids, multi-face mismatched-
   * plane shapes, sketches without a captured drawing, etc. The DXF dispatch
   * in `runAndExport` translates a `null` return into the
   * `export.dxf.non-planar` diagnostic.
   *
   * Slice A scope: returns `null` for every shape kind. The planar-face
   * boundary extraction (looping over `face.surfaceType() === 'plane'` and
   * lifting each face's outer / inner wires to `Vec2[]`) is shared with the
   * Slice E DFM consumer and lands when that consumer arrives. Until then,
   * the supported Slice A inputs are limited to `Region` direct-returns
   * from `Shape.flattenPattern()`.
   */
  tryExtractPlanarWires(): { outer: import('../../../shared/intent/region').Vec2[]; holes: import('../../../shared/intent/region').Vec2[][] } | null {
    return null;
  }

  /**
   * Enumerate all faces of this shape via TopExp_Explorer and return their
   * OCCT hash codes as hex strings. Stable within a single WASM session.
   *
   * Used by history-tracking machinery to establish face identity before and
   * after operations (transforms, booleans, edge features).
   */
  faceHashes(): string[] {
    const oc = getOC();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (this.shape as any).wrapped;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const explorer = new (oc as any).TopExp_Explorer_2(
      wrapped,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).TopAbs_ShapeEnum.TopAbs_FACE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    const hashes: string[] = [];
    try {
      while (explorer.More()) {
        const sub = explorer.Current();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hashes.push((sub as any).HashCode(2147483647).toString(16));
        explorer.Next();
      }
    } finally {
      explorer.delete();
    }
    return hashes;
  }

  /**
   * Enumerate all edges of this shape via TopExp_Explorer and return their
   * OCCT hash codes as hex strings. Stable within a single WASM session.
   */
  edgeHashes(): string[] {
    const oc = getOC();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (this.shape as any).wrapped;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const explorer = new (oc as any).TopExp_Explorer_2(
      wrapped,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).TopAbs_ShapeEnum.TopAbs_EDGE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    const hashes: string[] = [];
    try {
      while (explorer.More()) {
        const sub = explorer.Current();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hashes.push((sub as any).HashCode(2147483647).toString(16));
        explorer.Next();
      }
    } finally {
      explorer.delete();
    }
    return hashes;
  }

  /**
   * Find the canonical face by name on a primitive shape and return its
   * OCCT hash code as a hex string.
   *
   * Uses face centroid matching against the bounding box — the same heuristic
   * as `edgeSelection.ts:findCanonicalFace`. Only valid on box/cylinder/sphere
   * primitives (requires `kind` to be set).
   *
   * For boxes: all 6 cardinal directions (top/bottom/left/right/front/back).
   * For cylinders: top and bottom only.
   * For spheres: throws on any name (no canonical planar faces).
   *
   * @throws {Error} If called on a non-primitive shape (kind unset).
   * @throws {Error} If the face name is not applicable to this primitive.
   * @throws {Error} If no matching face is found within tolerance.
   */
  findCanonicalFaceHash(face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'): string {
    const TOL = 1e-4;
    if (!this.kind) {
      throw new Error('findCanonicalFaceHash: only valid on primitives (box/cylinder/sphere); kind is unset');
    }
    if (this.kind === 'sphere') {
      throw new Error('findCanonicalFaceHash: spheres have no canonical planar face names');
    }
    if (this.kind === 'cylinder' && face !== 'top' && face !== 'bottom') {
      throw new Error(`findCanonicalFaceHash: '${face}' is not applicable to cylinder (only top/bottom)`);
    }

    const bb = this.boundingBox();
    let axisIndex: 0 | 1 | 2;
    let value: number;
    switch (face) {
      case 'top':    axisIndex = 2; value = bb.max[2]; break;
      case 'bottom': axisIndex = 2; value = bb.min[2]; break;
      case 'right':  axisIndex = 0; value = bb.max[0]; break;
      case 'left':   axisIndex = 0; value = bb.min[0]; break;
      case 'back':   axisIndex = 1; value = bb.max[1]; break;
      case 'front':  axisIndex = 1; value = bb.min[1]; break;
    }

    // Walk faces via replicad's .faces accessor (they have .center with x/y/z),
    // find the matching face, then hash its underlying OCCT subshape.
    const oc = getOC();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (this.shape as any).wrapped;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const explorer = new (oc as any).TopExp_Explorer_2(
      wrapped,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).TopAbs_ShapeEnum.TopAbs_FACE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).TopAbs_ShapeEnum.TopAbs_SHAPE,
    );

    // Collect all faces with their hashes, then match against replicad face centroids
    const replicadFaces = this.shape.faces;  // replicad Face[] with .center
    const facesByIdx: string[] = [];
    try {
      while (explorer.More()) {
        const sub = explorer.Current();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        facesByIdx.push((sub as any).HashCode(2147483647).toString(16));
        explorer.Next();
      }
    } finally {
      explorer.delete();
    }

    // Match by centroid in the same order TopExp_Explorer visits them.
    // replicad's shape.faces and TopExp_Explorer traverse in the same order
    // for simple primitives, so index i in facesByIdx corresponds to replicadFaces[i].
    for (let i = 0; i < replicadFaces.length && i < facesByIdx.length; i++) {
      const c = replicadFaces[i].center;
      const cv = axisIndex === 0 ? c.x : axisIndex === 1 ? c.y : c.z;
      if (Math.abs(cv - value) < TOL) {
        return facesByIdx[i];
      }
    }

    throw new Error(
      `findCanonicalFaceHash: could not find canonical face '${face}' on ${this.kind} within tolerance ${TOL}`,
    );
  }

  dispose(): void {
    const maybeDelete = (this.shape as { delete?: () => void }).delete;
    if (typeof maybeDelete === 'function') {
      maybeDelete.call(this.shape);
    }
  }
}

/**
 * Scene-aware STEP export. Builds a `replicad.ShapeConfig[]` from the
 * `SceneBackend`'s parts (apply each part's `worldTransform` to a fresh
 * clone of its local-frame OCCT shape), then routes through replicad's
 * native `exportSTEP` so the resulting STEP file ships a separate named
 * body per part with its role color attached via XCAFDoc / STEP layers.
 *
 * Why a free function instead of a `Scene.exportSTEP()` method: the agent-
 * facing Scene surface stays lean (per the kernelCAD product strategy —
 * generic tools, not convenience methods). `runAndExport` calls this
 * directly when the script returns a Scene. Callers outside the runtime
 * (CLI, MCP, future Studio export panel) can import this free function.
 *
 * Lifecycle: clones every part shape before `applyTransform` because
 * replicad's translate/rotate mutate-and-destroy the source OCCT handle
 * (cf. commit 1d597dd). Color tokens (e.g. 'plate', 'gear') are resolved
 * to `#rrggbb` via the role palette before being passed to replicad.
 */
export async function exportSceneToSTEPAsync(
  sceneBackend: SceneBackend,
): Promise<Uint8Array> {
  // `sceneToWorldFrameParts` enforces the non-empty-scene invariant and
  // owns the clone-before-transform contract for every multi-body exporter.
  const worldParts = sceneToWorldFrameParts(sceneBackend);
  const shapeConfigs = worldParts.map((p) => {
    const config: {
      shape: ReplicadShape3D;
      name: string;
      color?: string;
    } = {
      shape: p.shape.getReplicadShape(),
      name: p.name,
    };
    const hex = resolveColor(p.color);
    if (hex !== undefined) config.color = hex;
    return config;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = replicad.exportSTEP(shapeConfigs as any);
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Build a PBR record from FeatureRecord.metadata. Priority:
 *   1. metadata.material (full PBR) — used directly.
 *   2. metadata.color (legacy flat color) — promoted to { baseColor }.
 *   3. neither — undefined; renderer falls back to DEFAULT_MESH_COLOR.
 */
export function pbrFromMetadata(metadata: Record<string, unknown> | undefined): PBRMaterial | undefined {
  if (!metadata) return undefined;
  if (metadata.material && typeof metadata.material === 'object') {
    return metadata.material as PBRMaterial;
  }
  if (typeof metadata.color === 'string') {
    return { baseColor: metadata.color };
  }
  return undefined;
}

/**
 * Ensure polygon points are in counter-clockwise winding order.
 * Uses the shoelace formula: positive signed area => CCW, negative => CW.
 * CW input is silently reversed.
 */
function ensureCCW(points: [number, number][]): [number, number][] {
  // Shoelace area: positive => CCW, negative => CW
  let area2 = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area2 += x1 * y2 - x2 * y1;
  }
  return area2 < 0 ? (points.slice().reverse() as [number, number][]) : points;
}
