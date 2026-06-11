// src/modeling/capture/sketch.ts
import type { FeatureId, FeatureRef, Vec3, AxisSpec, Param } from '../../shared/intent/types';
import { isValidAxisSpec } from '../../shared/intent/types';
import type { CaptureSession } from './captureSession';
import { validateFaceLabels } from './faceLabels';
import { Shape } from './proxy';
import { KernelError } from '../../shared/intent/kernelError';
import type { FaceLabelsMap } from '../../shared/intent/featureRecord';
import { type Editable } from '../../shared/runtime/paramRef';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

/**
 * 2D-Hermite endpoint shape — analogue of the 3D `HermiteEndpoint` used by
 * Slice C's `hermiteG2`. All three fields are `[Editable<number>, Editable<number>]`
 * tuples so ParamRef-driven points / tangents / curvatures are supported.
 *
 * `point`     — endpoint in mm.
 * `tangent`   — first derivative of the curve at this endpoint (NOT the
 *               unit tangent: magnitude controls how aggressively the
 *               curve heads out of the endpoint; typical magnitude is in
 *               the order of the chord length between the two endpoints).
 * `curvature` — second derivative at this endpoint. Defaults to [0, 0],
 *               which makes the resulting curve G1-only (still degree 5).
 */
export interface HermiteEndpoint2D {
  point: [Editable<number>, Editable<number>];
  tangent: [Editable<number>, Editable<number>];
  curvature?: [Editable<number>, Editable<number>];
}

// Re-export so existing modeling/agent/authoring importers keep working.
// The canonical definition lives in shared/capture/sketchCommand.ts as a
// leaf module so the kernel can type-import it without depending on
// modeling/.
export type { SketchCommand };

/**
 * `Sketch` captures a closed 2D profile that can later be extruded.
 *
 * Constructed only via `path().moveTo(...).lineTo(...).close()`. The builder
 * pattern enforces the moveTo-first / close-before-extrude invariant at the
 * type level — `Sketch.extrude()` is the only method, and you can only get a
 * `Sketch` by closing a `PathBuilder`.
 */
/**
 * IMPORTANT — drift sentinel contract:
 * Adding a public method to `Sketch`, `PathBuilder`, or `Shape` requires
 * also updating `src/mcp/tools/listApi.ts` (in `SKETCH_METHODS`,
 * `PATH_BUILDER_METHODS`, or `SHAPE_METHODS` respectively). The drift
 * sentinel test at `tests/integration/mcp/listApi.driftSentinel.test.ts`
 * fails CI when `Object.getOwnPropertyNames(<Class>.prototype)` doesn't
 * match the advertised array. This guards agent discoverability — methods
 * not in `list_api` are invisible to MCP clients.
 */
export class Sketch {
  readonly id: FeatureId;
  private session: CaptureSession;

