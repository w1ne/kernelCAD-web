// src/capture/sketch.ts
import type { FeatureId, FeatureRef, Vec3, AxisSpec, Param } from '../../intent/types';
import { isValidAxisSpec } from '../../intent/types';
import type { CaptureSession } from '../../capture/captureSession';
import { validateFaceLabels } from './faceLabels';
import { Shape } from './proxy';
import { KernelError } from '../../intent/kernelError';
import type { FaceLabelsMap } from '../../intent/featureRecord';
import { type Editable } from '../../runtime/paramRef';
import { toParam } from '../../runtime/editableHelpers';

export type SketchCommand =
  | { kind: 'moveTo'; x: Param; y: Param }
  | { kind: 'lineTo'; x: Param; y: Param }
  | { kind: 'tangentArc'; x: Param; y: Param }
  | { kind: 'threePointsArc'; x: Param; y: Param; midX: Param; midY: Param }
  | { kind: 'sagittaArc'; x: Param; y: Param; sagitta: Param }
  | { kind: 'bulgeArc'; x: Param; y: Param; bulge: Param }
  | { kind: 'radiusArc'; x: Param; y: Param; radius: Param }
  | { kind: 'close' };

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
   * Revolve the sketch 360° around the Z axis. The path coordinates are
   * interpreted as `(radial-X, axial-Z)` — first coord = distance from axis,
   * second coord = height along axis. Profile must stay on x ≥ 0.
   *
   * Returns a `Shape` (3D solid). Validation (axis-cross, empty profile)
   * happens at lowering time and surfaces as `feature.revolve.*` diagnostics.
   */
  revolve(opts?: { faceLabels?: FaceLabelsMap }): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'revolve');
    return this.session.createShape({
      kind: 'revolve',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
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
   * Returns a `Shape` (3D solid). Validation (rail length, finite values)
   * happens at lowering time and surfaces as `feature.sweep.*` diagnostics.
   */
  sweep(rail: Vec3[], opts: { frenet?: boolean; faceLabels?: FaceLabelsMap } = {}): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'sweep');
    return this.session.createShape({
      kind: 'sweep',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        frenet: { expression: String(opts.frenet ?? false), unit: 'unitless', evaluated: opts.frenet ? 1 : 0 },
      },
      metadata: { rail, ...(faceLabels ? { faceLabels } : {}) },
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
