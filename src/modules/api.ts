import type { CaptureSession } from '../capture/captureSession';
import { Shape } from '../capture/proxy';
import { makePath, type PathBuilder } from '../capture/sketch';
import type { ParamRegistry, ParamOptions } from '../compute/paramRegistry';
import type { Param } from '../intent/types';

export interface ApiContext {
  session: CaptureSession;
  params: ParamRegistry;
}

export interface KernelCadApi {
  box(x: number, y: number, z: number, centered?: boolean): Shape;
  cylinder(h: number, r: number, segments?: number): Shape;
  sphere(r: number): Shape;
  extrudeRect(w: number, h: number, height: number): Shape;
  extrudeCircle(r: number, height: number): Shape;
  extrudePolygon(points: [number, number][], depth: number): Shape;
  extrudeRoundedRect(width: number, height: number, radius: number, depth: number): Shape;
  revolveRect(w: number, h: number, offsetX: number, angleDeg?: number): Shape;
  union(...shapes: Shape[]): Shape;
  param(name: string, defaultExpr: number | string, opts: ParamOptions): number;
  path(): PathBuilder;
}

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const ul = (n: number): Param => ({ expression: String(n), unit: 'unitless', evaluated: n });
const deg = (n: number): Param => ({ expression: String(n), unit: 'deg', evaluated: n });

export function createApi(ctx: ApiContext): KernelCadApi {
  const { session, params } = ctx;
  return {
    box(x, y, z, centered = false) {
      return session.createShape({
        kind: 'box',
        params: { x: mm(x), y: mm(y), z: mm(z), centered: ul(centered ? 1 : 0) },
        inputs: {},
      });
    },
    cylinder(h, r) {
      return session.createShape({
        kind: 'cylinder',
        params: { h: mm(h), r: mm(r) },
        inputs: {},
      });
    },
    sphere(r) {
      return session.createShape({
        kind: 'sphere',
        params: { r: mm(r) },
        inputs: {},
      });
    },
    extrudeRect(w, h, height) {
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          height: mm(height),
        },
        inputs: {},
      });
    },
    extrudeCircle(r, height) {
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'circle'", unit: 'unitless', evaluated: 0 },
          r: mm(r),
          height: mm(height),
        },
        inputs: {},
      });
    },
    extrudePolygon(points, depth) {
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'polygon'", unit: 'unitless', evaluated: 0 },
          depth: { expression: String(depth), unit: 'mm', evaluated: depth },
        },
        metadata: { points },
      });
    },
    extrudeRoundedRect(width, height, radius, depth) {
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
      });
    },
    revolveRect(w, h, offsetX, angleDeg = 360) {
      return session.createShape({
        kind: 'revolve',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          offsetX: mm(offsetX),
          angleDeg: deg(angleDeg),
        },
        inputs: {},
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
  };
}
