import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';
import type { ShapeBackend, BackendTarget } from '../backend';
import type { Vec3 } from '../../intent/types';
import type { RuntimeMesh } from '../runtimeMesh';
import type { SketchCommand } from '../../capture/sketch';

type ReplicadEdge = replicad.Edge;
type ReplicadFace = replicad.Face;

let initialized = false;

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
  private _drawing: replicad.Drawing | null = null;
  private _commands: SketchCommand[] | null = null;

  constructor(shape: ReplicadShape3D, kind?: 'box' | 'cylinder' | 'sphere' | 'sketch') {
    this.shape = shape;
    this.kind = kind;
  }

  /**
   * Internal accessor for `edgeSelection.pickEdges` — returns the underlying replicad
   * shape so the helper can iterate `shape.faces` / `shape.edges`. Treat as
   * implementation detail; do not export from `index.ts`.
   */
  getReplicadShape(): ReplicadShape3D {
    return this.shape;
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

    // Build a 2D drawing using replicad's DrawingPen API — the same pattern
    // used by revolveRect. draw(start).lineTo(p1)...lineTo(pn-1).close()
    // returns a Drawing; sketchOnPlane('XY') promotes it to a Sketch; extrude
    // lifts it to a 3D solid.
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
   * Revolve an axis-aligned rectangular profile around the Z axis.
   * The rect is placed in the XZ plane with its corner at `(offsetX, 0)`,
   * extends `w` in radial X and `h` in axial Z. With `angleDeg = 360`, the
   * result is a washer: inner radius `offsetX`, outer radius `offsetX + w`,
   * height `h`.
   *
   * NOTE: `angleDeg` is currently informational — Replicad's `Sketch.revolve`
   * always sweeps a full turn. Partial revolutions are deferred to v0.2.
   */
  static revolveRect(
    w: number,
    h: number,
    offsetX: number,
    _angleDeg: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    const drawing = replicad
      .draw([offsetX, 0])
      .hLine(w)
      .vLine(h)
      .hLine(-w)
      .close();
    const sketch = drawing.sketchOnPlane('XZ');
    const single = sketch as unknown as {
      revolve: (axis?: [number, number, number]) => ReplicadShape3D;
    };
    return new OcctBackend(single.revolve([0, 0, 1]));
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
    let pen = replicad.draw([first.x, first.y]);
    let currentX = first.x;
    let currentY = first.y;
    for (let i = 1; i < closeIdx; i++) {
      const c = commands[i];
      if (c.kind === 'lineTo') {
        pen = pen.lineTo([c.x, c.y]) as typeof pen;
      } else if (c.kind === 'tangentArc') {
        pen = pen.tangentArcTo([c.x, c.y]) as typeof pen;
      } else if (c.kind === 'threePointsArc') {
        pen = pen.threePointsArcTo([c.x, c.y], [c.midX, c.midY]) as typeof pen;
      } else if (c.kind === 'sagittaArc') {
        pen = pen.sagittaArcTo([c.x, c.y], c.sagitta) as typeof pen;
      } else if (c.kind === 'bulgeArc') {
        pen = pen.bulgeArcTo([c.x, c.y], c.bulge) as typeof pen;
      } else if (c.kind === 'radiusArc') {
        const chord = Math.hypot(c.x - currentX, c.y - currentY);
        if (chord < 1e-9) {
          throw new Error(`radiusArc: degenerate chord (start ≈ end) at point (${c.x}, ${c.y})`);
        }
        if (Math.abs(c.radius) < chord / 2) {
          throw new Error(`radiusArc: radius (${c.radius}) too small for chord length ${chord.toFixed(3)} — needs |radius| >= chord/2`);
        }
        const halfChord = chord / 2;
        const sagittaMagnitude = Math.abs(c.radius) - Math.sqrt(c.radius * c.radius - halfChord * halfChord);
        const signedSagitta = Math.sign(c.radius) * sagittaMagnitude;
        pen = pen.sagittaArcTo([c.x, c.y], signedSagitta) as typeof pen;
      }
      // Update position after every non-close command (all have explicit x/y endpoint)
      if ('x' in c && 'y' in c) {
        currentX = c.x;
        currentY = c.y;
      }
    }
    const drawing = pen.close();
    const back = new OcctBackend(undefined as unknown as ReplicadShape3D, 'sketch');
    back._drawing = drawing;
    back._commands = commands;
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
    if (sketch.kind !== 'sketch' || !sketch._drawing) {
      throw new Error('OcctBackend.extrudeFromSketch: input is not a sketch.');
    }
    if (depth <= 0) {
      throw new Error(`OcctBackend.extrudeFromSketch: depth must be positive (got ${depth})`);
    }
    const lifted = sketch._drawing.sketchOnPlane('XY');
    const single = lifted as unknown as { extrude: (d: number) => ReplicadShape3D };
    return new OcctBackend(single.extrude(depth));
  }

  /**
   * Revolve a sketch-tagged OcctBackend 360° around the Z axis. The sketch's
   * 2D drawing is lifted onto the XZ plane (so the path's first coord is
   * radial-X, second coord is axial-Z) and revolved around `[0,0,1]`.
   *
   * The returned `OcctBackend` is a normal 3D solid with no `kind` tag.
   *
   * @throws {Error} If `sketch.kind !== 'sketch'` or `sketch._drawing` is null.
   * @throws {Error} If Replicad rejects the geometry (e.g. self-intersecting
   *   profile). Caller must catch and map to a diagnostic.
   */
  static revolveFromSketch(sketch: OcctBackend): OcctBackend {
    if (sketch.kind !== 'sketch' || !sketch._drawing) {
      throw new Error('OcctBackend.revolveFromSketch: input is not a sketch.');
    }
    const lifted = sketch._drawing.sketchOnPlane('XZ');
    const single = lifted as unknown as {
      revolve: (axis?: [number, number, number]) => ReplicadShape3D;
    };
    return new OcctBackend(single.revolve([0, 0, 1]));
  }

  /**
   * Lift a sketch-tagged backend's drawing onto a plane and return access to
   * its profile face. Centralizes the cast pattern + multi-face check used
   * by `sweepFromSketch`. The `SWEEP_MULTI_FACE_PROFILE:` prefix is matched
   * by the lowerer's diagnostic discriminator and surfaces as
   * `feature.sweep.multi-face-profile`.
   *
   * @throws {Error} If `sketch.kind !== 'sketch'` or `_drawing` is null.
   * @throws {Error} If the drawing produces multiple faces (Sketches plural).
   */
  private static liftSketchToFace(
    sketch: OcctBackend,
    plane: 'XY' | 'XZ' | 'YZ',
  ): { face: () => { outerWire: () => replicad.Wire } } {
    if (sketch.kind !== 'sketch' || !sketch._drawing) {
      throw new Error('OcctBackend.liftSketchToFace: input is not a sketch.');
    }
    const lifted = sketch._drawing.sketchOnPlane(plane);
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
   *
   * @throws {Error} If `sketch.kind !== 'sketch'` or `_drawing` is null.
   * @throws {Error} If `rail.length < 2`.
   * @throws {Error} If Replicad rejects the sweep (caller maps to diagnostic).
   */
  static sweepFromSketch(
    sketch: OcctBackend,
    rail: [number, number, number][],
    opts: { frenet?: boolean } = {},
  ): OcctBackend {
    // The kind/_drawing check is now inside liftSketchToFace; keep the
    // explicit message for the rail check (different concern).
    if (rail.length < 2) {
      throw new Error(`OcctBackend.sweepFromSketch: rail needs at least 2 points (got ${rail.length}).`);
    }
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
    const spineWire = replicad.assembleWire(edges);
    // Lift via the shared helper (handles sketch-kind check + multi-face guard).
    const { face } = OcctBackend.liftSketchToFace(sketch, 'XY');
    const profileWire = face().outerWire();
    // Sweep.
    const swept = replicad.genericSweep(profileWire, spineWire, { frenet: opts.frenet ?? false });
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
      if (s.kind !== 'sketch' || !s._drawing) {
        throw new Error(`OcctBackend.loftFromSketches: input ${i} is not a sketch.`);
      }
      const p = planes[i];
      lifted.push(s._drawing.sketchOnPlane(p.plane, p.origin as unknown as Parameters<typeof s._drawing.sketchOnPlane>[1]));
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

  translate(x: number, y: number, z: number): OcctBackend {
    return new OcctBackend(this.shape.translate(x, y, z) as ReplicadShape3D);
  }

  rotate(axis: Vec3, degrees: number, pivot: Vec3 = [0, 0, 0]): OcctBackend {
    return new OcctBackend(this.shape.rotate(degrees, pivot, axis) as ReplicadShape3D);
  }

  scale(s: number | Vec3): OcctBackend {
    // Replicad's Shape.scale is uniform; collapse Vec3 to its first component.
    const factor = typeof s === 'number' ? s : s[0];
    return new OcctBackend(this.shape.scale(factor) as ReplicadShape3D);
  }

  mirror(normal: Vec3): OcctBackend {
    return new OcctBackend(
      this.shape.mirror(normal as [number, number, number], [0, 0, 0]) as ReplicadShape3D,
    );
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
   *   the original exception is re-thrown so Task 3's lowerer can catch and
   *   emit a `feature.fillet.failed` diagnostic.
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
   *   the original exception is re-thrown so Task 3's lowerer can catch and
   *   emit a `feature.chamfer.failed` diagnostic.
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
      const ef = e.startPoint, el = e.endPoint;
      const eq = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
        Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
      for (const g of groups) {
        for (const ge of g.edges) {
          const gf = ge.startPoint, gl = ge.endPoint;
          if ((eq(ef, gf) && eq(el, gl)) || (eq(ef, gl) && eq(el, gf))) {
            return g.radius;
          }
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
      const ef = e.startPoint, el = e.endPoint;
      const eq = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
        Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
      for (const g of groups) {
        for (const ge of g.edges) {
          const gf = ge.startPoint, gl = ge.endPoint;
          if ((eq(ef, gf) && eq(el, gl)) || (eq(ef, gl) && eq(el, gf))) {
            return g.distance;
          }
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
   *   minimum thickness or geometry is degenerate). The lowerer (Task 3)
   *   catches and emits a `feature.shell.failed` diagnostic.
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

  boundingBox(): { min: Vec3; max: Vec3 } {
    const bb = this.shape.boundingBox;
    const [minP, maxP] = bb.bounds;
    // OCCT's Bnd_Box inflates bounds by a tolerance gap; remove it so that
    // exact-axis-aligned primitives report integral coordinates.
    const wrapped = (bb as unknown as { wrapped?: { GetGap?: () => number } }).wrapped;
    const gap =
      wrapped && typeof wrapped.GetGap === 'function' ? wrapped.GetGap() : 0;
    return {
      min: [minP[0] + gap, minP[1] + gap, minP[2] + gap] as Vec3,
      max: [maxP[0] - gap, maxP[1] - gap, maxP[2] - gap] as Vec3,
    };
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

  getMesh(): RuntimeMesh {
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
    const blob = this.shape.blobSTL();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
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

  dispose(): void {
    const maybeDelete = (this.shape as { delete?: () => void }).delete;
    if (typeof maybeDelete === 'function') {
      maybeDelete.call(this.shape);
    }
  }
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