  constructor(id: FeatureId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  extrude(depth: number, opts?: { faceLabels?: FaceLabelsMap }): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
    return this.session.createShape({
      kind: 'extrude',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        depth: { expression: String(depth), unit: 'mm', evaluated: depth },
      },
      metadata: faceLabels ? { faceLabels } : undefined,
    });
  }

  /**
   * Revolve the sketch around the Z axis. The path coordinates are
   * interpreted as `(radial-X, axial-Z)` — first coord = distance from axis,
   * second coord = height along axis. Profile must stay on x ≥ 0.
   *
   * @param opts.angleDeg sweep angle in degrees (default 360). Use a partial
   *   revolve (e.g. 180) instead of revolving 360 and subtracting a half-space
   *   box — the kernel-native partial revolve produces cleaner topology and
   *   avoids the boolean-cut tessellation slivers that fail open3d's
   *   `is_watertight()` check on conical surfaces.
   *
   * Returns a `Shape` (3D solid). Validation (axis-cross, empty profile,
   * angle range) happens at lowering time and surfaces as `feature.revolve.*`
   * diagnostics.
   */
  revolve(opts?: { angleDeg?: number; faceLabels?: FaceLabelsMap }): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'revolve');
    const angleDeg = opts?.angleDeg ?? 360;
    return this.session.createShape({
      kind: 'revolve',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        angleDeg: { expression: String(angleDeg), unit: 'deg', evaluated: angleDeg },
      },
      metadata: faceLabels ? { faceLabels } : undefined,
    });
  }

  /**
   * Sweep this profile along a 3D polyline rail to produce a 3D solid.
   *
   * Path coordinates of the profile are interpreted in the XY plane (the
   * profile's local frame). Rail is a `[number, number, number][]` polyline
   * in world coordinates with ≥ 2 entries.
   *
   * Pick `opts.frenet`:
   * - `false` (default): profile keeps a fixed world-up vector — best for
   *   straight pipes, planar polyline rails, and L-bends.
   * - `true`: profile rotates with the rail's tangent + curvature — needed
   *   for helices, twisted rails, and any non-planar curve where you want
   *   the profile to track the rail (springs, threads).
   *
   * Pick `opts.transitionMode` (only relevant for rails with interior corners):
   * - `'right'` (default): sharp corner — the profile clips at the corner
   *   plane. Works for most pipe-like sweeps with mild bends.
   * - `'transformed'`: extends profile tangents past the corner. Use for
   *   slight kinks where `'right'` would visibly truncate the profile.
   * - `'round'`: inserts a tangent arc at the corner. Needed when the
   *   profile diameter exceeds the corner clearance — without this, OCCT
   *   rejects the sweep entirely. Costlier than the other modes.
   *
   * Pick `opts.spine`:
   * - `'polyline'` (default): the rail points become consecutive straight
   *   spine edges. Corners are real — use for pipe runs, L-bends, and any
   *   rail whose kinks are intentional (`transitionMode` controls how the
   *   corners are bridged).
   * - `'smooth'`: the rail points become a single smooth B-spline spine
   *   edge, and the profile is placed at the rail start orthogonal to the
   *   spine's start tangent. Use whenever the rail SAMPLES a smooth curve —
   *   `helix(...)` rails, threads, springs, organic paths. A polyline spine
   *   on a dense smooth rail makes the kernel emit per-segment tubes that do
   *   not sew, leaving open rings in the export mesh (`export.mesh.not-watertight`).
   *
   * Returns a `Shape` (3D solid). Validation (rail length, finite values,
   * transitionMode/spine strings) happens at lowering time and surfaces as
   * `feature.sweep.*` / `feature.invalid-args` diagnostics.
   */
  sweep(
    rail: Vec3[],
    opts: {
      frenet?: boolean;
      transitionMode?: 'right' | 'transformed' | 'round';
      spine?: 'polyline' | 'smooth';
      faceLabels?: FaceLabelsMap;
    } = {},
  ): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'sweep');
    const transitionMode = opts.transitionMode ?? 'right';
    const spine = opts.spine ?? 'polyline';
    return this.session.createShape({
      kind: 'sweep',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        frenet: { expression: String(opts.frenet ?? false), unit: 'unitless', evaluated: opts.frenet ? 1 : 0 },
      },
      metadata: {
        rail,
        transitionMode,
        spine,
        ...(faceLabels ? { faceLabels } : {}),
      },
    });
  }

  /**
   * Loft this profile through one or more additional profiles to produce a
   * 3D solid that smoothly interpolates between sections.
   *
   * Use cases: nozzles (round-to-square), wings/airfoils (varying-cross-section
   * ribs), fairings, transition pieces between mismatched flanges, gear teeth
   * varying along thickness.
   *
   * Section positioning:
   * - Default / `opts.spacing: number`: z-stack the sections axially. THIS
   *   profile sits at z=0; subsequent profiles at z=spacing, 2*spacing, etc.
   *   Default spacing is 10 mm.
   * - `opts.planes: PlaneSpec[]`: explicit per-section placement. Length must
   *   equal the total section count (1 + (Array.isArray(other) ? other.length : 1)).
   *   Takes precedence over `spacing` if both provided. The first PlaneSpec
   *   positions THIS sketch; remaining entries position `other` in order.
   *
   * Other options:
   * - `opts.ruled: true` produces sharp (faceted) transitions instead of
   *   smooth interpolation — use for polyhedral / faceted lofts.
   * - `opts.startPoint` / `opts.endPoint` optionally extend the loft past the
   *   first / last section to a single point (cone-like terminations).
   *
   * Returns a `Shape` (3D solid). Validation (section count, planes length)
   * happens at lowering and surfaces as `feature.loft.*` diagnostics.
   */
  loft(
    other: Sketch | Sketch[],
    opts: {
      spacing?: number;
      planes?: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>;
      ruled?: boolean;
      startPoint?: [number, number, number];
      endPoint?: [number, number, number];
      faceLabels?: FaceLabelsMap;
    } = {},
  ): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'loft');
    const others = Array.isArray(other) ? other : [other];
    const allSketches = [this, ...others];
    const inputs: Record<string, FeatureRef> = {};
    for (let i = 0; i < allSketches.length; i++) {
      inputs[`sketch_${i}`] = { kind: 'feature', id: allSketches[i].id };
    }
    return this.session.createShape({
      kind: 'loft',
      inputs,
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        spacing: { expression: String(opts.spacing ?? 10), unit: 'mm', evaluated: opts.spacing ?? 10 },
        ruled: { expression: String(opts.ruled ?? false), unit: 'unitless', evaluated: opts.ruled ? 1 : 0 },
        sectionCount: { expression: String(allSketches.length), unit: 'unitless', evaluated: allSketches.length },
      },
      metadata: {
        planes: opts.planes,
        startPoint: opts.startPoint,
        endPoint: opts.endPoint,
        ...(faceLabels ? { faceLabels } : {}),
      },
    });
  }

  /**
   * Reflect this sketch's path across an axis. Returns a new Sketch with
   * reflected coordinates; the source is unchanged.
   *
   * Each coordinate is transformed per the axis spec:
   * - `'x'`  — reflects across the x-axis: y' = -y
   * - `'y'`  — reflects across the y-axis: x' = -x
   * - `{ axis: 'x', offset }` — reflects across y = offset: y' = 2*offset - y
   * - `{ axis: 'y', offset }` — reflects across x = offset: x' = 2*offset - x
   *
   * Arc segments with a sign-encoded direction (sagittaArc, bulgeArc, radiusArc)
   * have their sign negated, because reflection inverts path winding.
   *
   * @param axis 'x' | 'y' (axis through origin) or { axis, offset } for a
   *             parallel axis at the given offset.
   *
   * @example
   *   path().moveTo(0,0).lineTo(10,5).close().reflect('x')
   *   // = path().moveTo(0,0).lineTo(10,-5).close()
   */
  reflect(axis: AxisSpec): Sketch {
    if (!isValidAxisSpec(axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `Sketch.reflect: axis must be 'x', 'y', or { axis, offset }; got ${JSON.stringify(axis)}.`,
        this.id,
        "Pass 'x', 'y', or { axis: 'x' | 'y', offset: <number> } to Sketch.reflect.",
      );
    }

    // Normalize -0 to 0 so reflected coordinates are well-formed.
    const norm = (n: number): number => n === 0 ? 0 : n;

    // Reflection collapses any symbolic ParamRef into its current numeric value:
    // the reflected coordinate depends on the axis offset and the source coord,
    // and there's no symbolic-arithmetic path that preserves both. The inputs
    // are read via `.evaluated` (concrete) and re-wrapped as numeric Params.
    const reflectXY = (x: Param, y: Param): [Param, Param] => {
      const xv = x.evaluated;
      const yv = y.evaluated;
      let nx: number;
      let ny: number;
      if (axis === 'x') {
        nx = norm(xv); ny = norm(-yv);
      } else if (axis === 'y') {
        nx = norm(-xv); ny = norm(yv);
      } else {
        const off = axis.offset ?? 0;
        if (axis.axis === 'x') {
          nx = norm(xv); ny = norm(2 * off - yv);
        } else { // axis.axis === 'y'
          nx = norm(2 * off - xv); ny = norm(yv);
        }
      }
      return [toParam(nx, 'mm'), toParam(ny, 'mm')];
    };

    const negateScalar = (p: Param): Param => toParam(-p.evaluated, p.unit);

    // Vector (direction-only) reflection. Same axis as the coordinate
    // reflection above but WITHOUT the offset shift — used for derivatives
    // (tangent, curvature) which carry no absolute-position component.
    const reflectVec = (vx: Param, vy: Param): [Param, Param] => {
      const xv = vx.evaluated;
      const yv = vy.evaluated;
      let nx: number;
      let ny: number;
      if (axis === 'x') {
        nx = norm(xv); ny = norm(-yv);
      } else if (axis === 'y') {
        nx = norm(-xv); ny = norm(yv);
      } else if (axis.axis === 'x') {
        nx = norm(xv); ny = norm(-yv);
      } else {
        nx = norm(-xv); ny = norm(yv);
      }
      return [toParam(nx, vx.unit), toParam(ny, vy.unit)];
    };

    // Arc sign-flip: reflection inverts winding. For arcs whose direction is
    // encoded as a sign on a scalar (sagitta, bulge, radius), negate the sign.
    // tangentArc has no explicit direction parameter — the tangent is inherited
    // from the prior segment, which will also be reflected, so no flip needed.
    // threePointsArc is fully determined by three reflected points — no flip needed.
    const record = this.session.getRecords().find(r => r.id === this.id);
    const commands: SketchCommand[] = (record?.metadata as { commands?: SketchCommand[] })?.commands ?? [];

    const newCommands: SketchCommand[] = commands.map(cmd => {
      switch (cmd.kind) {
        case 'moveTo': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y };
        }
        case 'lineTo': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y };
        }
        case 'tangentArc': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y };
        }
        case 'threePointsArc': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          const [midX, midY] = reflectXY(cmd.midX, cmd.midY);
          return { ...cmd, x, y, midX, midY };
        }
        case 'sagittaArc': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y, sagitta: negateScalar(cmd.sagitta) };
        }
        case 'bulgeArc': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y, bulge: negateScalar(cmd.bulge) };
        }
        case 'radiusArc': {
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y, radius: negateScalar(cmd.radius) };
        }
        case 'smoothSpline': {
          // smoothSpline inherits its start tangent from the prior segment
          // (which is also reflected here), so we only flip the endpoint.
          // The end tangent is auto-chosen by replicad; reflection of the
          // surrounding context picks the correct mirrored tangent.
          const [x, y] = reflectXY(cmd.x, cmd.y);
          return { ...cmd, x, y };
        }
        case 'spline': {
          // Reflect every waypoint; tension is a scalar magnitude (no flip).
          const newPoints = cmd.points.map(p => {
            const [x, y] = reflectXY(p.x, p.y);
            return { x, y };
          });
          return { ...cmd, points: newPoints };
        }
        case 'nurbsSegment': {
          // Reflect every control point; degree, weights, and knots are
          // invariant under coordinate reflection.
          const newControls = cmd.controlPoints.map(p => {
            const [x, y] = reflectXY(p.x, p.y);
            return { x, y };
          });
          return { ...cmd, controlPoints: newControls };
        }
        case 'hermiteG2_2d': {
          // Reflect endpoints with the affine offset; reflect tangents and
          // curvatures as pure direction vectors (no offset shift).
          const [ax, ay] = reflectXY(cmd.ax, cmd.ay);
          const [bx, by] = reflectXY(cmd.bx, cmd.by);
          const [atx, aty] = reflectVec(cmd.atx, cmd.aty);
          const [btx, bty] = reflectVec(cmd.btx, cmd.bty);
          const [acx, acy] = cmd.acx !== undefined && cmd.acy !== undefined
            ? reflectVec(cmd.acx, cmd.acy)
            : [undefined, undefined];
          const [bcx, bcy] = cmd.bcx !== undefined && cmd.bcy !== undefined
            ? reflectVec(cmd.bcx, cmd.bcy)
            : [undefined, undefined];
          return {
            ...cmd,
            ax, ay, bx, by,
            atx, aty, btx, bty,
            acx, acy, bcx, bcy,
          };
        }
        case 'close':
          return cmd;
        default: {
          // exhaustiveness guard
          const _exhaustive: never = cmd;
          return _exhaustive;
        }
      }
    });

    return this.session.createSketch({
      kind: 'sketch',
      inputs: { source: { kind: 'feature', id: this.id } },
      params: {},
      metadata: { commands: newCommands },
    });
  }
}

