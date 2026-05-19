import type { CaptureSession } from './capture/captureSession';
import { validateFaceLabels } from './capture/faceLabels';
import { makeAssembly, type Assembly } from './capture/assembly';
import { Shape } from './capture/proxy';
import { Sketch, makePath, type PathBuilder } from './capture/sketch';
import type { SurfaceProxy } from './capture/surfaceProxy';
import type { Curve3D } from './capture/curveProxy';
import type { Param, Vec3, PlaneSpec } from '../shared/intent/types';
import {
  selectEdges as selectEdgesBackend,
  selectEdge as selectEdgeBackend,
  type EdgeQuery,
  type EdgeSegment,
} from '../kernel/backends/occt/edgeQueries';
import type { ReferenceImageHandle, ReferenceImageScale } from '../shared/intent/referenceImageRecord';
import type {
  RenderEnvironmentHandle,
  RenderEnvironmentMetadata,
  RenderEnvironmentSpec,
} from '../shared/intent/renderEnvironmentRecord';
import { helix, type RailPoint, type HelixOptions } from './helix';
import { solveHermiteG2, type HermiteEndpoint } from './capture/hermiteG2';
import { createSketchModule, type SketchModule } from './sketch/index';
import { fontPath, type FontPath } from '../shared/fonts/index';
import { fromSTEP as libFromSTEP } from './parts/fromSTEP';
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

export interface ApiContext {
  session: CaptureSession;
  /** Absolute directory of the calling `.kcad.ts` script. Used by
   *  `lib.fromSTEP(path)` to resolve relative STEP paths. */
  scriptDir?: string;
}

export interface PartsLib {
  fromSTEP(path: string): Promise<Shape>;
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
   * Slice-1 limitation: `weights` is accepted but silently degraded to
   * non-rational (the underlying OCCT `TColStd_Array2OfReal` binding isn't
   * exposed in `replicad-opencascadejs`). See decision doc 2026-05-14.
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
   * NURBS Slice C: build a Coons-patch surface filling the interior of 4
   * boundary curves. The 4 curves form an ordered loop:
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
}

const mm = (n: Editable<number>): Param => toParam(n, 'mm');
const ul = (n: Editable<number>): Param => toParam(n, 'unitless');

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
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'box');
      return session.createShape({
        kind: 'box',
        params: { x: mm(x), y: mm(y), z: mm(z), centered: ul(centered ? 1 : 0) },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    cylinder(h, r, _segments, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'cylinder');
      return session.createShape({
        kind: 'cylinder',
        params: { h: mm(h), r: mm(r) },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    sphere(r, opts) {
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

    sketch: createSketchModule(session),
    fontPath,

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
      const metadata = record.metadata as unknown as RenderEnvironmentMetadata;
      return { id, metadata };
    },
  };
  return api;
}
