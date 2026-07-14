// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { validateFaceLabels } from './capture/faceLabels';
import { makeAssembly, type Assembly } from './capture/assembly';
import { Shape } from './capture/proxy';
import { Sketch, makePath, type PathBuilder } from './capture/sketch';
import type { SurfaceProxy } from './capture/surfaceProxy';
import type { Curve3D } from './capture/curveProxy';
import type { Param, Vec3, PlaneSpec } from '../shared/intent/types';
import { isValidEditableNumber, formatScalarForError } from '../shared/intent/types';
import {
  selectEdges as selectEdgesBackend,
  selectEdge as selectEdgeBackend,
  type EdgeQuery,
  type EdgeSegment,
} from '../kernel/backends/occt/edgeQueries';
import type { ReferenceImageHandle, ReferenceImageScale } from '../shared/intent/referenceImageRecord';
import type {
  RenderEnvironmentSpec,
  RenderEnvironmentHandle,
} from '../shared/intent/renderEnvironmentRecord';
import type {
  CameraTargetHandle,
} from '../shared/intent/cameraTargetRecord';
import type {
  AnimationViewHandle,
  AnimationViewSpec,
} from '../shared/intent/animationViewRecord';
import type { DfmSpec, DfmSpecHandle } from '../shared/intent/dfmSpecRecord';
import { helix, type RailPoint, type HelixOptions } from './helix';
import { solveHermiteG2, type HermiteEndpoint } from './capture/hermiteG2';
import { createSketchModule, type SketchModule } from './sketch/index';
import { fontPath, type FontPath } from '../shared/fonts/index';
import { fromSTEP as libFromSTEP } from './parts/fromSTEP';
import { fetchPartHost, type FetchPartOpts } from './parts/fetchPart';
import {
  findPartHost,
  type FindPartOpts,
  type FindPartResult,
} from './parts/findPart';
import { createStandardParts, type StandardParts } from './parts/standardParts';
import { sphere as sdfSphere, box as sdfBox, cylinder as sdfCylinder, torus as sdfTorus } from './sdf/primitives';
import { smoothBlend as sdfSmoothBlend } from './sdf/smoothBlend';
import { materialize as sdfMaterialize, type MaterializeOpts } from './sdf/materialize';
import type { SdfField } from './sdf/index';
import { KernelError } from '../shared/intent/kernelError';
import { validateThickness, validateKFactor } from './sheetMetal';
import type { FaceLabelsMap } from '../shared/intent/featureRecord';
import { makeParamRef, isParamRef, type ParamRef, type Editable } from '../shared/runtime/paramRef';
import type { ParamMetadata } from '../shared/runtime/paramTable';
import { toParam } from '../shared/runtime/editableHelpers';
import * as kinematic from '../kinematic';
import type { KinematicFacade } from '../kinematic/types';
import { q as queryNamespace } from '../kernel/naming/queryConstructors';
import { makeJointNamespace } from './joints';
import type {
  ClevisJoint,
  ClevisJointOptions,
  ArticulatedDigitOptions,
  ArticulatedDigitResult,
  SupportedServoRevoluteOptions,
  SupportedServoRevoluteResult,
} from './joints';

export interface ApiContext {
  session: CaptureSession;
  /** Absolute directory of the calling `.kcad.ts` script. Used by
   *  `lib.fromSTEP(path)` to resolve relative STEP paths. */
  scriptDir?: string;
}

export interface PartsLib {
  fromSTEP(path: string): Promise<Shape>;
  findPart(query: string, opts?: FindPartOpts): Promise<FindPartResult>;
  fetchPart(idOrQuery: string, opts?: FetchPartOpts): Promise<Shape>;
  standard: StandardParts;
}

export interface FaceLabelOpts {
  faceLabels?: FaceLabelsMap;
}

/** W2.2: opts for `sheetMetal(profile, opts)`. The kernel does not bake
 *  material tables; the agent picks `kFactor` per material/thickness. */
export interface SheetMetalOpts {
  /** Sheet thickness in mm. Drives extrude depth of the base body.
   *  Must be a positive finite number (or ParamRef<number>). */
  thickness: Editable<number>;
  /** K-factor — neutral-axis offset ratio in [0, 1]. Typical mild-steel /
   *  aluminum values are 0.33–0.45. */
  kFactor: Editable<number>;
  /** Standard face-labels map. */
  faceLabels?: FaceLabelsMap;
}

export interface SdfNamespace {
  sphere(radius: number): SdfField;
  box(size: Vec3): SdfField;
  cylinder(radius: number, height: number): SdfField;
  torus(majorR: number, minorR: number): SdfField;
  smoothBlend(a: SdfField, b: SdfField, k: number): SdfField;
  materialize(field: SdfField, opts?: MaterializeOpts): Shape;
  /** Bind an SdfField by name on the session, so the `evaluate_sdf` MCP tool
   *  can sample it after the script returns. Used by agents who want to probe
   *  field values before (or after) calling the expensive `sdf.materialize`. */
  bind(name: string, field: SdfField): void;
}

export interface KernelCadApi {
  box(x: Editable<number>, y: Editable<number>, z: Editable<number>, centered?: boolean, opts?: FaceLabelOpts): Shape;
  cylinder(h: Editable<number>, r: Editable<number>, segments?: number, opts?: FaceLabelOpts): Shape;
  sphere(r: Editable<number>, opts?: FaceLabelOpts): Shape;
  /**
   * Solid torus centered on world origin, axis along world +Z.
   *
   * Built via `path().circle(majorR, 0, minorR).revolve()` — a polyline
   * approximation of the minor-radius profile revolved 360° about Z.
   * Surfaced 2× in agent-eval (eyebolt + others): there was no
   * convenience primitive for this canonical rotational shape; agents
   * emitted trig in TS to build the polyline circle by hand.
   *
   * @param majorR distance from world origin to profile center
   * @param minorR profile circle radius
   * @param segments profile polyline segments (default 48)
   */
  torus(majorR: number, minorR: number, segments?: number): Shape;
  /**
   * Build a physical helical spring as a swept circular wire along a helix.
   * Default axis is +Z; use axis 'X' for Anglepoise-style balance springs
   * along lamp arms.
   */
  spring(opts: SpringOptions): Shape;
  extrudeRect(w: Editable<number>, h: Editable<number>, height: Editable<number>, opts?: FaceLabelOpts): Shape;
  extrudeCircle(r: Editable<number>, height: Editable<number>, opts?: FaceLabelOpts): Shape;
  extrudePolygon(points: [number, number][], depth: Editable<number>, opts?: FaceLabelOpts): Shape;
  extrudeRoundedRect(width: Editable<number>, height: Editable<number>, radius: Editable<number>, depth: Editable<number>, opts?: FaceLabelOpts): Shape;
  union(...shapes: Shape[]): Shape;
  assembly(name?: string): Assembly;