/**
 * Fluent builder for arbitrary 2D profiles. Always start with `path().moveTo(x,y)`.
 * Chain `.lineTo(x,y)` for line segments. End with `.close()` to get a `Sketch`.
 *
 * `arcTo` / `lineH` / `lineV` / `lineAngled` / `label` / `stroke` are deferred to
 * v0.4-rc.2+. Constraints (`fix`, `coincident`, `horizontal`, etc.) are v0.5+.
 */
/**
 * IMPORTANT — drift sentinel contract:
 * Adding a public method to `Sketch`, `PathBuilder`, or `Shape` requires
 * also updating `src/mcp/tools/listApi.ts` (in `SKETCH_METHODS`,
 * `PATH_BUILDER_METHODS`, or `SHAPE_METHODS` respectively). The drift
 * sentinel test at `tests/integration/mcp/listApi.driftSentinel.test.ts`
 * fails CI when `Object.getOwnPropertyNames(<Class>.prototype)` doesn't
 * match the advertised array. This guards agent discoverability — methods
 * not in `list_api` are invisible to MCP clients.
 */
export class PathBuilder {
  private session: CaptureSession;
  private commands: SketchCommand[] = [];

  constructor(session: CaptureSession) {
    this.session = session;
  }

  moveTo(x: Editable<number>, y: Editable<number>): PathBuilder {
    this.commands.push({ kind: 'moveTo', x: toParam(x, 'mm'), y: toParam(y, 'mm') });
    return this;
  }

