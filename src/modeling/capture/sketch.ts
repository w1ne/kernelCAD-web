// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketch.ts
import type { FeatureId, FeatureRef, Vec3, AxisSpec, Param } from '../../shared/intent/types';
import { isValidAxisSpec, isValidEditableNumber } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';
import type { CaptureSession } from './captureSession';
import { validateFaceLabels } from './faceLabels';
import { Shape } from './proxy';
import { KernelError } from '../../shared/intent/kernelError';
import { helix as sampleHelix, helixOptionsFromSpec, helixRailSpecOf, type HelixRailSpec } from '../helix';
import type { FaceLabelsMap } from '../../shared/intent/featureRecord';
import { type Editable, type ParamRefExpr } from '../../shared/runtime/paramRef';
import {
  currentValue,
  paramExpr,
  paramFromExpr,
  paramValue,
  toParam,
} from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import type { Curve3D } from './curveProxy';
import {
  TANGENT_SIDES,
  type TangentEntity2D,
  type TangentEntitySpec,
  type TangentNearSpec,
} from '../../shared/capture/tangency';

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

/**
 * Per-section placement for `Sketch.loft({ planes })`.
 *
 * `plane` / `origin` place the section's sketch plane; `rotationDeg` is an
 * in-plane rotation of this section about the loft's rotation center
 * (default `[0, 0]`, the sketch-local origin in this section's own plane;
 * override with `twistCenter`). When omitted, the section takes the
 * distributed `twistDeg` angle; when present it overrides that angle for
 * this section only.
 */
export interface LoftPlaneSpec {
  plane: 'XY' | 'YZ' | 'XZ';
  origin: [Editable<number>, Editable<number>, Editable<number>];
  rotationDeg?: Editable<number>;
}

/** Option keys `Sketch.loft` accepts. Anything else is a likely typo and is
 *  rejected with `feature.invalid-args` instead of being silently dropped. */
const ALLOWED_LOFT_KEYS = new Set([
  'spacing', 'planes', 'ruled', 'startPoint', 'endPoint', 'faceLabels',
  'rails', 'twistDeg', 'twistCenter',
]);

/** Keys a single `opts.planes[i]` entry accepts. */
const ALLOWED_LOFT_PLANE_KEYS = new Set(['plane', 'origin', 'rotationDeg']);

/** Option keys `Sketch.extrude` accepts. Anything else is a likely typo and is
 *  rejected with `feature.invalid-args` instead of being silently dropped. */