  // Slice-3 symbolic params (replaces slice-1's number-returning param()).
  // See spec §E.1, §E.2.
  param<T extends number | boolean>(name: string, defaultValue: T, meta?: ParamMetadata): ParamRef<T>;
  params<R extends Record<string, number | boolean>>(decl: R): { [K in keyof R]: ParamRef<R[K]> };

  path(): PathBuilder;
  helix(opts: HelixOptions): RailPoint[];
  selectEdges(shape: Shape, query?: EdgeQuery): Promise<EdgeSegment[]>;
  selectEdge(shape: Shape, query: EdgeQuery): Promise<EdgeSegment>;

  /** Parts library — STEP-import + (future) parametric component wrappers. */
  lib: PartsLib;

  /**
   * W1.3: Build a NURBS surface from an explicit control net + degree.
   * Returns a `Surface` peer to `Shape`. Use `.thicken(t)` to get a
   * closed solid, or `.toShape()` to get a zero-volume single-face shell.
   *
   * `weights` are honored: when supplied, the surface is built rational
   * (OCCT `Geom_BSplineSurface_2`), so exact circles/cylinders/spheres/
   * conics are representable. Omit `weights` for a non-rational surface.
   */
  nurbsSurface(opts: {
    controls: Vec3[][];
    weights?: number[][];
    degree: { u: number; v: number };
    knots?: { u: number[]; v: number[] };
    periodic?: { u: boolean; v: boolean };
  }): SurfaceProxy;

  /**
   * W1.3: Skin a NURBS surface through a sequence of Sketch sections in
   * order. Each section's lifted profile becomes a transverse cross-section
   * of the resulting surface. Returns a `Surface` peer to `Shape`.
   */
  surfaceFromCurves(sections: Sketch[]): SurfaceProxy;

  /**
   * NURBS Slice B: a 3D parametric curve specified by an explicit
   * `Geom_BSplineCurve` control net. `degree` defaults to 3 (cubic). Pass
   * `weights` for a rational curve, `knots` for a custom knot vector
   * (otherwise clamped-uniform is generated). Returns a `Curve3D` peer.
   *
   * The curve lowers to a `TopoDS_Edge` and is consumed by `variableSweep`
   * (spine input) and — in later slices — `surfaceFromBoundary`. The proxy
   * also exposes synchronous `sample` / `pointAt` / `tangentAt` / `length`.
   */
  nurbsCurve(
    controlPoints: Vec3[],
    opts?: { degree?: number; weights?: number[]; knots?: number[]; closed?: boolean },
  ): Curve3D;

  /**
   * NURBS Slice B: Catmull-Rom convenience that interpolates the supplied
   * points through a cubic NURBS curve. Returns a `Curve3D`. Equivalent to
   * `nurbsCurve(controlNet, { degree: 3 })` after a Catmull-Rom-to-Bezier
   * conversion; see implementation comments for the formula.
   */
  spline3d(
    points: Vec3[],
    opts?: { tension?: number; closed?: boolean },
  ): Curve3D;

  /**
   * NURBS Slice C: quintic Hermite transition curve between two endpoints
   * with prescribed tangent and (optional) curvature on each side. Returns
   * a degree-5 `Curve3D` (6-control-point Bezier under a clamped-uniform
   * knot vector).
   *
   * Use this to build a G2 blend curve between two existing curves — sample
   * each neighbour's `pointAt(t)`, `tangentAt(t)` (and, if the neighbour is
   * itself a `Curve3D`, its second-derivative for G2; otherwise omit
   * `curvature` to fall back to G1).
   *
   * Throws `KernelError` on non-finite inputs or a zero-magnitude tangent;
   * the curve3d record is not registered in that case.
   */
  hermiteG2(a: HermiteEndpoint, b: HermiteEndpoint): Curve3D;

  /**
   * NURBS Slice B: multi-section sweep. Sweeps each `section.profile` along
   * the `spine`, blending between sections at the section's `t ∈ [0, 1]`
   * spine parameter. Lowers to `BRepOffsetAPI_MakePipeShell` (direct OCCT —
   * no replicad wrapper).
   *
   * `spine` accepts a `Curve3D`, a planar `Sketch` (its lifted wire is used
   * as the rail), or a `Vec3[]` (auto-converted to a `nurbsCurve` of degree
   * `min(3, points.length - 1)`).
   *
   * Sections must be strictly increasing in `t`; the first section MUST sit
   * at `t = 0` and the last at `t = 1`. Continuity defaults to `'C1'`.
   */
  variableSweep(
    spine: Curve3D | Sketch | Vec3[],
    sections: Array<{ t: number; profile: Sketch }>,
    opts?: { closed?: boolean; continuity?: 'C0' | 'C1' | 'C2' },
  ): Shape;

  /**
   * NURBS Slice C: build the shipped filling surface: one NURBS face through
   * 4 boundary curves. The 4 curves must be passed in exact loop order:
   *   curves[0] = bottom, curves[1] = right, curves[2] = top, curves[3] = left.
   * Adjacent endpoints must coincide within 1e-6 mm (the kernel emits
   * `feature.surface-from-boundary.corner-mismatch` otherwise).
   *
   * `opts.continuity` is either a single grade applied to all 4 edges, or an
   * array of 4 grades (one per edge). Maps to OCCT's `GeomAbs_C0/C1/C2` on
   * `BRepOffsetAPI_MakeFilling.Add_1(edge, order, true)`. `opts.sampling`
   * controls `NbPtsOnCur` (defaults to 15 at lower time).
   *
   * Returns a `Surface` peer to `Shape`. Use `.thicken(t)` to get a closed
   * solid, or `.toShape()` to wrap as a zero-volume single-face shell.
   */
  surfaceFromBoundary(
    curves: [Curve3D, Curve3D, Curve3D, Curve3D],
    opts?: {
      continuity?: 'C0' | 'C1' | 'C2' | ('C0' | 'C1' | 'C2')[];
      sampling?: number;
    },
  ): SurfaceProxy;

  /**
   * NURBS Slice E: stitch N surfaces into a shell or closed solid.
   * Lowers to OCCT `BRepBuilderAPI_Sewing` (Task 5). Returns a `Shape` so
   * the result flows directly into boolean ops, export, and fillet pipelines.
   *
   * Edges within `opts.tolerance` mm of each other are stitched together.
   * If `opts.requireClosed` is true and the result is still an open shell
   * at lower time, the lowerer emits `feature.surface-sew.open-shell`
   * (severity 'error') instead of returning a partial solid.
   *
   * @throws KernelError('feature.invalid-args') if `surfaces` is not an
   *  array of at least 1 Surface.
   */
  sew(
    surfaces: SurfaceProxy[],
    opts?: { tolerance?: number; requireClosed?: boolean },
  ): Shape;

