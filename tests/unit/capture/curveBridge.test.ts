// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { Curve3D } from '../../../src/modeling/capture/curveProxy';
import type { Vec3 } from '../../../src/shared/intent/types';

beforeAll(async () => {
  await initOcct();
});

function hypot3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function unit(v: Vec3): Vec3 {
  const m = hypot3(v);
  if (m < 1e-15) return [0, 0, 0];
  return [v[0] / m, v[1] / m, v[2] / m];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Geometric curvature κ = |C' × C''| / |C'|^3. */
function kappa(d1: Vec3, d2: Vec3): number {
  const magD1 = hypot3(d1);
  if (magD1 < 1e-15) return 0;
  return hypot3(cross(d1, d2)) / magD1 ** 3;
}

function makeApi() {
  const session = new CaptureSession();
  return { session, kcad: createApi({ session }) };
}

describe('Curve3D.bridge / curveBridge', () => {
  it('G1: position and unit-tangent error < 1e-6 at both joins', () => {
    const { kcad } = makeApi();
    const a = kcad.nurbsCurve(
      [
        [0, 0, 0],
        [5, 0, 0],
        [10, 0, 0],
      ],
      { degree: 2 },
    );
    const b = kcad.nurbsCurve(
      [
        [20, 0, 0],
        [25, 0, 0],
        [30, 0, 0],
      ],
      { degree: 2 },
    );
    const bridge = a.bridge(b, { continuity: 'G1' });
    expect(hypot3(sub(bridge.pointAt(0), a.pointAt(1)))).toBeLessThan(1e-6);
    expect(hypot3(sub(bridge.pointAt(1), b.pointAt(0)))).toBeLessThan(1e-6);
    const tA = unit(a.tangentAt(1));
    const tB0 = unit(bridge.tangentAt(0));
    const tBend = unit(bridge.tangentAt(1));
    const tB = unit(b.tangentAt(0));
    expect(hypot3(sub(tA, tB0))).toBeLessThan(1e-6);
    expect(hypot3(sub(tBend, tB))).toBeLessThan(1e-6);
  });

  it('G2: curvature error < 1e-6 at both joins (via curveBridge global)', () => {
    const { kcad } = makeApi();
    const left = kcad.spline3d([
      [-30, 0, 0],
      [-15, 8, 0],
      [0, 0, 0],
    ]);
    const right = kcad.spline3d([
      [20, 0, 0],
      [35, -8, 0],
      [50, 0, 0],
    ]);
    const bridge = kcad.curveBridge(left, right, { continuity: 'G2' });
    const leftEnd = left.analytics.derivatives(1, 2);
    const rightStart = right.analytics.derivatives(0, 2);
    const bridgeStart = bridge.analytics.derivatives(0, 2);
    const bridgeEnd = bridge.analytics.derivatives(1, 2);
    expect(hypot3(sub(bridgeStart[0], leftEnd[0]))).toBeLessThan(1e-6);
    expect(hypot3(sub(bridgeEnd[0], rightStart[0]))).toBeLessThan(1e-6);
    expect(hypot3(sub(unit(bridgeStart[1]), unit(leftEnd[1])))).toBeLessThan(1e-6);
    expect(hypot3(sub(unit(bridgeEnd[1]), unit(rightStart[1])))).toBeLessThan(1e-6);
    expect(Math.abs(kappa(bridgeStart[1], bridgeStart[2]) - kappa(leftEnd[1], leftEnd[2]))).toBeLessThan(1e-6);
    expect(Math.abs(kappa(bridgeEnd[1], bridgeEnd[2]) - kappa(rightStart[1], rightStart[2]))).toBeLessThan(1e-6);
  });

  it('ends: start-end joins a.start to b.end', () => {
    const { kcad } = makeApi();
    const a = kcad.nurbsCurve(
      [
        [0, 0, 0],
        [5, 0, 0],
        [10, 0, 0],
      ],
      { degree: 2 },
    );
    const b = kcad.nurbsCurve(
      [
        [20, 5, 0],
        [25, 5, 0],
        [30, 5, 0],
      ],
      { degree: 2 },
    );
    const bridge = a.bridge(b, { continuity: 'G1', ends: 'start-end' });
    expect(hypot3(sub(bridge.pointAt(0), a.pointAt(0)))).toBeLessThan(1e-6);
    expect(hypot3(sub(bridge.pointAt(1), b.pointAt(1)))).toBeLessThan(1e-6);
  });

  it('throws feature.curve-bridge.degenerate-end when endpoints coincide', () => {
    const { kcad } = makeApi();
    const a = kcad.nurbsCurve(
      [
        [0, 0, 0],
        [5, 0, 0],
        [10, 0, 0],
      ],
      { degree: 2 },
    );
    const b = kcad.nurbsCurve(
      [
        [10, 0, 0],
        [15, 0, 0],
        [20, 0, 0],
      ],
      { degree: 2 },
    );
    let caught: unknown = null;
    try {
      a.bridge(b, { continuity: 'G1' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.curve-bridge.degenerate-end');
  });
});