  lineTo(x: Editable<number>, y: Editable<number>): PathBuilder {
    this.commands.push({ kind: 'lineTo', x: toParam(x, 'mm'), y: toParam(y, 'mm') });
    return this;
  }

  /**
   * Continue tangent from the previous segment to (x, y) along an arc.
   * The arc's tangent direction at the start equals the previous segment's
   * end tangent. Replicad's `tangentArcTo` underneath.
   *
   * Throws at lowering time (via `feature.sketch.failed` diagnostic) if
   * called as the first command — there's no prior tangent to consume.
   */
  tangentArc(x: Editable<number>, y: Editable<number>): PathBuilder {
    this.commands.push({ kind: 'tangentArc', x: toParam(x, 'mm'), y: toParam(y, 'mm') });
    return this;
  }

  /**
   * Arc through three points (start = current pen position, mid = via, end = (x, y)).
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this when you know an interior point on the curve (e.g. reverse-engineering
   * from a CAD reference) or when you need a major arc (>180°) — set the midpoint
   * on the far side of the chord. No sign convention; midpoint position fully
   * determines the arc.
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param midX midpoint X (any point the arc passes through, not on the chord)
   * @param midY midpoint Y
   */
  threePointsArc(x: Editable<number>, y: Editable<number>, midX: Editable<number>, midY: Editable<number>): PathBuilder {
    this.commands.push({
      kind: 'threePointsArc',
      x: toParam(x, 'mm'),
      y: toParam(y, 'mm'),
      midX: toParam(midX, 'mm'),
      midY: toParam(midY, 'mm'),
    });
    return this;
  }

  /**
   * Arc by chord + perpendicular bulge height (sagitta).
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this when you know how far the arc bulges from the chord. Replicad-native
   * (`sagittaArcTo`).
   *
   * Sign convention: positive sagitta → arc bulges LEFT of chord direction
   * (counterclockwise from start to end). Negative → bulges RIGHT (clockwise).
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param sagitta perpendicular bulge height (signed)
   */
  sagittaArc(x: Editable<number>, y: Editable<number>, sagitta: Editable<number>): PathBuilder {
    this.commands.push({
      kind: 'sagittaArc',
      x: toParam(x, 'mm'),
      y: toParam(y, 'mm'),
      sagitta: toParam(sagitta, 'mm'),
    });
    return this;
  }

  /**
   * Arc by chord + DXF bulge factor (bulge = tan(includedAngle / 4)).
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this when round-tripping DXF (DXF stores arcs as bulge factors).
   * Replicad-native (`bulgeArcTo`).
   *
   * Sign convention: positive bulge → counterclockwise (left of chord direction).
   * Negative → clockwise. Magnitude > 1 means included angle > 180°.
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param bulge DXF bulge factor (signed)
   */
  bulgeArc(x: Editable<number>, y: Editable<number>, bulge: Editable<number>): PathBuilder {
    this.commands.push({
      kind: 'bulgeArc',
      x: toParam(x, 'mm'),
      y: toParam(y, 'mm'),
      bulge: toParam(bulge, 'unitless'),
    });
    return this;
  }

  /**
   * Arc by chord + explicit radius. Always the MINOR arc (<180°). For a major
   * arc, use threePointsArc with the midpoint on the far side of the chord.
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this for parametric work where radius is the natural mental model.
   * Computed via signed sagitta and lowered through `sagittaArcTo`.
   *
   * Sign convention: positive radius → arc bulges LEFT of chord direction
   * (counterclockwise from start to end). Negative → bulges RIGHT.
   *
   * Validation (at lowering time):
   * - `|radius| >= chord/2` — else `feature.sketch.degenerate-arc` diagnostic
   * - `chord > 0` (start ≠ end) — else `feature.sketch.degenerate-arc`
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param radius arc radius (signed)
   */
  radiusArc(x: Editable<number>, y: Editable<number>, radius: Editable<number>): PathBuilder {
    this.commands.push({
      kind: 'radiusArc',
      x: toParam(x, 'mm'),
      y: toParam(y, 'mm'),
      radius: toParam(radius, 'mm'),
    });
    return this;
  }