  /** 2D sketch primitives namespace. Currently: `sketch.text(content, opts)`. */
  sketch: SketchModule;

  /**
   * W2.2: Build a sheet-metal body from a closed planar Sketch. Reuses the
   * sketch→extrude pipeline at depth = `thickness`; tags the record as
   * `kind: 'sheetMetal'` so the lowerer threads sheet-metal canonical face
   * labels and stores `kFactor` for downstream `.bend()` math.
   *
   * Bend-allowance math (K-factor approximation, used by `.bend()`):
   *   `BA = (π · |angle_deg| / 180) · (kFactor · thickness + radius)`
   *
   * Slice-1 limits: planar profile only; `radius >= 0.5 · thickness` for
   * reliable sewing; flatten-pattern supports <= 2 bends.
   */
  sheetMetal(profile: Sketch, opts: SheetMetalOpts): Shape;

  /** Brand a string as a font filesystem path (TTF). Use with sketch.text({ font: fontPath('/path/to/font.ttf') }). */
  fontPath(p: string): FontPath;

  /**
   * Query DSL constructor namespace (Slice Q). `q.face(...)`, `q.edge(...)`,
   * `q.union(...)`, etc. build a lazy `Query<T>` value that resolves at
   * consume-time against a `QueryScene`. Inside `.kcad.ts` scripts the
   * namespace is also reachable as `kc.q.*` for prose-doc continuity.
   *
   * See `src/agent/skills/kernelcad-features/SKILL.md` (Query selectors)
   * and the Query DSL cookbook snippets Q-S1..Q-S6 for usage patterns.
   */
  q: typeof queryNamespace;

  /** SDF authoring namespace (W2.3). Primitives + smoothBlend + materialize.
   *  `sdf.materialize(field)` returns a standard `Shape` of kind 'sdfMaterialize'
   *  that flows through booleans/fillets/exports. The bare `'sdf'` FeatureKind
   *  is a reservation marker for slice-2+ (TPMS / voronoi) and is not lowered. */
  sdf: SdfNamespace;

  /**
   * Slice A: overlay a reference image on a plane for tracing or design review.
   * The record is virtual — no OCCT geometry is produced; the renderer reads
   * the image directly from the feature graph.
   *
   * Validation errors (missing file, bad format, invalid plane) are pushed as
   * structured diagnostics on the returned handle's record rather than thrown —
   * so agents can inspect and correct them incrementally.
   *
   * @param path   Path to the image file (.png, .jpg, .jpeg, .webp), resolved
   *               relative to the calling .kcad.ts script's directory.
   * @param opts.plane    Plane on which the image is displayed ('xy' | 'xz' | 'yz' | offset-plane).
   * @param opts.anchor   World-space anchor — 'origin' (default) or an explicit Vec3 in mm.
   * @param opts.scale    'fit-bbox' (default) | mm width-number | { width?, height? } in mm.
   * @param opts.opacity  Display opacity in [0, 1]; clamped; default 0.5.
   * @param opts.flipU    Flip image horizontally; default false.
   * @param opts.flipV    Flip image vertically; default false.
   */
  referenceImage(
    path: string,
    opts: {
      plane: PlaneSpec;
      anchor?: 'origin' | [number, number, number];
      scale?: ReferenceImageScale;
      opacity?: number;
      flipU?: boolean;
      flipV?: boolean;
    },
  ): ReferenceImageHandle;

  /**
   * Set the HDRI / IBL lighting environment for the rendered scene. Pass
   * either a built-in preset key or a `.hdr` URL; intensity (default 1.0)
   * scales `envMapIntensity` on all PBR materials, and rotation (degrees,
   * default 0) rotates the env map around the world Y axis.
   *
   * Default behavior (script never calls this) is the existing three-light
   * rig — no env map applied. Multiple calls register multiple records; the
   * last one wins at render time.
   */
  setRenderEnvironment(spec: RenderEnvironmentSpec): RenderEnvironmentHandle;

  /**
   * Override the camera look-at target for setRenderPose / engineering-view
   * renders. Default behavior (no call) is to aim the camera at the bbox
   * centroid; that auto-fit skews when geometry is highly asymmetric (tall
   * pendants, off-centre eyepieces). Pass an explicit (x, y, z) to re-aim.
   *
   * Multiple calls register multiple records; the renderer applies the last
   * one at render time. Validation errors (non-finite coords, negative
   * distance) are stashed on `handle.metadata.diagnostics` rather than
   * thrown — a default-safe record (target = bbox centroid axis-by-axis) is
   * still produced.
   */
  setCameraTarget(x: number, y: number, z: number): CameraTargetHandle;

  /**
   * Override the camera framing distance (mm from target). Convenience wrap
   * over the optional `distance` field on the underlying cameraTarget
   * record — pulls the current camera target (or [0, 0, 0] if no
   * setCameraTarget call has been made) and attaches the supplied distance.
   * Used to push or pull the camera relative to the auto-fit when the
   * extents-projection fit reads too tight or too loose at the chosen
   * pose / aspect.
   */
  setCameraDistance(distance: number): CameraTargetHandle;

  /**
   * Declare an animation timeline for offline MP4 capture. Two forms:
   *
   *   - Legacy sweep: `{ param, from, to, durationMs, fps? }` — ONE
   *     previously-declared `param()` swept linearly.
   *   - Keyframe tracks: `{ name?, tracks, fps? }` — several params on one
   *     shared timeline, each track a list of `{ atMs, value, ease? }` keys.
   *     `ease` applies to the segment ENDING at that key (default 'linear');
   *     outside the keyed span the value holds.
   *
   * Either way the stored metadata is normalized to the track shape
   * (`AnimationViewMetadata`): keys sorted by atMs, ease defaulted, and
   * `durationMs` = max atMs across all tracks.
   * `scripts/captureAnimationView.mjs` reads the resulting `animationView`
   * virtual record and renders an MP4 by sampling
   * `ceil(durationMs / 1000 * fps)` frames across the timeline — leveraging
   * the per-session mesh cache so each frame's recompute is ~5 ms warm.
   *
   * Every animated param must be declared by a prior `param()` call;
   * malformed tracks/keys throw `KernelError` (`animation.*` codes), key
   * values outside the param's declared range are clamped with a warn.
   * Multiple calls register multiple records; the capture script uses the
   * last one (the later record carries an `animation.view.shadowed` warn
   * naming the records it shadows).
   */
  animationView(spec: AnimationViewSpec): AnimationViewHandle;

