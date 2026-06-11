// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC } from 'replicad';
import type { CaptureSession } from '../../capture/captureSession';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';
import type { FeatureId } from '../../../shared/intent/types';
import { lowerCurve3D } from './curve3dLowerer';

/**
 * Synchronous JS-evaluable view of a `curve3d` feature.
 *
 * Returned by `lazyEvalCurve` and consumed by `Curve3DProxy.{sample,pointAt,
 * tangentAt,length}`. The evaluator wraps a `BRepAdaptor_Curve` built from
 * the `TopoDS_Edge` that `lowerCurve3D` produced; parameter `t ∈ [0, 1]` is
 * mapped onto OCCT's native `[FirstParameter(), LastParameter()]` range.
 */
export interface Curve3DEvaluator {
  /** Sample `n + 1` evenly-spaced points along the curve in `[0, 1]`. */
  sample(n: number): [number, number, number][];
  /** Point on the curve at parameter `t ∈ [0, 1]` (clamped). */
  pointAt(t: number): [number, number, number];
  /** Unit tangent vector at parameter `t ∈ [0, 1]` (clamped). */
  tangentAt(t: number): [number, number, number];
  /** Total arc length in mm (via `BRepGProp::LinearProperties`). */
  length(): number;
}

/**
 * Per-session cache. Each `CaptureSession` gets at most one `Map<FeatureId,
 * Curve3DEvaluator>`; sessions garbage-collected by their owners drop the
 * cache with them. The cache keys on the feature id so repeated calls
 * (`.sample()`, `.tangentAt(t)`) reuse the same `BRepAdaptor_Curve`.
 */
const sessionCaches: WeakMap<CaptureSession, Map<FeatureId, Curve3DEvaluator>> = new WeakMap();

/**
 * Build (or fetch from cache) a synchronous evaluator for a `curve3d`
 * feature. Materializes the OCCT edge on first call:
 *  - if `session.importedGeometry` already holds an edge for `id` (the main
 *    lowerer parks it there when it visits the record), reuse that edge.
 *  - otherwise lower the metadata via `lowerCurve3D` and park the result so
 *    the main lowerer's downstream consumers (variableSweep) see it too.
 *
 * `initOcct()` must have been awaited before any method on the returned
 * evaluator runs; the constructor calls `getOC()` which throws otherwise.
 */
export function lazyEvalCurve(
  session: CaptureSession,
  id: FeatureId,
  metadata: Curve3DMetadata,
): Curve3DEvaluator {
  let bucket = sessionCaches.get(session);
  if (!bucket) {
    bucket = new Map();
    sessionCaches.set(session, bucket);
  }
  const cached = bucket.get(id);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  // Pull the edge from the lowerer's parking slot if it has already run.
  // Otherwise lower the curve now and park the result so downstream
  // consumers (the variableSweep lowerer, surfaceFromBoundary in the next
  // slice) reuse the same edge instead of re-lowering.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let edge: any = session.importedGeometry.get(id);
  if (!edge) {
    edge = lowerCurve3D(metadata).edge;
    // The map is typed as ShapeBackend; curve3d stores a TopoDS_Edge in the
    // same slot — see the curve3d arm of OcctLowerer.lower for context.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session.importedGeometry.set(id, edge as any);
  }

  const adaptor = new oc.BRepAdaptor_Curve_2(edge);
  const u0 = adaptor.FirstParameter();
  const u1 = adaptor.LastParameter();

  const paramAt = (t: number): number => {
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    return u0 + clamped * (u1 - u0);
  };

  const evalPoint = (t: number): [number, number, number] => {
    const p = new oc.gp_Pnt_1();
    adaptor.D0(paramAt(t), p);
    return [p.X(), p.Y(), p.Z()];
  };

  const evalTangent = (t: number): [number, number, number] => {
    const p = new oc.gp_Pnt_1();
    const v = new oc.gp_Vec_1();
    adaptor.D1(paramAt(t), p, v);
    const mag = v.Magnitude();
    if (mag === 0) return [0, 0, 0];
    return [v.X() / mag, v.Y() / mag, v.Z() / mag];
  };

  const evaluator: Curve3DEvaluator = {
    sample(n: number): [number, number, number][] {
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`curve3d.sample(n): n must be a positive integer; got ${n}.`);
      }
      const out: [number, number, number][] = [];
      for (let i = 0; i <= n; i++) {
        out.push(evalPoint(i / n));
      }
      return out;
    },
    pointAt(t: number) {
      return evalPoint(t);
    },
    tangentAt(t: number) {
      return evalTangent(t);
    },
    length(): number {
      const props = new oc.GProp_GProps_1();
      oc.BRepGProp.LinearProperties(edge, props, false, false);
      return props.Mass();
    },
  };

  bucket.set(id, evaluator);
  return evaluator;
}