  /**
   * C1-smooth spline segment from current pen position to (x, y). Replicad's
   * `smoothSplineTo` underneath. The start tangent is inherited from the
   * prior segment (smooth join); the end tangent is auto-chosen.
   *
   * Pick this for organic outlines (eyewear brow, ergonomic grips, sneaker
   * silhouettes) where chained sagittaArcs hit OCCT BlendChain solver
   * cliffs at sub-arc joins. Chain several `smoothSpline` calls to
   * interpolate through many points; each segment joins the previous one
   * smoothly.
   *
   * Throws at lowering time if called as the first command — no prior
   * tangent to inherit.
   *
   * @param x endpoint X
   * @param y endpoint Y
   */
  smoothSpline(x: Editable<number>, y: Editable<number>): PathBuilder {
    this.commands.push({ kind: 'smoothSpline', x: toParam(x, 'mm'), y: toParam(y, 'mm') });
    return this;
  }

  /**
   * Read the current pen position by walking back through commands to the
   * most recent endpoint. Returns the numeric (`evaluated`) (x, y) — used
   * for capture-time geometric validation (.spline / .nurbsSegment /
   * .hermiteG2 start-point checks). Returns `null` when no segment has
   * been emitted yet (only `close` or empty path).
   *
   * The pen-position rule mirrors how replicad's `BaseSketcher2d` derives
   * its pen pointer: the endpoint of the last drawing command (`moveTo`,
   * `lineTo`, any `*Arc`, `smoothSpline`, `spline`, `nurbsSegment`,
   * `hermiteG2_2d`) is the current pen.
   *
   * Hard-private (`#`) so the drift-sentinel does not see it as a public
   * PathBuilder method.
   */
  #currentPenPosition(): { x: number; y: number } | null {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      switch (cmd.kind) {
        case 'moveTo':
        case 'lineTo':
        case 'tangentArc':
        case 'threePointsArc':
        case 'sagittaArc':
        case 'bulgeArc':
        case 'radiusArc':
        case 'smoothSpline':
          return { x: cmd.x.evaluated, y: cmd.y.evaluated };
        case 'spline': {
          const last = cmd.points[cmd.points.length - 1];
          return { x: last.x.evaluated, y: last.y.evaluated };
        }
        case 'nurbsSegment': {
          const last = cmd.controlPoints[cmd.controlPoints.length - 1];
          return { x: last.x.evaluated, y: last.y.evaluated };
        }
        case 'hermiteG2_2d':
          return { x: cmd.bx.evaluated, y: cmd.by.evaluated };
        case 'close':
          // `close` is supposed to be terminal — keep scanning back for the
          // last drawing command (defensive; nothing should append after
          // close in practice).
          continue;
      }
    }
    return null;
  }

  /**
   * N-waypoint interpolation. The lowerer threads a NURBS-quality B-spline
   * approximation through every supplied waypoint, leaving the pen at the
   * last waypoint. `points[0]` MUST match the current pen position (i.e.
   * `path().moveTo(p0).spline([p0, p1, ..., pN])`).
   *
   * Pick this for organic outlines (eyewear brow, ergonomic grips,
   * sneaker silhouettes) when you have measured waypoints rather than a
   * closed-form NURBS control-net. Higher visual quality than chaining
   * `smoothSpline` because the underlying B-spline is degree-3 with
   * smoothing.
   *
   * Throws (capture-time) on:
   * - `points.length < 2` (degenerate);
   * - any non-finite coordinate;
   * - consecutive duplicate points (< 1e-9 mm apart);
   * - no current pen position (call `moveTo` before `spline`);
   * - `points[0]` not matching the current pen position within 1e-6 mm —
   *   a gap makes the path's edge chain disconnected, and OCCT wire
   *   assembly silently drops unreachable edges, so a revolve/extrude of
   *   the profile yields degenerate geometry (e.g. a flat disc) with no
   *   kernel error (issue #447).
   *
   * `opts.tension` is reserved for future Catmull-Rom-style stiffness
   * control; ignored in v1.
   *
   * `opts.startTangent` / `opts.endTangent` (V slice) constrain the
   * first-derivative direction at the first and last waypoint. Magnitude
   * is normalised internally — [1, 0] and [100, 0] produce identical
   * curves. When either tangent is present, the lowerer routes through a
   * tangent-constrained interpolator; without them, the existing fast
   * approximation path is used.
   *
   * @param points waypoints to interpolate, in order from current pen to
   *   the new endpoint
   * @param opts.tension reserved (Catmull-Rom stiffness; v2)
   * @param opts.startTangent 2D direction vector at points[0] (magnitude
   *   is normalised; only direction matters)
   * @param opts.endTangent 2D direction vector at points[N-1]
   */
  spline(
    points: Array<[Editable<number>, Editable<number>]>,
    opts?: {
      tension?: Editable<number>;
      startTangent?: [Editable<number>, Editable<number>];
      endTangent?: [Editable<number>, Editable<number>];
    },
  ): PathBuilder {
    if (!Array.isArray(points) || points.length < 2) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: need at least 2 waypoints; got ${points?.length ?? 0}.`,
        undefined,
        'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
      );
    }
    const paramPoints: Array<{ x: Param; y: Param }> = [];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (!Array.isArray(pt) || pt.length !== 2) {
        throw new KernelError(
          'feature.path.spline.degenerate-points',
          `path().spline: waypoint ${i} is not a [x, y] tuple.`,
          undefined,
          'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
        );
      }
      const x = toParam(pt[0], 'mm');
      const y = toParam(pt[1], 'mm');
      if (!Number.isFinite(x.evaluated) || !Number.isFinite(y.evaluated)) {
        throw new KernelError(
          'feature.path.spline.degenerate-points',
          `path().spline: waypoint ${i} has non-finite coord (x=${x.evaluated}, y=${y.evaluated}).`,
          undefined,
          'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
        );
      }
      paramPoints.push({ x, y });
    }
    // Reject consecutive duplicates (closer than 1e-9 mm).
    for (let i = 1; i < paramPoints.length; i++) {
      const dx = paramPoints[i].x.evaluated - paramPoints[i - 1].x.evaluated;
      const dy = paramPoints[i].y.evaluated - paramPoints[i - 1].y.evaluated;
      if (Math.hypot(dx, dy) < 1e-9) {
        throw new KernelError(
          'feature.path.spline.degenerate-points',
          `path().spline: waypoints ${i - 1} and ${i} are coincident (< 1e-9 mm apart).`,
          undefined,
          'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
        );
      }
    }
    // points[0] must match the current pen position within 1e-6 mm — same
    // contract (and tolerance) as nurbsSegment / hermiteG2. A gap leaves the
    // lowered edge chain disconnected; OCCT's wire builder silently drops
    // edges it cannot reach, so the spline (and everything after it) vanishes
    // from the profile and a revolve/extrude produces degenerate geometry
    // (e.g. a flat disc) while evaluation reports ok (issue #447).
    const pen = this.#currentPenPosition();
    if (pen === null) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: no current pen position — call moveTo(x, y) before spline.`,
        undefined,
        'path.spline.degenerate-points — start the path with moveTo(points[0][0], points[0][1]) so the spline has a start position to chain from.',
      );
    }
    const penDx = paramPoints[0].x.evaluated - pen.x;
    const penDy = paramPoints[0].y.evaluated - pen.y;
    if (Math.hypot(penDx, penDy) > 1e-6) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: points[0] = (${paramPoints[0].x.evaluated}, ${paramPoints[0].y.evaluated}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
        undefined,
        'path.spline.degenerate-points — the spline starts where the previous segment ended: make points[0] equal the current pen position, or add a lineTo(points[0][0], points[0][1]) before the spline.',
      );
    }
    // V slice — validate optional tangent constraints.
    const validateTangent = (
      label: 'startTangent' | 'endTangent',
      t: [Editable<number>, Editable<number>] | undefined,
    ): { x: Param; y: Param } | undefined => {
      if (t === undefined) return undefined;
      if (!Array.isArray(t) || t.length !== 2) {
        throw new KernelError(
          'feature.path.spline.tangent-zero-magnitude',
          `path().spline: ${label} must be a [x, y] tuple; got ${JSON.stringify(t)}.`,
          undefined,
          'Pass a non-zero 2D direction vector [x, y]. Magnitude is normalised; direction matters.',
        );
      }
      const x = toParam(t[0], 'mm');
      const y = toParam(t[1], 'mm');
      if (!Number.isFinite(x.evaluated) || !Number.isFinite(y.evaluated)) {
        throw new KernelError(
          'feature.path.spline.tangent-zero-magnitude',
          `path().spline: ${label} has non-finite coord (x=${x.evaluated}, y=${y.evaluated}).`,
          undefined,
          'Pass a finite non-zero 2D direction vector. Magnitude is normalised; direction matters.',
        );
      }
      const mag = Math.hypot(x.evaluated, y.evaluated);
      if (mag < 1e-9) {
        throw new KernelError(
          'feature.path.spline.tangent-zero-magnitude',
          `path().spline: ${label} has magnitude ${mag} (< 1e-9); got [${x.evaluated}, ${y.evaluated}].`,
          undefined,
          'Pass a non-zero 2D direction vector. Magnitude is normalised; direction matters.',
        );
      }
      return { x, y };
    };
    const startTangent = validateTangent('startTangent', opts?.startTangent);
    const endTangent = validateTangent('endTangent', opts?.endTangent);

    this.commands.push({
      kind: 'spline',
      points: paramPoints,
      tension: opts?.tension !== undefined ? toParam(opts.tension, 'unitless') : undefined,
      ...(startTangent !== undefined ? { startTangent } : {}),
      ...(endTangent !== undefined ? { endTangent } : {}),
    });
    return this;
  }

  /**
   * Explicit B-spline segment from `controlPoints[0]` to `controlPoints[N-1]`.
   * `controlPoints[0]` MUST match the current pen position within 1e-6 mm.
   *
   * Pick this when the control-net is the natural mental model (explicit
   * NURBS authoring, round-tripping from external CAD, programmatic
   * generation from a formula). For waypoint interpolation, use `.spline()`.
   *
   * Throws (capture-time) on:
   * - fewer than `degree + 1` control points;
   * - any non-finite control-point coord;
   * - `controlPoints[0]` not matching current pen position within 1e-6;
   * - `weights` length != controlPoints length;
   * - any weight ≤ 0 (zero collapses the basis; negative is undefined);
   * - `knots` length != controlPoints.length + degree + 1 (when provided).
   *
   * Knot vector defaults to a clamped uniform vector
   * (`[0,...,0, ..., 1,...,1]` with multiplicity `degree+1` at each end).
   *
   * @param controlPoints B-spline control polygon (≥ degree+1 points)
   * @param opts.degree spline degree (default 3); must satisfy
   *   `1 ≤ degree ≤ controlPoints.length - 1`
   * @param opts.weights rational-NURBS weights (one per control point)
   * @param opts.knots explicit knot vector (overrides clamped uniform default)
   */
  nurbsSegment(
    controlPoints: Array<[Editable<number>, Editable<number>]>,
    opts?: { degree?: number; weights?: number[]; knots?: number[] },
  ): PathBuilder {
    const degree = opts?.degree ?? 3;
    if (!Number.isInteger(degree) || degree < 1) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: degree must be an integer ≥ 1; got ${degree}.`,
        undefined,
        'path.nurbs-segment.degenerate-controls — degree must be an integer in [1, controlPoints.length - 1].',
      );
    }
    if (!Array.isArray(controlPoints) || controlPoints.length < degree + 1) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: need at least degree+1 = ${degree + 1} control points; got ${controlPoints?.length ?? 0}.`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    const paramControls: Array<{ x: Param; y: Param }> = [];
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      if (!Array.isArray(cp) || cp.length !== 2) {
        throw new KernelError(
          'feature.path.nurbs-segment.degenerate-controls',
          `path().nurbsSegment: control point ${i} is not a [x, y] tuple.`,
          undefined,
          'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
        );
      }
      const x = toParam(cp[0], 'mm');
      const y = toParam(cp[1], 'mm');
      if (!Number.isFinite(x.evaluated) || !Number.isFinite(y.evaluated)) {
        throw new KernelError(
          'feature.path.nurbs-segment.degenerate-controls',
          `path().nurbsSegment: control point ${i} has non-finite coord (x=${x.evaluated}, y=${y.evaluated}).`,
          undefined,
          'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
        );
      }
      paramControls.push({ x, y });
    }
    // First control point must match current pen position within 1e-6 mm.
    const pen = this.#currentPenPosition();
    if (pen === null) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: no current pen position — call moveTo(x, y) before nurbsSegment.`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    const dx0 = paramControls[0].x.evaluated - pen.x;
    const dy0 = paramControls[0].y.evaluated - pen.y;
    if (Math.hypot(dx0, dy0) > 1e-6) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: controlPoints[0] = (${paramControls[0].x.evaluated}, ${paramControls[0].y.evaluated}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    // Weights validation.
    let paramWeights: Param[] | undefined;
    if (opts?.weights !== undefined) {
      if (!Array.isArray(opts.weights) || opts.weights.length !== controlPoints.length) {
        throw new KernelError(
          'feature.path.nurbs-segment.degenerate-controls',
          `path().nurbsSegment: weights length (${opts.weights?.length ?? 0}) must equal controlPoints length (${controlPoints.length}).`,
          undefined,
          'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
        );
      }
      for (let i = 0; i < opts.weights.length; i++) {
        const w = opts.weights[i];
        if (!Number.isFinite(w) || w <= 0) {
          throw new KernelError(
            'feature.path.nurbs-segment.weights-non-positive',
            `path().nurbsSegment: weight[${i}] = ${w} must be a strictly positive finite number.`,
            undefined,
            'path.nurbs-segment.weights-non-positive — weights must be strictly positive (zero collapses the basis; negative is undefined for B-splines).',
          );
        }
      }
      paramWeights = opts.weights.map((w) => toParam(w, 'unitless'));
    }
    // Knots validation.
    let paramKnots: Param[] | undefined;
    if (opts?.knots !== undefined) {
      const expectedKnotLen = controlPoints.length + degree + 1;
      if (!Array.isArray(opts.knots) || opts.knots.length !== expectedKnotLen) {
        throw new KernelError(
          'feature.path.nurbs-segment.degenerate-controls',
          `path().nurbsSegment: knots length (${opts.knots?.length ?? 0}) must equal controlPoints.length + degree + 1 (${expectedKnotLen}).`,
          undefined,
          'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
        );
      }
      paramKnots = opts.knots.map((k) => toParam(k, 'unitless'));
    }
    this.commands.push({
      kind: 'nurbsSegment',
      controlPoints: paramControls,
      degree: toParam(degree, 'unitless'),
      weights: paramWeights,
      knots: paramKnots,
    });
    return this;
  }

  /**
   * 2D quintic-Hermite transition curve between two endpoints, each
   * carrying a prescribed point + first derivative (tangent) + optional
   * second derivative (curvature). The 2D analogue of Slice C's 3D
   * `hermiteG2`. `a.point` MUST match the current pen position within
   * 1e-6 mm; the pen ends at `b.point`.
   *
   * Pick this for G2-continuous blends between adjacent path runs
   * (eyewear bridge ↔ brow, sneaker midsole transitions, ergonomic grip
   * fillet transitions). The curvature term is optional — without it the
   * curve is degree-5 but only G1; with it the curve is G2-continuous
   * with any neighbour that shares the endpoint frame.
   *
   * Throws (capture-time) on:
   * - `a.point` not matching current pen position within 1e-6 mm
   *   (`feature.path.hermite-g2.start-mismatch`).
   * - Other invalid inputs (zero tangent, NaN/Infinity coords) surface at
   *   lowering time via `feature.hermite-g2.*` once the solver runs.
   *
   * @param a start endpoint (must match current pen position)
   * @param b end endpoint
   */
  hermiteG2(a: HermiteEndpoint2D, b: HermiteEndpoint2D): PathBuilder {
    const ax = toParam(a.point[0], 'mm');
    const ay = toParam(a.point[1], 'mm');
    const bx = toParam(b.point[0], 'mm');
    const by = toParam(b.point[1], 'mm');
    const atx = toParam(a.tangent[0], 'mm');
    const aty = toParam(a.tangent[1], 'mm');
    const btx = toParam(b.tangent[0], 'mm');
    const bty = toParam(b.tangent[1], 'mm');
    const acx = a.curvature !== undefined ? toParam(a.curvature[0], 'mm') : undefined;
    const acy = a.curvature !== undefined ? toParam(a.curvature[1], 'mm') : undefined;
    const bcx = b.curvature !== undefined ? toParam(b.curvature[0], 'mm') : undefined;
    const bcy = b.curvature !== undefined ? toParam(b.curvature[1], 'mm') : undefined;

    // Start-point validation: a.point must match the current pen position.
    const pen = this.#currentPenPosition();
    if (pen === null) {
      throw new KernelError(
        'feature.path.hermite-g2.start-mismatch',
        `path().hermiteG2: no current pen position — call moveTo(${ax.evaluated}, ${ay.evaluated}) before hermiteG2.`,
        undefined,
        "path.hermite-g2.start-mismatch — align `a.point` with the path's current position, or call moveTo first.",
      );
    }
    const dx0 = ax.evaluated - pen.x;
    const dy0 = ay.evaluated - pen.y;
    if (Math.hypot(dx0, dy0) > 1e-6) {
      throw new KernelError(
        'feature.path.hermite-g2.start-mismatch',
        `path().hermiteG2: a.point = (${ax.evaluated}, ${ay.evaluated}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
        undefined,
        "path.hermite-g2.start-mismatch — align `a.point` with the path's current position, or call moveTo first.",
      );
    }

    this.commands.push({
      kind: 'hermiteG2_2d',
      ax, ay, atx, aty, acx, acy,
      bx, by, btx, bty, bcx, bcy,
    });
    return this;
  }

  /**
   * Tag the most recent segment with a name. The label persists in the sketch's
   * metadata.commands and can be referenced later in .fillet/.chamfer/.shell:
   *
   *   path().moveTo(0,0).lineTo(10,5).label('rim').close().extrude(3).fillet(1, { face: 'rim' });
   *
   * Constraints:
   * - Must follow a segment (lineTo or any *Arc); throws if called as the first
   *   command, immediately after moveTo, or after close.
   * - Each label name must be unique within one sketch.
   * - Avoid using the canonical face names ('top', 'bottom', 'left', 'right',
   *   'front', 'back') as labels — those route through canonical face resolution
   *   instead of label lookup. Use any non-canonical name.
   *
   * @param name a label name unique within this path (and not a canonical face name)
   */
  label(name: string): PathBuilder {
    const last = this.commands[this.commands.length - 1];
    if (!last || last.kind === 'moveTo' || last.kind === 'close') {
      throw new KernelError(
        'feature.invalid-args',
        `label('${name}'): must follow a segment (lineTo or any arc), not moveTo / close / nothing.`,
        undefined,
        'Place .label(...) immediately after a lineTo or arc segment.',
      );
    }
    if (this.commands.some(c => c !== last && (c as { label?: string }).label === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `label('${name}'): name already used in this sketch — labels must be unique.`,
        undefined,
        'Pick a unique label name within this sketch.',
      );
    }
    (last as { label?: string }).label = name;
    return this;
  }

  /**
   * Author a closed circle at `(cx, cy)` of radius `r` as a polyline-
   * approximated profile. Returns the resulting `Sketch` directly — there
   * is no current pen position to reuse, and chaining further segments
   * onto a circle would be ambiguous.
   *
   * Implementation: emits `moveTo(cx + r, cy)` + N-1 `lineTo` segments
   * around the circle + `close`. N=48 by default (good for revolves,
   * extrusions, and silhouette work). Override `segments` for finer detail.
   *
   * Surfaced 2× across Exp-B (eyebolt) and others: agents had to emit
   * trig in TS to build polyline circles because chained `sagittaArc`
   * collapses to zero-area when closing the same chord, and there was
   * no first-class circle primitive at the path level.
   *
   * **Limitation:** `cx`, `cy`, `r` must be NUMERIC at capture time. The
   * circle math (cos/sin of segment angles) can't be deferred to runtime
   * if the inputs are ParamRefs. Param-driven circles can be authored via
   * a higher-level helper later if needed.
   */
  circle(cx: number, cy: number, r: number, segments: number = 48): Sketch {
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) {
      throw new KernelError(
        'feature.invalid-args',
        `path.circle(cx, cy, r): all of cx (${cx}), cy (${cy}), r (${r}) must be finite numbers.`,
        undefined,
        'Pass numeric literals for cx, cy, r. ParamRef-driven circles are not supported in this slice.',
      );
    }
    if (r <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `path.circle: radius must be > 0; got ${r}.`,
        undefined,
        'Pass a positive radius.',
      );
    }
    if (!Number.isInteger(segments) || segments < 3) {
      throw new KernelError(
        'feature.invalid-args',
        `path.circle: segments must be an integer >= 3; got ${segments}.`,
        undefined,
        'Pass a segment count >= 3. Defaults to 48; use higher for smoother revolves.',
      );
    }
    if (this.commands.length > 0) {
      throw new KernelError(
        'feature.invalid-args',
        'path.circle(): the path already has other commands. circle() must be the only operation on a fresh path.',
        undefined,
        'Call path().circle(cx, cy, r) without prior moveTo / lineTo / etc.',
      );
    }
    // Start at (cx + r, cy) and walk counterclockwise. Use lineTo for each
    // chord; the final close() closes the loop.
    this.commands.push({ kind: 'moveTo', x: toParam(cx + r, 'mm'), y: toParam(cy, 'mm') });
    for (let i = 1; i < segments; i++) {
      const theta = (2 * Math.PI * i) / segments;
      this.commands.push({
        kind: 'lineTo',
        x: toParam(cx + r * Math.cos(theta), 'mm'),
        y: toParam(cy + r * Math.sin(theta), 'mm'),
      });
    }
    this.commands.push({ kind: 'close' });
    return this.session.createSketch({
      kind: 'sketch',
      inputs: {},
      params: {},
      metadata: { commands: this.commands },
    });
  }

  /**
   * Close the path and register the sketch FeatureRecord. Returns a `Sketch`
   * proxy whose only method is `.extrude(depth)`.
   */
  close(): Sketch {
    this.commands.push({ kind: 'close' });
    return this.session.createSketch({
      kind: 'sketch',
      inputs: {},
      params: {},
      metadata: { commands: this.commands },
    });
  }
}

export function makePath(session: CaptureSession): PathBuilder {
  return new PathBuilder(session);
}