  /**
   * Declare printability (design-for-manufacture) gates for the model.
   * Declaration-only: this registers a virtual record (no OCCT geometry).
   * Enforcement runs on every `kernelcad evaluate` / `evaluate_script` once
   * a dfmSpec record is present — declared gates (minimum wall thickness,
   * inter-part clearance, internal-channel topology) fail the evaluation
   * when violated.
   *
   * At least one of `minWall`, `minClearance`, or `channels` is required.
   * Malformed declarations THROW `KernelError` (`feature.invalid-args`)
   * rather than stashing diagnostics — dfmSpec is an enforcement gate, and
   * a silently-disabled gate is worse than a build failure.
   *
   * Multiple calls register multiple records; the last record wins (same
   * convention as `setRenderEnvironment`).
   */
  dfmSpec(spec: DfmSpec): DfmSpecHandle;

  /**
   * Kinematic-grounding checks namespace. Four in-process feasibility
   * gates an agent can call before declaring a mechanism design done:
   * mounting-hole consistency, swept-pose collision, IK reachability, and
   * beam-mode load capacity. Every entry is sync compute wrapped in async
   * and returns a typed envelope with `source: 'local'`.
   */
  kinematic: KinematicFacade;

  /**
   * Mechanism-delivery joint helpers.
   *
   * `joint.clevis({ parentBody, childBody, axis, pivotParent, ... })` builds
   * the canonical revolute-joint hardware (two fork plates on the parent,
   * one tongue on the child, a pin drilled through both knuckles) guaranteed
   * correct by construction: bridge tabs outside the tongue's swing
   * envelope, pivot lifted by max rotated-tongue reach, the through-hole
   * drilled in ONE pass after fork/tongue are unioned into their parts, and
   * the pin cap heads flush against the outer fork faces. Returns the
   * parent/child geometry to assign back to each part's `Shape` plus the
   * parent/child connector specs (origin + axis) ready to feed into
   * `partRef.connector(name, { type: 'axis', origin, axis })` + the
   * `arm.mate(..., 'revolute', ...)` call.
   *
   * Use this primitive INSTEAD of hand-rolling forks/tongues/pins from
   * `box`/`cylinder`/`union` — hand-rolled clevises are the leading cause
   * of mechanism-delivery failures (see `kernelcad-kinematic` SKILL.md
   * "Mechanism delivery — non-bypassable").
   *
   * `joint.supportedServoRevolute(arm, { name, mate, support, supportMount,
   * output, axis, ... })` adds a seated servo actuator part, fastens its
   * mount to a frame connector on the support part, and declares the
   * `mechanicalJoint(...)` support contract for the driven revolute mate.
   * The helper preflights names, refs, mate type, support/output presence,
   * supportMount frame type, `axis` as the support-side axis connector of
   * the named revolute mate, and body dimensions before mutating the
   * assembly.
   *
   * `joint.articulatedDigit(arm, { name, parentMount, frame, segments,
   * joints, clearanceMm, ... })` builds a planar chain directly in the
   * supplied assembly. Its full 3D base frame maps canonical +X forward,
   * +Y lift, and +Z pin axes before registration; every generated revolute
   * package is a physical `joint.clevis(...)` with a support intent and
   * clearance-bounded structural link. Omitted clevis dimensions use
   * `joint.clevis`'s standard `withDefaults()` resolution unchanged. Fit options are soft reference checks
   * only and never reduce the physical package. The root mount is an exterior
   * plane: the generated base extends along local +X to its distal root pivot,
   * so callers place the frame on an exterior palm surface with palm material
   * behind that plane. Arbitrary interior mount clearance remains a candidate
   * assembly review responsibility. This helper does not certify payload
   * capacity or actuation.
   */
  joint: {
    clevis(opts: ClevisJointOptions): ClevisJoint;
    supportedServoRevolute(arm: Assembly, opts: SupportedServoRevoluteOptions): SupportedServoRevoluteResult;
    articulatedDigit(arm: Assembly, opts: ArticulatedDigitOptions): ArticulatedDigitResult;
  };
}

export interface SpringOptions {
  length: number;
  coilRadius: number;
  wireRadius: number;
  turns: number;
  axis?: 'X' | 'Y' | 'Z';
  pointsPerTurn?: number;
  endStyle?: 'open' | 'closed';
  segments?: number;
}

const mm = (n: Editable<number>): Param => toParam(n, 'mm');
const ul = (n: Editable<number>): Param => toParam(n, 'unitless');

/** Targeted hint for the top parametric-authoring trap: JS arithmetic or
 *  string templating on a ParamRef (`param('w', 18) + 4`, `\`\${ref}4\``)
 *  produces `"[object Object]4"` / NaN strings that land in dimension slots.
 *  Returns a specific repair hint when the garbage matches that fingerprint;
 *  undefined otherwise (callers fall back to the generic hint). */
function paramArithmeticHint(value: unknown): string | undefined {
  const methodsHint =
    `use the ParamRef arithmetic methods — .add(n), .subtract(n), .multiply(n), .divide(n), .negate() — not JS operators (+ - * /) or template strings. Example: param('w', 18).add(4) instead of param('w', 18) + 4.`;
  if (typeof value === 'string') {
    if (/\[object Object\]/.test(value)) {
      return `invalid-args.param.js-arithmetic — this value looks like JS arithmetic or string concatenation on a ParamRef; ${methodsHint}`;
    }
    return `invalid-args.param.string-dimension — dimension arguments must be numbers, not strings; if this string came from templating/concatenating a ParamRef, ${methodsHint}`;
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    return `invalid-args.param.js-arithmetic — NaN here often means JS arithmetic was applied to a ParamRef; ${methodsHint}`;
  }
  if (isParamRef(value) && (value as { _type?: unknown })._type !== 'number') {
    return `invalid-args.param.type-mismatch — this slot needs a NUMERIC param; the ParamRef passed is '${(value as { _type?: string })._type}'. Declare the param with a numeric defaultValue.`;
  }
  return undefined;
}

function assertEditableNumber(featureKind: string, paramName: string, value: unknown): void {
  if (isValidEditableNumber(value)) return;
  const targetedHint = paramArithmeticHint(value);
  throw new KernelError(
    'feature.invalid-args',
    `${featureKind}: ${paramName} must be a finite number or a numeric ParamRef; got ${formatScalarForError(value)}.`,
    featureKind,
    targetedHint ??
      `Pass a number (or a ParamRef returned by param()) for ${paramName}; primitives do NOT accept an options object such as { radius, height }. Use the positional signature: ${featureKind}(...).`,
  );
}

function assertPositiveFinite(featureKind: string, paramName: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `${featureKind}: ${paramName} must be a positive finite number; got ${formatScalarForError(value)}.`,
      featureKind,
      `Pass a positive finite number for ${paramName}.`,
    );
  }
  return value;
}

// === W1.3 NURBS surfaces validation helpers ===

function isRectangularGrid(grid: unknown[][]): boolean {
  if (!Array.isArray(grid) || grid.length === 0) return false;
  const nV = grid[0].length;
  if (nV === 0) return false;
  return grid.every(row => Array.isArray(row) && row.length === nV);
}

