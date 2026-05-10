import type { CaptureSession } from '../capture/captureSession';
import { validateFaceLabels } from '../capture/faceLabels';
import { makeAssembly, type Assembly } from '../capture/assembly';
import { Shape } from '../capture/proxy';
import { makePath, type PathBuilder } from '../capture/sketch';
import type { Param } from '../intent/types';
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
}

const mm = (n: Editable<number>): Param => toParam(n, 'mm');
const ul = (n: Editable<number>): Param => toParam(n, 'unitless');

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
  };
  return api;
}
