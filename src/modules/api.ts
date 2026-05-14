import type { CaptureSession } from '../capture/captureSession';
import { validateFaceLabels } from '../capture/faceLabels';
import { makeAssembly, type Assembly } from '../capture/assembly';
import { Shape } from '../capture/proxy';
import { Sketch, makePath, type PathBuilder } from '../capture/sketch';
import type { SurfaceProxy } from '../capture/surfaceProxy';
import type { Param, Vec3 } from '../intent/types';
import {
  selectEdges as selectEdgesBackend,
  selectEdge as selectEdgeBackend,
  type EdgeQuery,
  type EdgeSegment,
} from '../backends/occt/edgeQueries';
import { helix, type RailPoint, type HelixOptions } from './helix';
import { fromSTEP as libFromSTEP } from '../lib/parts/fromSTEP';
import { KernelError } from '../intent/kernelError';
import type { FaceLabelsMap } from '../intent/featureRecord';
import { makeParamRef, isParamRef, type ParamRef, type Editable } from '../runtime/paramRef';
import type { ParamMetadata } from '../runtime/paramTable';
import { toParam } from '../runtime/editableHelpers';

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

export interface KernelCadApi {
  box(x: Editable<number>, y: Editable<number>, z: Editable<number>, centered?: boolean, opts?: FaceLabelOpts): Shape;
  cylinder(h: Editable<number>, r: Editable<number>, segments?: number, opts?: FaceLabelOpts): Shape;
  sphere(r: Editable<number>, opts?: FaceLabelOpts): Shape;
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
  };
  return api;
}
