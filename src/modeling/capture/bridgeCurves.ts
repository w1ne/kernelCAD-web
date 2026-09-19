// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { solveHermiteG2 } from '../../kernel/geometry/hermiteG2';
import type { Curve3D, Curve3DProxy } from './curveProxy';
import type { CaptureSession } from './captureSession';

export type BridgeEnds = 'end-start' | 'end-end' | 'start-start' | 'start-end';
export type BridgeContinuity = 'G1' | 'G2';

export interface BridgeCurvesOpts {
  continuity: BridgeContinuity;
  ends?: BridgeEnds;
  tension?: number;
}

function hypot3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k];
}

function isCurve3D(x: unknown): x is Curve3D {
  return (
    typeof x === 'object' &&
    x !== null &&
    'pointAt' in x &&
    'analytics' in x &&
    typeof (x as Curve3D).pointAt === 'function'
  );
}

/**
 * Infer endpoint frames from two Curve3Ds and emit a degree-5 Hermite
 * blend via `solveHermiteG2` → `session.addCurve3D`.
 */
export function bridgeCurves(
  session: CaptureSession,
  a: Curve3D,
  b: Curve3D,
  opts: BridgeCurvesOpts,
): Curve3DProxy {
  assertBridgeOperands(a, b);
  assertBridgeContinuity(opts.continuity);
  const ends: BridgeEnds = opts.ends ?? 'end-start';
  const tension = opts.tension ?? 1;
  assertBridgeTension(tension);

  const tA = ends.startsWith('end') ? 1 : 0;
  const tB = ends.endsWith('start') ? 0 : 1;
  // Flip parametric derivatives when leaving/arriving against the curve's
  // natural direction so G1 continues the chosen end.
  const flipA = tA === 0;
  const flipB = tB === 1;

  const numDerivs = opts.continuity === 'G2' ? 2 : 1;
  const dA = a.analytics.derivatives(tA, numDerivs);
  const dB = b.analytics.derivatives(tB, numDerivs);
  const pA = dA[0];
  const pB = dB[0];
  assertBridgeChord(pA, pB, ends, a);

  const tanA = scale(dA[1], flipA ? -tension : tension);
  const tanB = scale(dB[1], flipB ? -tension : tension);
  assertBridgeTangents(tanA, tanB, a);

  const { curvA, curvB } = computeBridgeCurvatures(opts.continuity, dA, dB, tension);
  return addBridgeCurve(session, pA, pB, tanA, tanB, curvA, curvB);
}

function assertBridgeOperands(a: unknown, b: unknown): void {
  if (!isCurve3D(a) || !isCurve3D(b)) {
    throw new KernelError(
      'feature.invalid-args',
      'curveBridge: both operands must be Curve3D (from nurbsCurve / spline3d / hermiteG2 / surfaceIntersection).',
      undefined,
      'invalid-args.curveBridge — pass two Curve3D values.',
    );
  }
}

function assertBridgeContinuity(continuity: BridgeContinuity): void {
  if (continuity !== 'G1' && continuity !== 'G2') {
    throw new KernelError(
      'feature.invalid-args',
      `curveBridge: continuity must be 'G1' or 'G2'; got ${JSON.stringify(continuity)}.`,
      undefined,
      "invalid-args.curveBridge.continuity — pass continuity: 'G1' or 'G2'.",
    );
  }
}

function assertBridgeTension(tension: number): void {
  if (!Number.isFinite(tension) || tension <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `curveBridge: tension must be a positive finite number; got ${tension}.`,
      undefined,
      'invalid-args.curveBridge.tension — pass a positive finite tension (default 1).',
    );
  }
}

function assertBridgeChord(
  pA: Vec3,
  pB: Vec3,
  ends: BridgeEnds,
  curveA: Curve3D,
): void {
  const chord = hypot3([pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]]);
  if (chord < 1e-9) {
    throw new KernelError(
      'feature.curve-bridge.degenerate-end',
      `curveBridge: chosen ends coincide (chord ${chord} mm). ends=${ends}.`,
      curveA.id,
      'curve-bridge.degenerate-end — pick different ends or separate the curves.',
    );
  }
}

function assertBridgeTangents(tanA: Vec3, tanB: Vec3, curveA: Curve3D): void {
  if (hypot3(tanA) < 1e-12 || hypot3(tanB) < 1e-12) {
    throw new KernelError(
      'feature.curve-bridge.degenerate-end',
      `curveBridge: vanishing tangent at a join (|T_a|=${hypot3(tanA)}, |T_b|=${hypot3(tanB)}).`,
      curveA.id,
      'curve-bridge.degenerate-end — the source curve is degenerate at that end; re-author it or raise tension.',
    );
  }
}

function computeBridgeCurvatures(
  continuity: BridgeContinuity,
  dA: Vec3[],
  dB: Vec3[],
  tension: number,
): { curvA: Vec3 | undefined; curvB: Vec3 | undefined } {
  let curvA: Vec3 | undefined;
  let curvB: Vec3 | undefined;
  if (continuity === 'G2') {
    // C'' is even under parameter reversal; scale by τ² so geometric κ is
    // invariant when tension rescales parametric speed.
    const tau2 = tension * tension;
    curvA = scale(dA[2] ?? [0, 0, 0], tau2);
    curvB = scale(dB[2] ?? [0, 0, 0], tau2);
  }
  return { curvA, curvB };
}

function addBridgeCurve(
  session: CaptureSession,
  pA: Vec3,
  pB: Vec3,
  tanA: Vec3,
  tanB: Vec3,
  curvA: Vec3 | undefined,
  curvB: Vec3 | undefined,
): Curve3DProxy {
  const controlPoints = solveHermiteG2(
    { point: pA, tangent: tanA, ...(curvA ? { curvature: curvA } : {}) },
    { point: pB, tangent: tanB, ...(curvB ? { curvature: curvB } : {}) },
  );
  return session.addCurve3D({
    metadata: {
      controlPoints,
      degree: 5,
      closed: false,
    },
  });
}
