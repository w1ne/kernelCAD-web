// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { makeAssembly, type Assembly } from './capture/assembly';
import { Shape } from './capture/proxy';
import type { Sketch, PathBuilder } from './capture/sketch';
import type { SurfaceProxy } from './capture/surfaceProxy';
import type { Curve3D } from './capture/curveProxy';
import type { Vec3, PlaneSpec } from '../shared/intent/types';
import type {
  EdgeQuery,
  EdgeSegment,
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
import type { RailPoint } from './helix';
import type { HermiteEndpoint } from '../kernel/geometry/hermiteG2';
import type { SketchModule } from './sketch/index';
import type { FontPath } from '../shared/fonts/fontPath';
import type { FromSTLOptions } from './parts/fromMeshFormats';
import type { FetchPartOpts } from './parts/fetchPart';
import type { FindPartOpts, FindPartResult } from './parts/findPart';
import type { StandardParts } from './parts/standardParts';
import type { FromDXFOptions, FromSVGOptions } from './parts/fromVectorFormats';
import type { ShapeList } from './selection/shapeList';
import type { MaterializeOpts } from './sdf/materialize';
import type { SdfField } from './sdf/index';
import type { FaceLabelsMap } from '../shared/intent/featureRecord';
import type { ParamRef, TypedParamRef, Editable } from '../shared/runtime/paramRef';
import type { ParamMetadata } from '../shared/runtime/paramTable';
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
import { makePrimitiveMethods, makeSpringMethod, makeExtrudeMethods } from './apiShapeMethods';
import { makeParamMethods } from './apiParamMethods';
import { makePartsLib } from './apiPartsLib';
import { makeNurbsSurfaceMethods, makeCurveMethods, makeSweepMethods } from './apiSurfaceMethods';
import { makeModuleNamespaces } from './apiModuleNamespaces';
import { makeCaptureMethods } from './apiCaptureMethods';

export interface ApiContext {
  session: CaptureSession;
  /** Absolute directory of the calling `.kcad.ts` script. Used by
   *  `lib.fromSTEP(path)` to resolve relative STEP paths. */
  scriptDir?: string;
}

export interface PartsLib {
  fromSTEP(path: string): Promise<Shape>;
  /**
   * Import an OCCT native BREP file. Exact analytic surfaces + full topology
   * (no schema translation, no tessellation) — the result is a true B-rep
   * body, so fillet/chamfer/shell/face-queries are all valid on it.
   */
  fromBREP(path: string): Promise<Shape>;
  /**
   * Import an STL mesh (ASCII or binary). The triangles are sewn back into
   * topology and promoted to a solid when they close, so booleans, volume,
   * bbox and export work — but the faces stay planar facets, so operations
   * that need analytic surfaces (fillet on a "curved" edge, canonical face
   * refs, hole detection) will not behave as they do on STEP/BREP input.
   * Prefer `fromSTEP`/`fromBREP` when the source is available.
   *
   * A non-watertight mesh is refused unless `opts.allowOpen` is set.
   */
  fromSTL(path: string, opts?: FromSTLOptions): Promise<Shape>;
  /**
   * Import a 2D DXF drawing as closed profiles.
   *
   * Returns `Sketch[]` ALWAYS — largest enclosed area first — because a
   * drawing routinely holds an outline plus its holes, and nothing in the
   * file says which loop is which. Chain `.extrude(d)` on the one you want:
   * `const [outline, ...holes] = await lib.fromDXF('plate.dxf')`.
   *
   * Reads LINE, ARC, CIRCLE, LWPOLYLINE, POLYLINE. SPLINE/ELLIPSE/INSERT are
   * refused with a diagnostic naming the entity and line number rather than
   * dropped. `$INSUNITS` sets the scale; absent or Unitless means mm.
   */
  fromDXF(path: string, opts?: FromDXFOptions): Promise<Sketch[]>;
  /**
   * Import an SVG drawing as closed profiles. Same `Sketch[]` contract as
   * `fromDXF`.
   *
   * SVG's Y axis points down and is reflected about the viewBox top so the
   * profile lands upright in positive Y. Scale comes from `viewBox` plus a
   * physically-dimensioned `width`; without one a user unit is a CSS pixel
   * (1/96 in). Béziers and true ellipses are chord-approximated within
   * `opts.curveTolerance` mm; lines and circular arcs are exact.
   */
  fromSVG(path: string, opts?: FromSVGOptions): Promise<Sketch[]>;
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
  extrudePolygon(points: Array<[Editable<number>, Editable<number>]>, depth: Editable<number>, opts?: FaceLabelOpts): Shape;
  extrudeRoundedRect(width: Editable<number>, height: Editable<number>, radius: Editable<number>, depth: Editable<number>, opts?: FaceLabelOpts): Shape;
  union(...shapes: Shape[]): Shape;
  assembly(name?: string): Assembly;

  // Slice-3 symbolic params (replaces slice-1's number-returning param()).
  // See spec §E.1, §E.2. Numeric and boolean params return a ParamRef with
  // symbolic AST arithmetic (numbers only). A choice param (defaultValue is
  // a string AND `meta.choices` is given) or a plain string param (no
  // `choices`) returns a TypedParamRef instead: `.value` reads the current
  // value eagerly — see spec 2026-09-14-typed-script-params-design.md §2 for
  // why choice/string don't propagate symbolically.
  param(name: string, defaultValue: number, meta?: ParamMetadata): ParamRef<number>;
  param(name: string, defaultValue: boolean, meta?: ParamMetadata): ParamRef<boolean>;
  param<C extends string>(
    name: string,
    defaultValue: C,
    meta: ParamMetadata & { choices: readonly C[] },
  ): TypedParamRef<C>;
  param(name: string, defaultValue: string, meta?: ParamMetadata): TypedParamRef<string>;
  params<R extends Record<string, number | boolean>>(decl: R): { [K in keyof R]: ParamRef<R[K]> };

  path(): PathBuilder;
  /**
   * Helix rail for `Sketch.sweep`. `radius`, `pitch`, `turns` and `startAngle`
   * accept ParamRefs: the points are sampled from the current values and the
   * rail remembers the symbolic dimensions, so a sweep along it follows param
   * changes, and `sweep(rail, { spine: 'helix' })` can build the exact helix.
   */
  helix(opts: EditableHelixOptions): RailPoint[];
  /**
   * Pre-select edges by EdgeQuery. Returns a `ShapeList` — still an
   * `EdgeSegment[]` everywhere one is expected, plus the selector algebra
   * (`sortBy` / `groupBy` / `filterBy` / `filterByPosition` / `sortByDistance`
   * and the `first` / `last` / `at` / `take` accessors).
   */
  selectEdges(shape: Shape, query?: EdgeQuery): Promise<ShapeList<EdgeSegment>>;
  selectEdge(shape: Shape, query: EdgeQuery): Promise<EdgeSegment>;
  /**
   * Wrap any array of topology query results in a `ShapeList` so the selector
   * algebra applies — face summaries, `Query.evaluate(scene)` results, or a
   * hand-assembled list. `selectEdges` already returns one.
   */
  select<T>(items: Iterable<T>): ShapeList<T>;

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
   * Infer end frames from two Curve3Ds and emit a degree-5 Hermite blend.
   * Same geometry as `a.bridge(b, opts)`.
   */
  curveBridge(
    a: Curve3D,
    b: Curve3D,
    opts: { continuity: 'G1' | 'G2'; ends?: 'end-start' | 'end-end' | 'start-start' | 'start-end'; tension?: number },
  ): Curve3D;

  /**
   * Exact surface–surface (or face–face) intersection via OCCT
   * `BRepAlgoAPI_Section`. Returns one Curve3D per section edge.
   */
  surfaceIntersection(
    a: Shape | SurfaceProxy,
    b: Shape | SurfaceProxy,
  ): Promise<Curve3D[]>;

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
   * `process: 'fdm'` adds the FDM printability check (overhangs and
   * bridges relative to `buildDirection`, walls and features relative to
   * `nozzleMm`, bed contact, bed fit on `printer`, and the six-orientation
   * ranking); the gcode export slices in the declared `buildDirection`.
   *
   * At least one of `minWall`, `minClearance`, `channels`, or `process` is
   * required.
   * `includeArticulatedMates: true` also measures non-fastened mate pairs at
   * the declared rest pose; fastened mates stay exempt because their contact
   * is checked separately.
   * Malformed declarations THROW `KernelError` (`feature.invalid-args`)
   * rather than stashing diagnostics — dfmSpec is an enforcement gate, and
   * a silently-disabled gate is worse than a build failure.
   *
   * Multiple calls register multiple records; the last record wins (same
   * convention as `setRenderEnvironment`).
   */
  dfmSpec(spec: DfmSpec): DfmSpecHandle;

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

/** `helix()` options as scripts pass them: dimensions may be ParamRefs. */
export interface EditableHelixOptions {
  radius: Editable<number>;
  pitch: Editable<number>;
  turns: Editable<number>;
  axis?: 'X' | 'Y' | 'Z';
  pointsPerTurn?: number;
  startAngle?: Editable<number>;
}

export function createApi(ctx: ApiContext): KernelCadApi {
  const { session } = ctx;
  const api: KernelCadApi = {
    ...makePrimitiveMethods(session),
    spring: makeSpringMethod(session, () => api),
    ...makeExtrudeMethods(session),
    assembly(name) {
      return makeAssembly(name, session);
    },
    ...makeParamMethods(session),
    ...makePartsLib(ctx),
    ...makeNurbsSurfaceMethods(session),
    ...makeCurveMethods(session),
    ...makeSweepMethods(session),
    ...makeModuleNamespaces(session),
    ...makeCaptureMethods(session),

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