function describeGridShape(grid: unknown): string {
  if (!Array.isArray(grid)) return String(grid);
  if (grid.length === 0) return '[]';
  const rowLens = (grid as unknown[][]).map(r => Array.isArray(r) ? r.length : 'NaN');
  return `${grid.length} rows, inner lengths [${rowLens.join(',')}]`;
}

function validateNurbsControls(controls: Vec3[][]): void {
  if (!isRectangularGrid(controls as unknown[][])) {
    throw new KernelError(
      'feature.nurbs.degenerate-controls',
      `nurbsSurface: controls must be a non-empty rectangular Vec3 grid; got shape ${describeGridShape(controls)}.`,
      undefined,
      'nurbs.degenerate-controls — controls must be a non-empty rectangular Vec3 grid spanning a 2D extent.',
    );
  }
  for (const row of controls) {
    for (const p of row) {
      if (
        !Array.isArray(p) || p.length !== 3 ||
        !p.every(c => typeof c === 'number' && Number.isFinite(c))
      ) {
        throw new KernelError(
          'feature.nurbs.degenerate-controls',
          `nurbsSurface: every control point must be a finite Vec3; got ${JSON.stringify(p)}.`,
          undefined,
          'nurbs.degenerate-controls — control points must be finite Vec3 (3 numbers).',
        );
      }
    }
  }
}

function validateNurbsDegree(controls: Vec3[][], degree: { u: number; v: number }): void {
  const nU = controls.length;
  const nV = controls[0].length;
  const bad =
    !Number.isFinite(degree.u) || !Number.isFinite(degree.v) ||
    degree.u < 1 || degree.v < 1 ||
    degree.u > nU - 1 || degree.v > nV - 1;
  if (bad) {
    throw new KernelError(
      'feature.nurbs.degree-mismatch',
      `nurbsSurface: degree must satisfy 1 <= degree.u <= ${nU - 1} and 1 <= degree.v <= ${nV - 1}; got degree.u=${degree.u}, degree.v=${degree.v}.`,
      undefined,
      `nurbs.degree-mismatch — degree.u must be in [1, nU-1] = [1, ${nU - 1}], degree.v in [1, nV-1] = [1, ${nV - 1}].`,
    );
  }
}