const ALLOWED_EXTRUDE_KEYS = new Set(['faceLabels', 'twistAngle']);

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

  /**
   * Extrude this closed profile along +Z by `depth` mm.
   *
   * @param depth extrusion distance in mm (number or ParamRef; a ParamRef is
   *   resolved at lower time).
   * @param opts.twistAngle total twist in degrees applied from bottom to top
   *   (number or ParamRef). The profile rotates about the sketch origin as it
   *   sweeps, so a profile that does not touch the origin changes its
   *   bounding box. Defaults to 0 (straight extrude). Not supported for
   *   face-bound sketches (throws at lowering time).
   *
   * Returns a `Shape` (3D solid).
   */
  extrude(
    depth: Editable<number>,
    opts?: { faceLabels?: FaceLabelsMap; twistAngle?: Editable<number> } | null,
  ): Shape {
    // Tolerate an explicit `null` opts: the pre-guard implementation read
    // `opts?.faceLabels`, so JS/agent callers could pass null. Keep that
    // contract rather than crashing on Object.keys(null).
    opts ??= {};
    for (const key of Object.keys(opts)) {
      if (!ALLOWED_EXTRUDE_KEYS.has(key)) {
        throw new KernelError(
          'feature.invalid-args',
          `Sketch.extrude: unknown option '${key}'.`,
          this.id,
          `extrude accepts ${[...ALLOWED_EXTRUDE_KEYS].join(', ')}.`,
        );
      }
    }
    if (opts.twistAngle !== undefined && !isValidEditableNumber(opts.twistAngle)) {
      throw new KernelError(
        'feature.invalid-args',
        `Sketch.extrude: opts.twistAngle must be a number or ParamRef; got ${JSON.stringify(opts.twistAngle)}.`,
        this.id,
        'Pass opts.twistAngle as a total twist in degrees — a number or a param() reference.',
      );
    }
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
    return this.session.createShape({
      kind: 'extrude',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        // A ParamRef depth stays symbolic and is resolved at lower time, the
        // same contract box/cylinder dimensions already have; a number is
        // captured exactly as before.
        // toParam keeps a ParamRef symbolic (resolved at lower time) and is
        // byte-identical to the old literal record for a plain number.
        depth: toParam(depth, 'mm'),
        twistAngle: toParam(opts.twistAngle ?? 0, 'deg'),
      },
      metadata: faceLabels ? { faceLabels } : undefined,
    });
  }

  /**
   * Revolve the sketch around the Z axis. The path coordinates are
   * interpreted as `(radial-X, axial-Z)` — first coord = distance from axis,
   * second coord = height along axis. Profile must stay on x ≥ 0.
   *
   * @param opts.angleDeg sweep angle in degrees (default 360; number or
   *   ParamRef). Use a partial
   *   revolve (e.g. 180) instead of revolving 360 and subtracting a half-space
   *   box — the kernel-native partial revolve produces cleaner topology and
   *   avoids the boolean-cut tessellation slivers that fail open3d's
   *   `is_watertight()` check on conical surfaces.
   *
   * Returns a `Shape` (3D solid). Validation (axis-cross, empty profile,
   * angle range) happens at lowering time and surfaces as `feature.revolve.*`
   * diagnostics.
   */
  revolve(opts?: { angleDeg?: Editable<number>; faceLabels?: FaceLabelsMap }): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'revolve');
    const angleDeg = opts?.angleDeg ?? 360;
    return this.session.createShape({
      kind: 'revolve',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        // A ParamRef angle stays symbolic; the lowerer range-checks the
        // resolved value.
        angleDeg: toParam(angleDeg, 'deg'),
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
   * - `'helix'`: for rails returned by `helix(...)` — threads, worms, helical
   *   grooves. The lowerer builds the EXACT helix (not a fit through the
   *   samples) and moves the profile by pure screw motion. The profile is
   *   placed in the AXIAL plane through the rail start: profile x = radial
   *   offset from the helix point (positive = away from the axis), profile
   *   y = offset along the helix axis. A 60° V thread profile sweeps to a
   *   valid solid. The profile's axial extent must stay below the pitch
   *   (adjacent turns may not overlap) and it may not cross the axis;
   *   `frenet` and `transitionMode` have no effect.
   *
   * A rail from `helix(...)` remembers its (possibly ParamRef) dimensions, so a
   * sweep along it is regenerated from the live param values at lower time
   * with every spine mode.
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
      spine?: 'polyline' | 'smooth' | 'helix';
      faceLabels?: FaceLabelsMap;
    } = {},
  ): Shape {
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'sweep');
    const transitionMode = opts.transitionMode ?? 'right';
    const spine = opts.spine ?? 'polyline';
    const helixSpec = this.#unmodifiedHelixSpec(rail);
    if (spine === 'helix' && helixSpec === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        "Sketch.sweep: spine 'helix' needs the unmodified array returned by helix(...); this rail was not produced by helix() or was changed after it.",
        this.id,
        "Pass helix({ radius, pitch, turns }) straight to sweep(rail, { spine: 'helix' }). For an arbitrary curved rail use spine: 'smooth'.",
      );
    }
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
        ...(helixSpec ? { helix: helixSpec } : {}),
        ...(faceLabels ? { faceLabels } : {}),
      },
    });
  }

  /**
   * The symbolic spec of a rail produced by `helix()`, but only while the
   * array still holds exactly the points helix() sampled (an edited rail is
   * just points). Hard-private so the drift sentinel ignores it.
   */
  #unmodifiedHelixSpec(rail: Vec3[]): HelixRailSpec | undefined {
    const spec = helixRailSpecOf(rail);
    if (spec === undefined) return undefined;
    const table = this.session.paramTable;
    const now = (p: Param) => paramValue(p, table);
    const expected = sampleHelix(
      helixOptionsFromSpec({
        ...spec,
        radius: { ...spec.radius, evaluated: now(spec.radius) },
        pitch: { ...spec.pitch, evaluated: now(spec.pitch) },
        turns: { ...spec.turns, evaluated: now(spec.turns) },
        startAngle: { ...spec.startAngle, evaluated: now(spec.startAngle) },
      }),
    );
    if (expected.length !== rail.length) return undefined;
    for (let i = 0; i < rail.length; i++) {
      const p = rail[i];
      const q = expected[i];
      if (!Array.isArray(p) || Math.abs(p[0] - q[0]) > 1e-9 || Math.abs(p[1] - q[1]) > 1e-9 || Math.abs(p[2] - q[2]) > 1e-9) {
        return undefined;
      }
    }
    return spec;
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
   * - `opts.twistDeg` total twist in degrees distributed evenly across the
   *   sections (e.g. turbine blades, drill flutes). Number or ParamRef;
   *   stored as a `'deg'` param.
   * - `opts.twistCenter` section-space `[x, y]` center that `twistDeg` and
   *   per-plane `rotationDeg` rotate about. Defaults to `[0, 0]` — the
   *   sketch-local origin in each section's own plane, NOT the 3D plane
   *   `origin`; pass `twistCenter` to override that center.
   * - `opts.planes[].rotationDeg` per-section in-plane rotation in degrees
   *   (number or ParamRef) about the rotation center. It OVERRIDES the
   *   distributed `twistDeg` for that section only:
   *   `rotationDeg ?? twistDeg * i / (N - 1)`.
   * - `opts.startPoint` / `opts.endPoint` optionally extend the loft past the
   *   first / last section to a single point (cone-like terminations).
   * - `opts.rails: Curve3D[]` constrains the loft to follow guide curves.
   *   First rail is the spine; a second rail is the auxiliary spine
   *   (`BRepOffsetAPI_MakePipeShell.SetMode_5`). More than two rails, or a
   *   rail that misses a section, emit `feature.loft.rail-miss`.
   *
   * Returns a `Shape` (3D solid). Validation (section count, planes length)
   * happens at lowering and surfaces as `feature.loft.*` diagnostics.
   */
  loft(
    other: Sketch | Sketch[],
    opts?: {
      spacing?: Editable<number>;
      planes?: LoftPlaneSpec[];
      twistDeg?: Editable<number>;
      twistCenter?: [Editable<number>, Editable<number>];
      ruled?: boolean;
      startPoint?: [Editable<number>, Editable<number>, Editable<number>];
      endPoint?: [Editable<number>, Editable<number>, Editable<number>];
      faceLabels?: FaceLabelsMap;
      rails?: Curve3D[];
    } | null,
  ): Shape {
    // Tolerate an explicit `null` opts: the pre-guard implementation read
    // `opts?.` fields, so JS/agent callers could pass null. Keep that
    // contract rather than crashing on Object.keys(null).
    opts ??= {};
    for (const key of Object.keys(opts)) {
      if (!ALLOWED_LOFT_KEYS.has(key)) {
        throw new KernelError(
          'feature.invalid-args',
          `Sketch.loft: unknown option '${key}'.`,
          this.id,
          `loft accepts ${[...ALLOWED_LOFT_KEYS].join(', ')}.`,
        );
      }
    }
    if (
      opts.twistCenter !== undefined &&
      (!Array.isArray(opts.twistCenter) ||
        opts.twistCenter.length !== 2 ||
        !opts.twistCenter.every(isValidEditableNumber))
    ) {
      throw new KernelError(
        'feature.invalid-args',
        `Sketch.loft: opts.twistCenter must be a [x, y] pair of numbers or ParamRefs; got ${JSON.stringify(opts.twistCenter)}.`,
        this.id,
        'Pass opts.twistCenter as [x, y] — the section-space center for twistDeg and planes[].rotationDeg.',
      );
    }
    if (opts.twistDeg !== undefined && !isValidEditableNumber(opts.twistDeg)) {
      throw new KernelError(
        'feature.invalid-args',
        `Sketch.loft: opts.twistDeg must be a number or ParamRef; got ${JSON.stringify(opts.twistDeg)}.`,
        this.id,
        'Pass opts.twistDeg as a total twist in degrees — a number or a param() reference.',
      );
    }
    if (opts.planes !== undefined) {
      if (!Array.isArray(opts.planes)) {
        throw new KernelError(
          'feature.invalid-args',
          `Sketch.loft: opts.planes must be an array of { plane, origin, rotationDeg? }; got ${typeof opts.planes}.`,
          this.id,
          'Pass opts.planes as one entry per loft section.',
        );
      }
      for (let i = 0; i < opts.planes.length; i++) {
        const p = opts.planes[i] as LoftPlaneSpec | null | undefined;
        if (p === null || typeof p !== 'object' || Array.isArray(p)) {
          throw new KernelError(
            'feature.invalid-args',
            `Sketch.loft: opts.planes[${i}] must be an object like { plane, origin, rotationDeg? }; got ${JSON.stringify(p)}.`,
            this.id,
            `Pass opts.planes[${i}] as { plane, origin, rotationDeg? }.`,
          );
        }
        for (const key of Object.keys(p)) {
          if (!ALLOWED_LOFT_PLANE_KEYS.has(key)) {
            throw new KernelError(
              'feature.invalid-args',
              `Sketch.loft: unknown planes[${i}] option '${key}'.`,
              this.id,
              `planes entries accept ${[...ALLOWED_LOFT_PLANE_KEYS].join(', ')}.`,
            );
          }
        }
        if (p.rotationDeg !== undefined && !isValidEditableNumber(p.rotationDeg)) {
          throw new KernelError(
            'feature.invalid-args',
            `Sketch.loft: opts.planes[${i}].rotationDeg must be a number or ParamRef; got ${JSON.stringify(p.rotationDeg)}.`,
            this.id,
            `Pass planes[${i}].rotationDeg as degrees — a number or a param() reference — or omit it to inherit the distributed twistDeg.`,
          );
        }
      }
    }
    const faceLabels = validateFaceLabels(opts?.faceLabels, 'loft');
    const others = Array.isArray(other) ? other : [other];
    const allSketches = [this, ...others];
    const inputs: Record<string, FeatureRef> = {};
    for (let i = 0; i < allSketches.length; i++) {
      inputs[`sketch_${i}`] = { kind: 'feature', id: allSketches[i].id };
    }
    const rails = opts.rails ?? [];
    if (!Array.isArray(rails)) {
      throw new KernelError(
        'feature.invalid-args',
        `loft: opts.rails must be an array of Curve3D; got ${typeof rails}.`,
        this.id,
        'invalid-args.loft.rails — pass Curve3D values from nurbsCurve / spline3d / curveBridge.',
      );
    }
    for (let i = 0; i < rails.length; i++) {
      const rail = rails[i];
      if (!rail || typeof rail !== 'object' || !('id' in rail) || !('pointAt' in rail)) {
        throw new KernelError(
          'feature.invalid-args',
          `loft: opts.rails[${i}] is not a Curve3D.`,
          this.id,
          'invalid-args.loft.rails — each rail must be a Curve3D.',
        );
      }
      inputs[`rail_${i}`] = { kind: 'feature', id: rail.id };
    }
    return this.session.createShape({
      kind: 'loft',
      inputs,
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        spacing: toParam(opts.spacing ?? 10, 'mm'),
        twistDeg: toParam(opts.twistDeg ?? 0, 'deg'),
        ruled: { expression: String(opts.ruled ?? false), unit: 'unitless', evaluated: opts.ruled ? 1 : 0 },
        sectionCount: { expression: String(allSketches.length), unit: 'unitless', evaluated: allSketches.length },
        railCount: { expression: String(rails.length), unit: 'unitless', evaluated: rails.length },
      },
      metadata: {
        // Numeric coordinates are stored as plain numbers (unchanged records);
        // a ParamRef coordinate is boxed as a Param so the dispatcher's
        // pre-resolve substitutes it at lower time.
        planes: opts.planes?.map((p) => ({
          plane: p.plane,
          origin: editablePoint3(p.origin),
          ...(p.rotationDeg === undefined ? {} : { rotationDeg: toParam(p.rotationDeg, 'deg') }),
        })),
        startPoint: opts.startPoint === undefined ? undefined : editablePoint3(opts.startPoint),
        endPoint: opts.endPoint === undefined ? undefined : editablePoint3(opts.endPoint),
        twistCenter: opts.twistCenter?.map((v) => (typeof v === 'number' ? v : toParam(v, 'mm'))),
        rails: rails.map((c) => c.id),
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

    // Reflection is affine, so it stays SYMBOLIC: a ParamRef coordinate
    // reflects to a ParamRef expression (`-y`, `2·offset − y`) that the
    // dispatcher re-evaluates at lower time, and a ParamRef offset is carried
    // the same way. Plain numbers fold back to plain numbers, so a numeric
    // sketch reflects to exactly the record it always did.
    const offsetExpr: ParamRefExpr | undefined =
      typeof axis === 'object' ? paramExpr(toParam(axis.offset ?? 0, 'mm')) : undefined;
    const mirrorExpr = (e: ParamRefExpr): ParamRefExpr =>
      offsetExpr === undefined
        ? { kind: 'neg', expr: e }
        : {
            kind: 'binop',
            op: '-',
            left: { kind: 'binop', op: '*', left: { kind: 'lit', value: 2 }, right: offsetExpr },
            right: e,
          };
    const axisLetter = typeof axis === 'object' ? axis.axis : axis;

    const reflectXY = (x: Param, y: Param): [Param, Param] => {
      if (axisLetter === 'x') {
        return [paramFromExpr(paramExpr(x), x.unit), paramFromExpr(mirrorExpr(paramExpr(y)), y.unit)];
      }
      return [paramFromExpr(mirrorExpr(paramExpr(x)), x.unit), paramFromExpr(paramExpr(y), y.unit)];
    };

    const negateScalar = (p: Param): Param =>
      paramFromExpr({ kind: 'neg', expr: paramExpr(p) }, p.unit);

    // Vector (direction-only) reflection. Same axis as the coordinate
    // reflection above but WITHOUT the offset shift — used for derivatives
    // (tangent, curvature) which carry no absolute-position component.
    const reflectVec = (vx: Param, vy: Param): [Param, Param] => {
      if (axisLetter === 'x') {
        return [paramFromExpr(paramExpr(vx), vx.unit), negateScalar(vy)];
      }
      return [negateScalar(vx), paramFromExpr(paramExpr(vy), vy.unit)];
    };

    // Arc sign-flip: reflection inverts winding. For arcs whose direction is
    // encoded as a sign on a scalar (sagitta, bulge, radius), negate the sign.
    // tangentArc has no explicit direction parameter — the tangent is inherited
    // from the prior segment, which will also be reflected, so no flip needed.
    // threePointsArc is fully determined by three reflected points — no flip needed.
    // Tangency entities reflect like any other geometry, with one twist: a
    // mirror reverses handedness, so a solution that was on the RIGHT of a
    // directed line is on the LEFT of the mirrored line. `side: 'outside'`
    // is defined relative to that direction, so reflecting the endpoints AND
    // swapping from/to restores the original left/right relationship and
    // keeps the qualifier meaning what the author wrote. Circle qualifiers
    // (inside/outside the circle) are mirror-invariant and need no fix-up.
    const reflectEntity = (e: TangentEntitySpec): TangentEntitySpec => {
      if (e.kind === 'line') {
        const [x1, y1] = reflectXY(e.x1, e.y1);
        const [x2, y2] = reflectXY(e.x2, e.y2);
        return { ...e, x1: x2, y1: y2, x2: x1, y2: y1 };
      }
      const [cx, cy] = reflectXY(e.cx, e.cy);
      return { ...e, cx, cy };
    };
    const reflectNear = (n: TangentNearSpec | undefined): TangentNearSpec | undefined => {
      if (!n) return undefined;
      const [x, y] = reflectXY(n.x, n.y);
      return { x, y };
    };

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
        case 'tangentCircle':
          return { ...cmd, entities: cmd.entities.map(reflectEntity), near: reflectNear(cmd.near) };
        case 'tangentLine':
          return { ...cmd, a: reflectEntity(cmd.a), b: reflectEntity(cmd.b), near: reflectNear(cmd.near) };
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

  /**
   * Capture-time numeric view of a captured Param. A symbolic Param's
   * `evaluated` is a placeholder (0) until lower time, so every capture-time
   * check (pen position, coincidence, magnitude, sign) reads the CURRENT value
   * through the session's param table instead. Hard-private so the drift
   * sentinel does not see it as a public PathBuilder method.
   */
  #now(p: Param): number {
    return paramValue(p, this.session.paramTable);
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
   * most recent endpoint. Returns the CURRENT numeric (x, y) — used
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
          return { x: this.#now(cmd.x), y: this.#now(cmd.y) };
        case 'spline': {
          const last = cmd.points[cmd.points.length - 1];
          return { x: this.#now(last.x), y: this.#now(last.y) };
        }
        case 'nurbsSegment': {
          const last = cmd.controlPoints[cmd.controlPoints.length - 1];
          return { x: this.#now(last.x), y: this.#now(last.y) };
        }
        case 'hermiteG2_2d':
          return { x: this.#now(cmd.bx), y: this.#now(cmd.by) };
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
      if (!Number.isFinite(this.#now(x)) || !Number.isFinite(this.#now(y))) {
        throw new KernelError(
          'feature.path.spline.degenerate-points',
          `path().spline: waypoint ${i} has non-finite coord (x=${this.#now(x)}, y=${this.#now(y)}).`,
          undefined,
          'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
        );
      }
      paramPoints.push({ x, y });
    }
    // Reject consecutive duplicates (closer than 1e-9 mm).
    for (let i = 1; i < paramPoints.length; i++) {
      const dx = this.#now(paramPoints[i].x) - this.#now(paramPoints[i - 1].x);
      const dy = this.#now(paramPoints[i].y) - this.#now(paramPoints[i - 1].y);
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
    const penDx = this.#now(paramPoints[0].x) - pen.x;
    const penDy = this.#now(paramPoints[0].y) - pen.y;
    if (Math.hypot(penDx, penDy) > 1e-6) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: points[0] = (${this.#now(paramPoints[0].x)}, ${this.#now(paramPoints[0].y)}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
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
      const xv = this.#now(x);
      const yv = this.#now(y);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
        throw new KernelError(
          'feature.path.spline.tangent-zero-magnitude',
          `path().spline: ${label} has non-finite coord (x=${xv}, y=${yv}).`,
          undefined,
          'Pass a finite non-zero 2D direction vector. Magnitude is normalised; direction matters.',
        );
      }
      const mag = Math.hypot(xv, yv);
      if (mag < 1e-9) {
        throw new KernelError(
          'feature.path.spline.tangent-zero-magnitude',
          `path().spline: ${label} has magnitude ${mag} (< 1e-9); got [${xv}, ${yv}].`,
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
      if (!Number.isFinite(this.#now(x)) || !Number.isFinite(this.#now(y))) {
        throw new KernelError(
          'feature.path.nurbs-segment.degenerate-controls',
          `path().nurbsSegment: control point ${i} has non-finite coord (x=${this.#now(x)}, y=${this.#now(y)}).`,
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
    const dx0 = this.#now(paramControls[0].x) - pen.x;
    const dy0 = this.#now(paramControls[0].y) - pen.y;
    if (Math.hypot(dx0, dy0) > 1e-6) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: controlPoints[0] = (${this.#now(paramControls[0].x)}, ${this.#now(paramControls[0].y)}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
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
        `path().hermiteG2: no current pen position — call moveTo(${this.#now(ax)}, ${this.#now(ay)}) before hermiteG2.`,
        undefined,
        "path.hermite-g2.start-mismatch — align `a.point` with the path's current position, or call moveTo first.",
      );
    }
    const dx0 = this.#now(ax) - pen.x;
    const dy0 = this.#now(ay) - pen.y;
    if (Math.hypot(dx0, dy0) > 1e-6) {
      throw new KernelError(
        'feature.path.hermite-g2.start-mismatch',
        `path().hermiteG2: a.point = (${this.#now(ax)}, ${this.#now(ay)}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
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
   * Closed circle tangent to other 2D geometry, solved by OCCT's
   * `Geom2dGcc_*` constructors. The classic sketch move: a fillet arc tangent
   * to two lines, a circle nestled against three others.
   *
   * Two forms, chosen by how many entities you pass:
   * - **2 entities + `opts.radius`** — `Geom2dGcc_Circ2d2TanRad`. The
   *   sketch-fillet construction.
   * - **3 entities, no `radius`** — `Geom2dGcc_Circ2d3Tan`. The radius falls
   *   out of the three tangency conditions.
   *
   * Entities are lines (infinite, through `from`->`to`) and circles. Points
   * are NOT accepted: OCCT's point overloads need `Handle_Geom2d_Point`,
   * which the bundled wasm does not bind (see shared/capture/tangency.ts).
   *
   * **Which solution you get.** These constructions have several answers — a
   * circle of radius r tangent to two perpendicular lines has four, one per
   * quadrant. The `side` qualifier on each entity is the primary control and
   * usually enough (`outside`/`outside` on two perpendicular lines yields
   * exactly one). If more than one survives, pass `opts.near` and the
   * solution whose CENTRE is closest to it wins. If several still survive,
   * this FAILS at lowering time with `sketch.tangency.ambiguous` listing every
   * candidate — it will not pick one for you.
   *
   * **When no such circle exists** (radius too small to bridge two parallel
   * lines, contradictory qualifiers) lowering fails with
   * `sketch.tangency.no-solution` naming the geometric reason. No approximate
   * arc is substituted.
   *
   * Terminal, like `circle()`: it expands to a whole closed loop, so it must
   * be the only operation on a fresh path and returns a `Sketch` directly.
   * The loop is two exact semicircular arcs, not a polyline.
   *
   * @example
   *   // Radius-5 fillet circle tucked into the corner of the +X/+Y axes.
   *   path().tangentCircle(
   *     [{ kind: 'line', from: [0, 0], to: [1, 0], side: 'enclosed' },
   *      { kind: 'line', from: [0, 0], to: [0, 1], side: 'outside' }],
   *     { radius: 5 },
   *   )
   */
  tangentCircle(
    entities: TangentEntity2D[],
    opts?: { radius?: Editable<number>; near?: [Editable<number>, Editable<number>] },
  ): Sketch {
    if (this.commands.length > 0) {
      throw new KernelError(
        'feature.invalid-args',
        'path.tangentCircle(): the path already has other commands. tangentCircle() must be the only operation on a fresh path.',
        undefined,
        'Call path().tangentCircle([...]) without prior moveTo / lineTo / etc.',
      );
    }
    if (!Array.isArray(entities) || (entities.length !== 2 && entities.length !== 3)) {
      throw new KernelError(
        'feature.invalid-args',
        `path.tangentCircle: expected 2 or 3 tangency entities; got ${Array.isArray(entities) ? entities.length : typeof entities}.`,
        undefined,
        'Pass 2 entities together with opts.radius (Geom2dGcc_Circ2d2TanRad), or 3 entities and no radius (Geom2dGcc_Circ2d3Tan).',
      );
    }
    const hasRadius = opts?.radius !== undefined;
    // The two forms take DIFFERENT OCCT solvers, so "2 entities and no radius"
    // and "3 entities plus a radius" are not under-specified requests we could
    // fill in — they name no constructor at all.
    if (entities.length === 2 && !hasRadius) {
      throw new KernelError(
        'feature.invalid-args',
        'path.tangentCircle: a two-entity construction needs opts.radius — two tangencies alone do not determine a circle.',
        undefined,
        'Pass opts.radius, or add a third entity and omit the radius.',
      );
    }
    if (entities.length === 3 && hasRadius) {
      throw new KernelError(
        'feature.invalid-args',
        'path.tangentCircle: a three-entity construction determines its own radius; opts.radius over-constrains it.',
        undefined,
        'Drop opts.radius for the three-entity form, or drop one entity to use the radius form.',
      );
    }
    const radius = hasRadius ? toParam(opts!.radius!, 'mm') : undefined;
    if (radius !== undefined && !(this.#now(radius) > 0)) {
      throw new KernelError(
        'feature.invalid-args',
        `path.tangentCircle: opts.radius must be > 0; got ${this.#now(radius)}.`,
        undefined,
        'Pass a positive radius.',
      );
    }

    this.commands.push({
      kind: 'tangentCircle',
      entities: entities.map((e, i) => validateTangentEntity(e, `path.tangentCircle entities[${i}]`, this.session.paramTable)),
      radius,
      near: toNearSpec(opts?.near, 'path.tangentCircle', this.session.paramTable),
    });
    this.commands.push({ kind: 'close' });
    return this.session.createSketch({
      kind: 'sketch',
      inputs: {},
      params: {},
      metadata: { commands: this.commands },
    });
  }

  /**
   * Straight segment along the line tangent to two circles
   * (`Geom2dGcc_Lin2d2Tan`) — the belt/pulley move. The segment spans the two
   * tangency points, so chaining `tangentLine` with arcs around each pulley
   * builds a closed belt profile.
   *
   * Both entities must be circles. A "line tangent to a line" is either that
   * same line or nothing, so it is rejected rather than silently accepted.
   *
   * If the path is fresh this emits the tangent span alone (pen starts at the
   * first tangency point). If the pen already exists, a straight connecting
   * line is inserted from the pen to the first tangency point first — it does
   * not teleport, and the connector is a real segment of your profile.
   *
   * **Which solution you get.** Two circles admit up to four tangent lines
   * (two external, two internal). `side` is the primary control:
   * `outside`/`outside` selects an external tangent. Where more than one
   * survives, `opts.near` picks the one whose infinite line passes closest to
   * that point (perpendicular distance — you are pointing at a side of the
   * pulley pair, not at a contact point). Still ambiguous ⇒ lowering fails
   * with `sketch.tangency.ambiguous` rather than guessing.
   *
   * @example
   *   // Upper external tangent between two equal pulleys.
   *   path().tangentLine(
   *     { kind: 'circle', center: [0, 0], radius: 5 },
   *     { kind: 'circle', center: [40, 0], radius: 5 },
   *   )
   */
  tangentLine(
    a: TangentEntity2D,
    b: TangentEntity2D,
    opts?: { near?: [Editable<number>, Editable<number>] },
  ): PathBuilder {
    const specA = validateTangentEntity(a, 'path.tangentLine(a)', this.session.paramTable);
    const specB = validateTangentEntity(b, 'path.tangentLine(b)', this.session.paramTable);
    for (const [spec, label] of [[specA, 'a'], [specB, 'b']] as const) {
      if (spec.kind !== 'circle') {
        throw new KernelError(
          'feature.invalid-args',
          `path.tangentLine(${label}): tangency entities must be circles; got a line.`,
          undefined,
          'Geom2dGcc_Lin2d2Tan takes two circles. A line tangent to a line is that same line — use lineTo instead.',
        );
      }
    }
    this.commands.push({
      kind: 'tangentLine',
      a: specA,
      b: specB,
      near: toNearSpec(opts?.near, 'path.tangentLine', this.session.paramTable),
      // Recorded at capture time because the resolver runs after the fact and
      // cannot otherwise tell whether a pen existed when the author called.
      startsPath: this.commands.length === 0,
    });
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
   * `cx`, `cy` and `r` accept `Editable<number>`. Each vertex is captured as
   * the expression `cx + r·cos θ`, `cy + r·sin θ` (θ is a fixed constant per
   * vertex), so a ParamRef centre or radius stays symbolic and the circle
   * re-evaluates when the param changes. `segments` is a plain integer — it
   * sets how many vertices exist, which cannot change after capture.
   */
  circle(cx: Editable<number>, cy: Editable<number>, r: Editable<number>, segments: number = 48): Sketch {
    const table = this.session.paramTable;
    const cxv = currentValue(cx, table);
    const cyv = currentValue(cy, table);
    const rv = currentValue(r, table);
    if (!Number.isFinite(cxv) || !Number.isFinite(cyv) || !Number.isFinite(rv)) {
      throw new KernelError(
        'feature.invalid-args',
        `path.circle(cx, cy, r): all of cx (${cxv}), cy (${cyv}), r (${rv}) must be finite.`,
        undefined,
        'Pass finite numbers or numeric ParamRefs for cx, cy, r.',
      );
    }
    if (rv <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `path.circle: radius must be > 0; got ${rv}.`,
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
    const cxE = paramExpr(toParam(cx, 'mm'));
    const cyE = paramExpr(toParam(cy, 'mm'));
    const rE = paramExpr(toParam(r, 'mm'));
    // centre + r·k, with k = cos θ or sin θ a per-vertex constant. Literal-only
    // inputs fold back to plain numbers, so a numeric circle captures exactly
    // the record it always did.
    const along = (c: ParamRefExpr, k: number): Param =>
      paramFromExpr(
        { kind: 'binop', op: '+', left: c, right: { kind: 'binop', op: '*', left: rE, right: { kind: 'lit', value: k } } },
        'mm',
      );
    // Start at (cx + r, cy) and walk counterclockwise. Use lineTo for each
    // chord; the final close() closes the loop.
    this.commands.push({ kind: 'moveTo', x: along(cxE, 1), y: paramFromExpr(cyE, 'mm') });
    for (let i = 1; i < segments; i++) {
      const theta = (2 * Math.PI * i) / segments;
      this.commands.push({
        kind: 'lineTo',
        x: along(cxE, Math.cos(theta)),
        y: along(cyE, Math.sin(theta)),
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

/**
 * Validate an authored tangency entity and box it into the `Param`-shaped
 * wire form. Runs at capture time so a malformed entity is rejected at the
 * call site rather than surfacing as an opaque OCCT failure three layers down.
 *
 * `side` defaults to `'outside'` — the sketch-fillet reading, and the value
 * that most often makes the construction unique on its own.
 */
function validateTangentEntity(e: TangentEntity2D, where: string, table: ParamTable): TangentEntitySpec {
  if (!e || typeof e !== 'object' || (e.kind !== 'line' && e.kind !== 'circle')) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: expected { kind: 'line', from, to } or { kind: 'circle', center, radius }; got ${JSON.stringify(e)}.`,
      undefined,
      "Tangency entities are lines and circles only. Point tangency is unavailable — the bundled OCCT does not bind Handle_Geom2d_Point.",
    );
  }
  const side = e.side ?? 'outside';
  if (!TANGENT_SIDES.includes(side)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: side must be one of ${TANGENT_SIDES.join(' | ')}; got '${side}'.`,
      undefined,
      "side maps to OCCT's GccEnt_Position and is the primary control over which solution you get.",
    );
  }
  // Coordinates may be numbers or numeric ParamRefs. Validation reads the
  // CURRENT value; the captured Param keeps the ParamRef so the lowerer sees
  // the live value after a param change.
  const finite = (v: unknown, field: string): { value: number; param: Param } => {
    if (!isValidEditableNumber(v)) {
      throw new KernelError(
        'feature.invalid-args',
        `${where}.${field}: expected a finite number or numeric ParamRef; got ${JSON.stringify(v)}.`,
        undefined,
        'Tangency entity coordinates must be finite numbers or param() references.',
      );
    }
    const editable = v as Editable<number>;
    const value = currentValue(editable, table);
    if (!Number.isFinite(value)) {
      throw new KernelError(
        'feature.invalid-args',
        `${where}.${field}: expected a finite value; got ${value}.`,
        undefined,
        'Tangency entity coordinates must resolve to finite numbers.',
      );
    }
    return { value, param: toParam(editable, 'mm') };
  };
  if (e.kind === 'line') {
    const from = e.from ?? ([] as unknown as [number, number]);
    const to = e.to ?? ([] as unknown as [number, number]);
    const x1 = finite(from[0], 'from[0]'), y1 = finite(from[1], 'from[1]');
    const x2 = finite(to[0], 'to[0]'), y2 = finite(to[1], 'to[1]');
    if (Math.hypot(x2.value - x1.value, y2.value - y1.value) < 1e-9) {
      throw new KernelError(
        'feature.invalid-args',
        `${where}: from and to are coincident at (${x1.value}, ${y1.value}) — they define no line.`,
        undefined,
        'Give two distinct points. Their order also sets the line direction, which is what side:"outside" is relative to.',
      );
    }
    return { kind: 'line', x1: x1.param, y1: y1.param, x2: x2.param, y2: y2.param, side };
  }
  const center = e.center ?? ([] as unknown as [number, number]);
  const cx = finite(center[0], 'center[0]'), cy = finite(center[1], 'center[1]');
  const r = finite(e.radius, 'radius');
  if (!(r.value > 0)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: circle radius must be > 0; got ${r.value}.`,
      undefined,
      'Pass a positive radius.',
    );
  }
  return { kind: 'circle', cx: cx.param, cy: cy.param, r: r.param, side };
}

/** Box the optional `near` disambiguation hint. */
function toNearSpec(
  near: [Editable<number>, Editable<number>] | undefined,
  where: string,
  table: ParamTable,
): TangentNearSpec | undefined {
  if (near === undefined) return undefined;
  if (!Array.isArray(near) || near.length !== 2) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: opts.near must be a [x, y] pair; got ${JSON.stringify(near)}.`,
      undefined,
      'Pass opts.near as [x, y] near the solution you want.',
    );
  }
  const x = toParam(near[0], 'mm');
  const y = toParam(near[1], 'mm');
  const xv = paramValue(x, table);
  const yv = paramValue(y, table);
  if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: opts.near coordinates must be finite; got [${xv}, ${yv}].`,
      undefined,
      'Pass finite numbers for opts.near.',
    );
  }
  return { x, y };
}

/** Box a 3D point for record metadata: plain numbers stay plain numbers (so a
 *  numeric record is unchanged); a ParamRef coordinate becomes a Param the
 *  dispatcher pre-resolves at lower time. */
function editablePoint3(
  p: [Editable<number>, Editable<number>, Editable<number>],
): Array<number | Param> {
  return p.map((v) => (typeof v === 'number' ? v : toParam(v, 'mm')));
}

export function makePath(session: CaptureSession): PathBuilder {
  return new PathBuilder(session);
}
