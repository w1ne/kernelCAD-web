// src/kernel/backends/verb/verb-nurbs.d.ts
//
// Hand-rolled TypeScript declarations for the vendored JS NURBS analytics
// module at vendor/verb-nurbs/build/verb.es.js. Upstream ships no .d.ts;
// regenerate this file when the vendored snapshot is bumped.
//
// The upstream module is published as a default export (`export { verb$1 as
// default };`). The bridge always imports as `import nurbsJs from 'verb-nurbs'`
// and reaches through the namespace tree (`nurbsJs.geom.NurbsCurve`,
// `nurbsJs.eval.Make`, etc.).
//
// Internal-only — never re-exported across the kernel boundary.

declare module 'verb-nurbs' {
  export type Point = [number, number, number];
  export type Vector = [number, number, number];
  export type KnotArray = number[];

  export interface NurbsCurveData {
    degree: number;
    knots: KnotArray;
    /** Homogeneous control points: [x, y, z, w] per row. */
    controlPoints: number[][];
  }

  export interface CurveLengthSample {
    /** Parameter on the curve's intrinsic `[u0, u1]` knot range. */
    u: number;
    /**
     * Accumulated arc length from the curve start. The JS module does NOT
     * include a point field — call `point(u)` (or `pointAt(t)` after
     * normalisation) to materialise the world-space coordinate. The Curve3D
     * analytics proxy does this expansion when it returns its public
     * `CurveLengthSample` (which adds the `pt` field).
     */
    len: number;
  }

  /**
   * Runtime shape of `verb.core.CurveCurveIntersection` (verb.es.js line
   * 2615): `{ point0, point1, u0, u1 }`. `u0` is the parameter on the FIRST
   * operand of `Intersect.curves(first, second, tol)`; `u1` on the second.
   */
  export interface CurveCurveIntersection {
    u0: number;
    u1: number;
    point0: Point;
    point1: Point;
  }

  /**
   * Runtime shape of `verb.core.CurveSurfaceIntersection` (verb.es.js line
   * 2626): `{ u, uv, curvePoint, surfacePoint }`. `uv` is a flat 2-element
   * array `[u, v]`, NOT a `{ u, v }` object — see verb.es.js line 5869
   * where it is constructed as `[sol_sol[1], sol_sol[2]]`. The proxy
   * normalises this into the public `{ uv: { u, v } }` record shape.
   */
  export interface CurveSurfaceIntersection {
    u: number;
    uv: [number, number];
    curvePoint: Point;
    surfacePoint: Point;
  }

  export interface NurbsCurve {
    asNurbs(): NurbsCurveData;
    degree(): number;
    knots(): KnotArray;
    controlPoints(): Point[];
    weights(): number[];
    point(u: number): Point;
    tangent(u: number): Vector;
    derivatives(u: number, numDerivs?: number): Vector[];
    closestPoint(pt: Point): Point;
    closestParam(pt: Point): number;
    length(): number;
    lengthAtParam(u: number): number;
    paramAtLength(len: number, tolerance?: number): number;
    divideByEqualArcLength(divisions: number): CurveLengthSample[];
    divideByArcLength(arcLength: number): CurveLengthSample[];
    tessellate(tolerance?: number): Point[];
  }

  export interface NurbsCurveCtor {
    new (data: NurbsCurveData): NurbsCurve;
    byKnotsControlPointsWeights(
      degree: number,
      knots: KnotArray,
      controlPoints: Point[],
      weights?: number[],
    ): NurbsCurve;
    byPoints(points: Point[], degree?: number): NurbsCurve;
  }

  export interface NurbsSurface {
    point(u: number, v: number): Point;
    normal(u: number, v: number): Vector;
    asNurbs(): unknown;
  }

  export interface NurbsSurfaceCtor {
    byKnotsControlPointsWeights(
      degreeU: number,
      degreeV: number,
      knotsU: KnotArray,
      knotsV: KnotArray,
      controlPoints: Point[][],
      weights?: number[][],
    ): NurbsSurface;
    byCorners(
      p0: Point,
      p1: Point,
      p2: Point,
      p3: Point,
    ): NurbsSurface;
  }

  export interface IntersectNamespace {
    curves(
      first: NurbsCurve,
      second: NurbsCurve,
      tol?: number,
    ): CurveCurveIntersection[];
    curveAndSurface(
      curve: NurbsCurve,
      surface: NurbsSurface,
      tol?: number,
    ): CurveSurfaceIntersection[];
  }

  export interface MakeNamespace {
    rationalInterpCurve(
      points: number[][],
      degree?: number,
      homogeneousPoints?: boolean,
      startTangent?: Point,
      endTangent?: Point,
    ): NurbsCurveData;
  }

  export interface EvalNamespace {
    Make: MakeNamespace;
  }

  export interface GeomNamespace {
    NurbsCurve: NurbsCurveCtor;
    NurbsSurface: NurbsSurfaceCtor;
    Intersect: IntersectNamespace;
  }

  export interface NurbsModule {
    geom: GeomNamespace;
    eval: EvalNamespace;
    TOLERANCE: number;
    EPSILON: number;
    VERSION: string;
  }

  const mod: NurbsModule;
  export default mod;
}