export function createApi(ctx: ApiContext): KernelCadApi {
  const { session } = ctx;
  const api: KernelCadApi = {
    box(x, y, z, centered = false, opts) {
      assertEditableNumber('box', 'x', x);
      assertEditableNumber('box', 'y', y);
      assertEditableNumber('box', 'z', z);
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'box');
      return session.createShape({
        kind: 'box',
        params: { x: mm(x), y: mm(y), z: mm(z), centered: ul(centered ? 1 : 0) },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    cylinder(h, r, _segments, opts) {
      assertEditableNumber('cylinder', 'h', h);
      assertEditableNumber('cylinder', 'r', r);
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'cylinder');
      return session.createShape({
        kind: 'cylinder',
        params: { h: mm(h), r: mm(r) },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    sphere(r, opts) {
      assertEditableNumber('sphere', 'r', r);
      if (opts && 'faceLabels' in opts && opts.faceLabels !== undefined) {
        throw new KernelError(
          'feature.face-ref.not-applicable',
          'sphere does not support faceLabels (no canonical face names; query targets undefined). Use a different primitive if labels are needed.',
          'sphere',
          'Use a different primitive (box / cylinder / extrude / sketch-derived shape) when faceLabels are needed.',
        );
      }
      return session.createShape({
        kind: 'sphere',
        params: { r: mm(r) },
        inputs: {},
      });
    },
    torus(majorR, minorR, segments = 48) {
      if (!Number.isFinite(majorR) || !Number.isFinite(minorR)) {
        throw new KernelError(
          'feature.invalid-args',
          `torus: majorR (${majorR}) and minorR (${minorR}) must be finite numbers.`,
          'torus',
          'Pass numeric literals for majorR and minorR.',
        );
      }
      if (majorR <= 0 || minorR <= 0) {
        throw new KernelError(
          'feature.invalid-args',
          `torus: majorR (${majorR}) and minorR (${minorR}) must be > 0.`,
          'torus',
          'Pass positive numeric radii.',
        );
      }
      if (minorR >= majorR) {
        throw new KernelError(
          'feature.invalid-args',
          `torus: minorR (${minorR}) must be < majorR (${majorR}) to produce a non-self-intersecting torus (the profile circle would cross the rotation axis at minorR >= majorR).`,
          'torus',
          'Pick minorR < majorR. Typical: minorR ~= 0.2-0.4 × majorR for a chunky ring; minorR << majorR for a thin ring.',
        );
      }
      // Build the profile in the XY (sketch) plane as a polyline circle
      // centered at (majorR, 0). The session's revolve op rotates about
      // the Y axis of the sketch plane by default, which maps to world Z
      // after the standard XY sketch frame — producing a torus whose axis
      // is world Z.
      const profile = makePath(session).circle(majorR, 0, minorR, segments);
      return profile.revolve();
    },
    spring(opts) {
      const length = assertPositiveFinite('spring', 'length', opts?.length);
      const coilRadius = assertPositiveFinite('spring', 'coilRadius', opts?.coilRadius);
      const wireRadius = assertPositiveFinite('spring', 'wireRadius', opts?.wireRadius);
      const turns = assertPositiveFinite('spring', 'turns', opts?.turns);
      if (coilRadius <= wireRadius) {
        throw new KernelError(
          'feature.invalid-args',
          `spring: coilRadius (${coilRadius}) must be greater than wireRadius (${wireRadius}) so the spring has a visible coil centerline.`,
          'spring',
          'Pick coilRadius > wireRadius. Typical balance springs use wireRadius around 15-30% of coilRadius.',
        );
      }
      const axis = opts.axis ?? 'Z';
      if (axis !== 'X' && axis !== 'Y' && axis !== 'Z') {
        throw new KernelError(
          'feature.invalid-args',
          `spring: axis must be one of 'X', 'Y', or 'Z'; got ${formatScalarForError(axis)}.`,
          'spring',
          'Pass axis: "X", "Y", or "Z".',
        );
      }
      const pointsPerTurn = opts.pointsPerTurn ?? 24;
      if (!Number.isInteger(pointsPerTurn) || pointsPerTurn < 6) {
        throw new KernelError(
          'feature.invalid-args',
          `spring: pointsPerTurn must be an integer >= 6; got ${formatScalarForError(pointsPerTurn)}.`,
          'spring',
          'Use pointsPerTurn >= 6. Higher values smooth the coil at higher feature cost.',
        );
      }
      const cylinderSegments = opts.segments ?? 16;
      if (!Number.isInteger(cylinderSegments) || cylinderSegments < 6) {
        throw new KernelError(
          'feature.invalid-args',
          `spring: segments must be an integer >= 6; got ${formatScalarForError(cylinderSegments)}.`,
          'spring',
          'Use segments >= 6 for the circular wire cross-section.',
        );
      }
      const endStyle = opts.endStyle ?? 'open';
      if (endStyle !== 'open' && endStyle !== 'closed') {
        throw new KernelError(
          'feature.invalid-args',
          `spring: endStyle must be 'open' or 'closed'; got ${formatScalarForError(endStyle)}.`,
          'spring',
          'Use endStyle: "open" for bare wire ends or "closed" for short integral end bars.',
        );
      }

      const orient = (axial: number, radialA: number, radialB: number): [number, number, number] => {
        if (axis === 'X') return [axial, radialA, radialB];
        if (axis === 'Y') return [radialA, axial, radialB];
        return [radialA, radialB, axial];
      };

      const cylinderBetween = (p0: [number, number, number], p1: [number, number, number], r: number): Shape => {
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const dz = p1[2] - p0[2];
        const len = Math.hypot(dx, dy, dz);
        return api.cylinder(len, r, cylinderSegments)
          .alongAxis([dx, dy, dz])
          .translate(p0[0], p0[1], p0[2]);
      };

      const rail = helix({
        radius: coilRadius,
        pitch: length / turns,
        turns,
        axis,
        pointsPerTurn,
      });
      // spine: 'smooth' — the helix rail samples a smooth curve, so the
      // spine must be a single B-spline edge. A polyline spine makes OCCT
      // pipe-shell emit per-segment tubes that do not sew (open rings in
      // the export mesh) and distorts the coil. The smooth spine's default
      // orientation transport is well-defined on a helix; no frenet needed.
      let shape = makePath(session)
        .circle(0, 0, wireRadius, cylinderSegments)
        .sweep(rail, { spine: 'smooth' });
      if (endStyle === 'closed') {
        const barHalf = coilRadius + wireRadius;
        shape = shape
          .union(cylinderBetween(orient(0, -barHalf, 0), orient(0, barHalf, 0), wireRadius))
          .union(cylinderBetween(orient(length, -barHalf, 0), orient(length, barHalf, 0), wireRadius));
      }
      return shape;
    },
    extrudeRect(w, h, height, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          height: mm(height),
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    extrudeCircle(r, height, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'circle'", unit: 'unitless', evaluated: 0 },
          r: mm(r),
          height: mm(height),
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    extrudePolygon(points, depth, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'polygon'", unit: 'unitless', evaluated: 0 },
          depth: mm(depth),
        },
        metadata: { points, ...(faceLabels ? { faceLabels } : {}) },
      });
    },
    extrudeRoundedRect(width, height, radius, depth, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'rounded-rect'", unit: 'unitless', evaluated: 0 },
          width: mm(width), height: mm(height), radius: mm(radius), depth: mm(depth),
        },
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    union(...shapes) {
      if (shapes.length < 2) throw new Error('union() requires at least 2 shapes');
      const [first, ...rest] = shapes;
      return first.union(...rest);
    },
    assembly(name) {
      return makeAssembly(name, session);
    },
    param(name, defaultValue, meta) {
      // Prevent re-wrapping if the agent accidentally passes a ParamRef
      // (would otherwise silently shadow a previously declared name).
      if (isParamRef(defaultValue)) {
        throw new KernelError(
          'feature.invalid-args',
          `param('${name}'): defaultValue cannot be a ParamRef; pass a literal number or boolean.`,
          undefined,
          `invalid-args.param.invalid-default — param '${name}' default cannot itself be a ParamRef.`,
        );
      }
      const type = typeof defaultValue === 'boolean' ? 'boolean' : 'number';
      session.paramTable.declare(name, type, defaultValue, meta);
      return makeParamRef(name, type as 'number' | 'boolean') as ReturnType<KernelCadApi['param']>;
    },
    params(decl) {
      const out: Record<string, ParamRef<number | boolean>> = {};
      for (const [name, value] of Object.entries(decl)) {
        const type = typeof value === 'boolean' ? 'boolean' : 'number';
        session.paramTable.declare(name, type, value);
        out[name] = makeParamRef(name, type as 'number' | 'boolean');
      }
      return out as { [K in keyof typeof decl]: ParamRef<typeof decl[K]> };
    },
    path() {
      return makePath(session);
    },
    helix,
    selectEdges: async (shape, query = {}) => {
      const lowered = await shape.lower();
      return selectEdgesBackend(lowered, query);
    },
    selectEdge: async (shape, query) => {
      const lowered = await shape.lower();
      return selectEdgeBackend(lowered, query);
    },
    lib: {
      fromSTEP: (path) => libFromSTEP({ session, scriptDir: ctx.scriptDir }, path),
      findPart: (query, opts) => findPartHost(query, opts ?? {}),
      fetchPart: (idOrQuery, opts) =>
        fetchPartHost(
          { session, ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}) },
          idOrQuery,
          opts ?? {},
        ).then((r) => r.shape),
      standard: createStandardParts({
        session,
        ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}),
      }),
    },

    nurbsSurface(opts) {
      validateNurbsControls(opts.controls);
      validateNurbsDegree(opts.controls, opts.degree);
      if (opts.weights && !isRectangularGrid(opts.weights as unknown[][])) {
        throw new KernelError(
          'feature.nurbs.degenerate-controls',
          `nurbsSurface: weights grid must be the same rectangular shape as controls; got ${describeGridShape(opts.weights)}.`,
          undefined,
          'nurbs.degenerate-controls — weights grid must match controls shape.',
        );
      }
      return session.addNurbsSurface({
        kind: 'nurbsSurface',
        controls: opts.controls,
        weights: opts.weights,
        degree: opts.degree,
        knots: opts.knots,
        periodic: opts.periodic,
      });
    },

    surfaceFromCurves(sections) {
      if (!Array.isArray(sections) || sections.length < 2) {
        throw new KernelError(
          'feature.invalid-args',
          `surfaceFromCurves: need at least 2 sections; got ${sections?.length ?? 0}.`,
          undefined,
          'invalid-args.surfaceFromCurves.sections — pass at least 2 Sketch sections.',
        );
      }
      return session.addSurfaceFromCurves(sections.map(s => s.id));
    },

    nurbsCurve(controlPoints, opts) {
      const degree = opts?.degree ?? 3;
      return session.addCurve3D({
        metadata: {
          controlPoints,
          degree,
          ...(opts?.weights !== undefined ? { weights: opts.weights } : {}),
          ...(opts?.knots !== undefined ? { knots: opts.knots } : {}),
          closed: opts?.closed ?? false,
        },
      });
    },

    spline3d(points, opts) {
      // Catmull-Rom-to-cubic-Bezier conversion. The standard formula maps
      // four interpolation points (P0, P1, P2, P3) to four Bezier control
      // points (B0..B3) for the cubic segment connecting P1 and P2:
      //
      //   B0 = P1
      //   B1 = P1 + (P2 - P0) * (1 - τ) / 6
      //   B2 = P2 - (P3 - P1) * (1 - τ) / 6
      //   B3 = P2
      //
      // where τ ∈ [0, 1] is the tension (0 = standard Catmull-Rom, 1 =
      // straight-line; our default 0.5 is the canonical "centripetal" value).
      //
      // We then concatenate every Bezier segment into a single clamped
      // uniform cubic B-spline. For N input points we get (N - 1) segments
      // and (N - 1) * 3 + 1 control points (each adjacent pair of segments
      // shares one endpoint).
      //
      // Endpoint handling: we duplicate the first and last points (Phantom
      // Point approach) to define tangents at the ends — this preserves the
      // C1 property of Catmull-Rom interpolation at the boundary.
      if (!Array.isArray(points) || points.length < 2) {
        throw new KernelError(
          'feature.invalid-args',
          `spline3d: need at least 2 points; got ${points?.length ?? 0}.`,
          undefined,
          'invalid-args.spline3d.points — pass at least 2 Vec3 points to interpolate.',
        );
      }
      const tension = opts?.tension ?? 0.5;
      const scale = (1 - tension) / 6;

      // Extend with phantom endpoints (mirror across first/last actual point).
      const subt = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
      const scl = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

      const p0 = points[0];
      const pN = points[points.length - 1];
      const phantom0 = subt(p0, subt(points[1], p0));            // p0 - (p1 - p0)
      const phantomN = add(pN, subt(pN, points[points.length - 2])); // pN + (pN - p(N-1))
      const extended: Vec3[] = [phantom0, ...points, phantomN];

      // Build control net: every segment contributes 3 control points
      // (B0..B2); the final B3 of the last segment caps the net.
      const controlNet: Vec3[] = [];
      for (let i = 1; i < extended.length - 2; i++) {
        const P0 = extended[i - 1];
        const P1 = extended[i];
        const P2 = extended[i + 1];
        const P3 = extended[i + 2];
        const B0 = P1;
        const B1 = add(P1, scl(subt(P2, P0), scale));
        const B2 = subt(P2, scl(subt(P3, P1), scale));
        if (i === 1) controlNet.push(B0);
        // Each segment contributes B1, B2, and B3 (= P2). The next segment's
        // B0 IS this segment's B3, so we never push the shared endpoint twice.
        controlNet.push(B1, B2, P2);
      }

      return session.addCurve3D({
        metadata: {
          controlPoints: controlNet,
          degree: 3,
          closed: opts?.closed ?? false,
        },
      });
    },

    hermiteG2(a, b) {
      const controlPoints = solveHermiteG2(a, b);
      return session.addCurve3D({
        metadata: {
          controlPoints,
          degree: 5,
          closed: false,
        },
      });
    },

    variableSweep(spine, sections, opts) {
      // Resolve spine to a FeatureId. Accepts: Curve3D, Sketch, or Vec3[].
      let spineId: import('../shared/intent/types').FeatureId;
      if (Array.isArray(spine)) {
        // Auto-convert Vec3[] to a nurbsCurve.
        if (spine.length < 2) {
          throw new KernelError(
            'feature.invalid-args',
            `variableSweep: spine Vec3[] needs at least 2 points; got ${spine.length}.`,
            undefined,
            'invalid-args.variableSweep.spine — pass at least 2 points or a Curve3D.',
          );
        }
        const curve = session.addCurve3D({
          metadata: {
            controlPoints: spine,
            degree: Math.min(3, spine.length - 1),
            closed: false,
          },
        });
        spineId = curve.id;
      } else if (typeof spine === 'object' && spine !== null && 'sample' in spine) {
        // Curve3D
        spineId = (spine as Curve3D).id;
      } else if (typeof spine === 'object' && spine !== null && 'id' in spine) {
        // Sketch (handled by the lowerer via its lifted wire).
        spineId = (spine as Sketch).id;
      } else {
        throw new KernelError(
          'feature.invalid-args',
          `variableSweep: spine must be a Curve3D, Sketch, or Vec3[]; got ${typeof spine}.`,
          undefined,
          'invalid-args.variableSweep.spine — pass a Curve3D (nurbsCurve/spline3d), a Sketch (path().…close()), or a Vec3[].',
        );
      }

      if (!Array.isArray(sections) || sections.length < 2) {
        throw new KernelError(
          'feature.invalid-args',
          `variableSweep: need at least 2 sections; got ${sections?.length ?? 0}.`,
          undefined,
          'invalid-args.variableSweep.sections — pass at least 2 { t, profile } sections.',
        );
      }

      const sweepId = session.addVariableSweep({
        spineId,
        sections: sections.map((s) => ({ t: s.t, profileId: s.profile.id })),
        ...(opts?.closed !== undefined ? { closed: opts.closed } : {}),
        ...(opts?.continuity !== undefined ? { continuity: opts.continuity } : {}),
      });

      // Return a Shape proxy pointing at the new variableSweep record so
      // the agent can chain .fillet() / .union() / etc.
      return new Shape(sweepId, session);
    },

    surfaceFromBoundary(curves, opts) {
      // 1. Curve-count gate. Producing a SurfaceProxy here would force the
      //    caller into a wrong-arity contract, so we throw KernelError up
      //    front (matches the surfaceFromCurves pattern).
      if (!Array.isArray(curves) || curves.length < 4) {
        throw new KernelError(
          'feature.surface-from-boundary.too-few-curves',
          `surfaceFromBoundary: need 4 boundary curves; got ${curves?.length ?? 0}.`,
          undefined,
          'surface-from-boundary.too-few-curves — pass an array of 4 Curve3D refs in walk order (bottom, right, top, left).',
        );
      }
      if (curves.length > 4) {
        throw new KernelError(
          'feature.surface-from-boundary.too-many-curves',
          `surfaceFromBoundary: need exactly 4 boundary curves; got ${curves.length}.`,
          undefined,
          'surface-from-boundary.too-many-curves — if the loop has more than 4 sides, split the patch into adjacent quads.',
        );
      }
      // 2. Continuity normalisation: a single grade applies to all 4 edges;
      //    an array must be length 4.
      const contIn = opts?.continuity;
      let contArr: ['C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2'];
      if (contIn === undefined) {
        contArr = ['C0', 'C0', 'C0', 'C0'];
      } else if (Array.isArray(contIn)) {
        if (contIn.length !== 4) {
          throw new KernelError(
            'feature.invalid-args',
            `surfaceFromBoundary: continuity array must be length 4; got ${contIn.length}.`,
            undefined,
            'invalid-args.surfaceFromBoundary.continuity — pass a single grade or an array of 4 grades (one per edge).',
          );
        }
        contArr = [contIn[0], contIn[1], contIn[2], contIn[3]];
      } else {
        contArr = [contIn, contIn, contIn, contIn];
      }
      return session.addSurfaceFromBoundary({
        curveIds: [curves[0].id, curves[1].id, curves[2].id, curves[3].id],
        continuity: contArr,
        ...(opts?.sampling !== undefined ? { sampling: opts.sampling } : {}),
      });
    },

    sew(surfaces, opts) {
      if (!Array.isArray(surfaces) || surfaces.length < 1) {
        throw new KernelError(
          'feature.invalid-args',
          `sew: need at least 1 surface; got ${Array.isArray(surfaces) ? surfaces.length : String(surfaces)}.`,
          undefined,
          'invalid-args.sew.surfaces — pass an array of at least 1 Surface returned by nurbsSurface() / surfaceFromCurves() / surfaceFromBoundary().',
        );
      }
      const inputs: Record<string, import('../shared/intent/types').FeatureRef> = {};
      for (let i = 0; i < surfaces.length; i++) {
        inputs[`surface_${i}`] = { kind: 'surface', surfaceId: surfaces[i].id };
      }
      const tolerance = opts?.tolerance ?? 1e-6;
      const requireClosed = opts?.requireClosed ?? false;
      return session.createShape({
        kind: 'surfaceSew',
        inputs,
        params: {
          tolerance: { expression: String(tolerance), unit: 'mm', evaluated: tolerance },
        },
        metadata: { requireClosed },
      });
    },

    sketch: createSketchModule(session),
    fontPath,

    // Query DSL constructor namespace (Slice Q). Exposed both as a top-level
    // global `q` (via the sandbox spread in `runScript`/`isolation`) AND
    // namespaced under `kc.q` for SKILL.md prose continuity. The wiring
    // below routes calls to the existing constructors in
    // `src/kernel/naming/queryConstructors.ts`; consumer-side resolution
    // of a Query value (`hole(q.face(...), ...)`) is gated on Q7 — until
    // then, agents inspect with `q.face(...).evaluate(scene)` (see Q-S6).
    q: queryNamespace,

    sheetMetal(profile, opts) {
      // Capture-time validation. Evaluate Editable inputs once.
      const thicknessParam = mm(opts.thickness);
      const kFactorParam = ul(opts.kFactor);
      const tNum = thicknessParam.evaluated;
      const kNum = kFactorParam.evaluated;
      // Throws feature.invalid-args / feature.sheetMetal.kfactor-invalid.
      validateThickness(tNum);
      validateKFactor(kNum);
      const faceLabels = validateFaceLabels(opts.faceLabels, 'sheetMetal');
      return session.createShape({
        kind: 'sheetMetal',
        params: {
          thickness: thicknessParam,
          kFactor: kFactorParam,
        },
        inputs: { sketch: { kind: 'feature', id: profile.id } },
        // Sketch plane is captured so flattenPattern() can project back
        // without re-deriving. Slice-1 sketches lower on the XY plane.
        metadata: {
          sketchPlane: 'xy',
          ...(faceLabels ? { faceLabels } : {}),
        },
      });
    },

    sdf: {
      sphere: sdfSphere,
      box: sdfBox,
      cylinder: sdfCylinder,
      torus: sdfTorus,
      smoothBlend: sdfSmoothBlend,
      materialize: (field, opts) => sdfMaterialize({ session }, field, opts),
      bind: (name, field) => {
        if (typeof name !== 'string' || name.length === 0) {
          throw new KernelError(
            'feature.invalid-args',
            `sdf.bind: name must be a non-empty string; got ${JSON.stringify(name)}.`,
            undefined,
            'invalid-args.sdf.bind.name — pass a non-empty string identifier.',
          );
        }
        session.sdfFields.set(name, field);
      },
    },

    referenceImage(path, opts) {
      const id = session.addReferenceImage({ path, ...opts });
      const record = session.getRecords().find(r => r.id === id)!;
      // Cast metadata — ReferenceImageMetadata is stored under the [key: string]: unknown
      // index signature of FeatureMetadata, so we re-surface it with proper typing here.
      const metadata = record.metadata as unknown as import('../shared/intent/referenceImageRecord').ReferenceImageMetadata;
      return { id, metadata };
    },

    setRenderEnvironment(spec) {
      const id = session.addRenderEnvironment(spec);
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/renderEnvironmentRecord').RenderEnvironmentMetadata;
      return { id, metadata };
    },

    setCameraTarget(x, y, z) {
      const id = session.addCameraTarget({ x, y, z });
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/cameraTargetRecord').CameraTargetMetadata;
      return { id, metadata };
    },

    setCameraDistance(distance) {
      // Inherit the most recently captured camera target (last-wins ordering
      // matches what the renderer applies). When no setCameraTarget call
      // has happened yet, default to the world origin — the renderer will
      // still respect the distance override and orbit the pose around (0,
      // 0, 0).
      const records = session.getRecords();
      let target: [number, number, number] = [0, 0, 0];
      for (const r of records) {
        if (r.kind !== 'cameraTarget') continue;
        const meta = r.metadata as unknown as import('../shared/intent/cameraTargetRecord').CameraTargetMetadata;
        if (Array.isArray(meta.target) && meta.target.length === 3) {
          target = [meta.target[0], meta.target[1], meta.target[2]];
        }
      }
      const id = session.addCameraTarget({ x: target[0], y: target[1], z: target[2], distance });
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/cameraTargetRecord').CameraTargetMetadata;
      return { id, metadata };
    },

    animationView(spec) {
      const id = session.addAnimationView(spec);
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/animationViewRecord').AnimationViewMetadata;
      return { id, metadata };
    },

    dfmSpec(spec) {
      const id = session.addDfmSpec(spec);
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/dfmSpecRecord').DfmSpecMetadata;
      return { id, metadata };
    },

    kinematic: kinematic satisfies KinematicFacade,

    // joint.* is bound below after the api object is fully constructed, so
    // the namespace closes over the FINAL `api` (including box/cylinder/etc.).
    joint: undefined as unknown as KernelCadApi['joint'],
  };
  // G1 — bind joint.* after the api object exists, so the namespace can
  // compose shapes through the same captured-session pipeline as user
  // scripts (box / cylinder / extrudeRoundedRect / union / subtract).
  api.joint = makeJointNamespace(api);
  return api;
}

// V slice — re-export the Curve3D analytics types so downstream consumers
// (skill snippets, eval harnesses, MCP tool wrappers) can pull them from
// the single public-API module rather than reaching into capture/.
export type {
  Curve3D,
  Curve3DAnalytics,
  CurveLengthSample,
  CurveCurveIntersection,
  CurveSurfaceIntersection,
} from './capture/curveProxy';
