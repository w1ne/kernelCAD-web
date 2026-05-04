import type { CaptureSession } from '../capture/captureSession';
import { validateFaceLabels } from '../capture/faceLabels';
import { Shape } from '../capture/proxy';
import { makePath, type PathBuilder } from '../capture/sketch';
import type { ParamRegistry, ParamOptions } from '../compute/paramRegistry';
import type { Param } from '../intent/types';
import {
  selectEdges as selectEdgesBackend,
  selectEdge as selectEdgeBackend,
  type EdgeQuery,
  type EdgeSegment,
} from '../backends/occt/edgeQueries';
import { helix, type RailPoint, type HelixOptions } from './helix';
import { KernelError } from '../intent/kernelError';
import type { FaceLabelsMap } from '../intent/featureRecord';

export interface ApiContext {
  session: CaptureSession;
  params: ParamRegistry;
}

export interface FaceLabelOpts {
  faceLabels?: FaceLabelsMap;
}

export interface KernelCadApi {
  box(x: number, y: number, z: number, centered?: boolean, opts?: FaceLabelOpts): Shape;
  cylinder(h: number, r: number, segments?: number, opts?: FaceLabelOpts): Shape;
  sphere(r: number, opts?: FaceLabelOpts): Shape;
  extrudeRect(w: number, h: number, height: number, opts?: FaceLabelOpts): Shape;
  extrudeCircle(r: number, height: number, opts?: FaceLabelOpts): Shape;
  extrudePolygon(points: [number, number][], depth: number, opts?: FaceLabelOpts): Shape;
  extrudeRoundedRect(width: number, height: number, radius: number, depth: number, opts?: FaceLabelOpts): Shape;
  revolveRect(w: number, h: number, offsetX: number, angleDeg?: number, opts?: FaceLabelOpts): Shape;
  union(...shapes: Shape[]): Shape;
  param(name: string, defaultExpr: number | string, opts: ParamOptions): number;
  path(): PathBuilder;
  helix(opts: HelixOptions): RailPoint[];
  selectEdges(shape: Shape, query?: EdgeQuery): Promise<EdgeSegment[]>;
  selectEdge(shape: Shape, query: EdgeQuery): Promise<EdgeSegment>;
}

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });
const deg = (n: number): Param => ({ expression: String(n), unit: 'deg', evaluated: n });

export function createApi(ctx: ApiContext): KernelCadApi {
  const { session, params } = ctx;
  return {
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
          depth: { expression: String(depth), unit: 'mm', evaluated: depth },
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
          width: { expression: String(width), unit: 'mm', evaluated: width },
          height: { expression: String(height), unit: 'mm', evaluated: height },
          radius: { expression: String(radius), unit: 'mm', evaluated: radius },
          depth: { expression: String(depth), unit: 'mm', evaluated: depth },
        },
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    revolveRect(w, h, offsetX, angleDeg = 360, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'revolve');
      return session.createShape({
        kind: 'revolve',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          offsetX: mm(offsetX),
          angleDeg: deg(angleDeg),
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    union(...shapes) {
      if (shapes.length < 2) throw new Error('union() requires at least 2 shapes');
      const [first, ...rest] = shapes;
      return first.union(...rest);
    },
    param(name, defaultExpr, opts) {
      const exprStr = typeof defaultExpr === 'number' ? String(defaultExpr) : defaultExpr;
      params.register(name, exprStr, opts);
      return params.get(name).evaluated;
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
  };
}
