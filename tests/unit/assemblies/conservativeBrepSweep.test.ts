// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Conservative BREP pose-sweep proxies. Test-only fixtures live here so the
// shipped robot-arm example stays unchanged. The detailed arm uses a full
// spline tooth ring, forearm windows, and through-bolts.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { AssemblyPartRef } from '../../../src/modeling/capture/assemblyTypes';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import type { SceneBackend, SceneBackendPart } from '../../../src/kernel/backends/sceneBackend';
import { Transform } from '../../../src/shared/runtime/se3';
import {
  detectInterferences,
  pairKey,
} from '../../../src/modeling/runtime/detectInterferences';
import {
  BREP_SWEEP_BUDGET,
  checkMechanismTruth,
} from '../../../src/modeling/runtime/mechanismTruth';
import { summarizeMechanism } from '../../../src/modeling/runtime/mechanismVerdict';
import {
  buildSweepProxies,
  collectSweepProxyCandidates,
} from '../../../src/modeling/runtime/sweepCollisionProxy';
import { estimateSweepWork } from '../../../src/modeling/runtime/sweepWork';

type Kcad = ReturnType<typeof createModelingApi>;
type Solid = ReturnType<Kcad['box']>;
type Vec3 = [number, number, number];

beforeAll(async () => {
  await initOcct();
});

function scene(parts: readonly SceneBackendPart[]): SceneBackend {
  return { target: 'occt', assemblyName: 'sweep', parts, _kind: 'scene' };
}

function placed(name: string, shape: OcctBackend, worldTransform: Transform = Transform.identity()): SceneBackendPart {
  return { name, shape, worldTransform };
}

function stackHas(name: string): boolean {
  return (new Error().stack ?? '').includes(name);
}

describe('exact confirmation of proxy candidates', () => {
  it('runs the exact boolean when an L and a corner cube only overlap as boxes', () => {
    const ell = OcctBackend.box(30, 10, 10).union(OcctBackend.box(10, 30, 10));
    const cube = OcctBackend.box(8, 8, 10).translate(12, 12, 0);
    const layout = scene([placed('ell', ell), placed('cube', cube)]);
    const proxies = buildSweepProxies(layout);
    const candidates = collectSweepProxyCandidates(proxies, layout);
    expect(candidates.map((pair) => [pair.i, pair.j])).toEqual([[0, 1]]);

    const original = OcctBackend.prototype.intersectionMetrics;
    let calls = 0;
    OcctBackend.prototype.intersectionMetrics = function (this: OcctBackend, other: OcctBackend) {
      if (stackHas('measureOverlap')) calls += 1;
      return original.call(this, other);
    };
    try {
      const result = detectInterferences(layout, 0.01, new Set(), [], undefined, [[0, 1]]);
      expect(calls).toBe(1);
      expect(result.pairs).toEqual([]);
      expect(result.unconfirmedPairs).toBeUndefined();
    } finally {
      OcctBackend.prototype.intersectionMetrics = original;
    }
  }, 20_000);

  it('does not drop an explicit pair that the source AABBs already separate', () => {
    const layout = scene([
      placed('a', OcctBackend.box(10, 10, 10)),
      placed('b', OcctBackend.box(10, 10, 10).translate(80, 0, 0)),
    ]);
    const original = OcctBackend.prototype.intersectionMetrics;
    let calls = 0;
    OcctBackend.prototype.intersectionMetrics = function (this: OcctBackend, other: OcctBackend) {
      if (stackHas('measureOverlap')) calls += 1;
      return original.call(this, other);
    };
    try {
      const filtered = detectInterferences(layout, 0.01, new Set());
      expect(filtered.comparisonCount).toBe(0);
      expect(calls).toBe(0);
      const forced = detectInterferences(layout, 0.01, new Set(), [], undefined, [[0, 1]]);
      expect(calls).toBe(1);
      expect(forced.pairs).toEqual([]);
      expect(forced.unconfirmedPairs).toBeUndefined();
    } finally {
      OcctBackend.prototype.intersectionMetrics = original;
    }
  }, 20_000);

  it('leaves a non-finite exact volume unconfirmed', () => {
    const layout = scene([
      placed('a', OcctBackend.box(10, 10, 10)),
      placed('b', OcctBackend.box(10, 10, 10).translate(4, 0, 0)),
    ]);
    const original = OcctBackend.prototype.intersectionMetrics;
    OcctBackend.prototype.intersectionMetrics = function (this: OcctBackend, other: OcctBackend) {
      if (stackHas('measureOverlap')) return { volumeMm3: Number.NaN, areaMm2: 0 };
      return original.call(this, other);
    };
    try {
      const result = detectInterferences(layout, 0.01, new Set(), [], undefined, [[0, 1]]);
      expect(result.pairs).toEqual([]);
      expect(result.unconfirmedPairs?.map((pair) => [pair.a, pair.b])).toEqual([['a', 'b']]);
      expect(result.diagnostics.some((diag) => diag.code === 'feature.kernel-failed')).toBe(true);
    } finally {
      OcctBackend.prototype.intersectionMetrics = original;
    }
  }, 20_000);

  it('reports an index that is not a BRep pair as unconfirmed', () => {
    const layout = scene([placed('a', OcctBackend.box(10, 10, 10))]);
    const result = detectInterferences(layout, 0.01, new Set(), [], undefined, [[0, 4]]);
    expect(result.pairs).toEqual([]);
    expect(result.unconfirmedPairs?.[0]).toMatchObject({ a: '#0', b: '#4' });
  }, 20_000);
});

describe('sweep work from the shared proxy collector', () => {
  it('charges analysis-body faces of unique proxy candidates, once per relative pose', () => {
    const shown = OcctBackend.box(8, 8, 8);
    const nominal = OcctBackend.cylinder(8, 3);
    shown.analysisBody = nominal;
    const other = OcctBackend.box(8, 8, 8);
    const displayFaces = shown.getReplicadShape().faces.length;
    const analysisFaces = nominal.getReplicadShape().faces.length;
    const otherFaces = other.getReplicadShape().faces.length;
    expect(analysisFaces).not.toBe(displayFaces);

    const overlap = Transform.translation(2, 0, 0);
    const rest = scene([placed('shown', shown), placed('other', other, overlap)]);
    const sameRelative = scene([
      placed('shown', shown, Transform.translation(0, 25, 0)),
      placed('other', other, Transform.translation(0, 25, 0).compose(overlap)),
    ]);
    const moved = scene([
      placed('shown', shown),
      placed('other', other, Transform.translation(3, 0, 0)),
    ]);
    const proxies = buildSweepProxies(rest);
    const restPairs = collectSweepProxyCandidates(proxies, rest);
    expect(restPairs.map((pair) => [pair.a, pair.b])).toEqual([['shown', 'other']]);
    expect(estimateSweepWork([rest]).candidates).toBe(restPairs.length);
    expect(estimateSweepWork([rest]).work).toBe(analysisFaces + otherFaces);
    expect(estimateSweepWork([rest, sameRelative])).toEqual(expect.objectContaining({
      work: analysisFaces + otherFaces,
      candidates: 1,
    }));
    expect(estimateSweepWork([rest, sameRelative, moved])).toEqual(expect.objectContaining({
      work: (analysisFaces + otherFaces) * 2,
      candidates: 2,
    }));
    expect(estimateSweepWork([rest], [new Set([pairKey('other', 'shown')])]).candidates).toBe(0);

    const spun = Transform.translation(4, 4, 0).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 45));
    const rotated = scene([
      placed('a', OcctBackend.box(4, 4, 4, true)),
      placed('b', OcctBackend.box(4, 4, 4, true), spun),
    ]);
    expect(collectSweepProxyCandidates(buildSweepProxies(rotated), rotated)).toEqual([]);
    expect(estimateSweepWork([rotated]).work).toBe(0);
    expect(detectInterferences(rotated, 0.01, new Set()).comparisonCount).toBe(1);
  }, 20_000);
});

function meetingHinge(): { arm: Assembly; body: AssemblyPartRef; kcad: Kcad } {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('probe-hinge');
  const body = arm.part('a', kcad.box(20, 10, 10))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 5, 5] }, axis: [0, 0, 1] });
  arm.part('b', kcad.box(30, 5, 5))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 2.5, 2.5] }, axis: [0, 0, 1] });
  arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 90] });
  return { arm, body, kcad };
}

describe('mechanism sweep failure and physics isolation', () => {
  it('leaves the mechanism unverified when an exact probe throws', async () => {
    const { arm } = meetingHinge();
    const original = OcctBackend.prototype.intersectionMetrics;
    OcctBackend.prototype.intersectionMetrics = function (this: OcctBackend, other: OcctBackend) {
      if (stackHas('measureOverlap')) throw new Error('exact probe forced off');
      return original.call(this, other);
    };
    try {
      const result = await checkMechanismTruth(arm);
      expect(result.mechanism).toBe('unverified');
      expect(result.coverage?.sweep).toBe(false);
      const probe = result.failures.find((failure) => failure.code === 'mechanism.unverified-exact-probe');
      expect(probe?.severity).toBe('warn');
      expect(result.failures.some((failure) => failure.code === 'mechanism.interpenetration')).toBe(false);
      const summary = summarizeMechanism({
        mechanism: result.mechanism,
        failures: result.failures,
        coverage: result.coverage,
      });
      expect(summary.statement).toContain('exact overlap probe failed');
      expect(summary.statement).not.toContain('did not run');
    } finally {
      OcctBackend.prototype.intersectionMetrics = original;
    }
  }, 45_000);

  it('does not write sweep proxies into collision shapes or change the physics skip', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('collision-shape-hinge');
    const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [20, 5, 10] as Vec3 }, axis: [0, 0, 1] as Vec3 };
    const body = arm.part('a', kcad.box(20, 10, 10)).connector('hinge', axis);
    arm.part('b', kcad.box(30, 5, 5).translate(17.5, 2.5, 10)).connector('hinge', axis);
    arm.mate('m', 'a.hinge', 'b.hinge', 'revolute', { pose: 0, limitsDeg: [0, 60] });
    body.collision([kcad.box(4, 4, 4)]);
    expect(body.collisionShapes).toHaveLength(1);
    const before = body.collisionShapes.length;
    const loadSession = vi.fn(async () => {
      throw new Error('physics session must not load');
    });
    const result = await checkMechanismTruth(arm, {
      physicsCheck: true,
      physicsSessionFactory: loadSession,
    });
    expect(body.collisionShapes).toHaveLength(before);
    expect(arm.__parts().every((part) => part.name === 'a' ? part.collisionShapes.length === 1 : part.collisionShapes.length === 0)).toBe(true);
    const physics = result.failures.find((failure) => failure.code === 'mechanism.physics-budget-exceeded');
    expect(physics?.severity).toBe('warn');
    expect(physics?.message).toMatch(/custom collision/);
    expect(result.coverage?.sweep).toBe(true);
    expect(result.coverage?.physics).toBe(false);
    expect(loadSession).not.toHaveBeenCalled();
    const errors = result.failures.filter((failure) => failure.severity === 'error').map((failure) => failure.code);
    expect(errors, result.failures.map((failure) => `${failure.code}: ${failure.message}`).join('\n')).toEqual([]);
    expect(result.mechanism).toBe('unverified');
  }, 45_000);
});

function pushPoint(points: Array<[number, number]>, x: number, y: number): void {
  const last = points[points.length - 1];
  if (last !== undefined && (last[0] - x) ** 2 + (last[1] - y) ** 2 < 1e-4) return;
  points.push([x, y]);
}

/** One full-ring tooth: a closed spline, not a sector and not a polyline. */
function splineTooth(kcad: Kcad, cx: number, cy: number, angle: number, teeth: number, z: number): Solid {
  const root = 4.4;
  const tip = 6.4;
  const half = ((2 * Math.PI) / teeth) * 0.3;
  const points: Array<[number, number]> = [];
  const offsets = [-half, -half * 0.45, 0, half * 0.45, half];
  const radii = [root, root + (tip - root) * 0.72, tip, root + (tip - root) * 0.72, root];
  for (let index = 0; index < offsets.length; index++) {
    const a = angle + offsets[index]!;
    pushPoint(points, cx + radii[index]! * Math.cos(a), cy + radii[index]! * Math.sin(a));
  }
  const inner = root - 1.3;
  pushPoint(points, cx + inner * Math.cos(angle + half), cy + inner * Math.sin(angle + half));
  pushPoint(points, cx + inner * Math.cos(angle - half), cy + inner * Math.sin(angle - half));
  const path = kcad.path().moveTo(points[0]![0], points[0]![1]);
  path.spline(points);
  return path.close().extrude(4).translate(0, 0, z);
}

function fuse(shapes: readonly Solid[]): Solid {
  return shapes.slice(1).reduce((acc, shape) => acc.union(shape), shapes[0]!);
}

function detailedArm(jawMaxDeg: number): Assembly {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('detailed-sweep-arm');
  const axisAt = (at: Vec3) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: at }, axis: [0, 0, 1] as Vec3 });
  const frameAt = (at: Vec3) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value: at }, normal: [0, 0, 1] as Vec3 });

  // Links stack on a horizontal face and turn about Z, so travel slides on
  // that face instead of sweeping a butt joint into the parent.
  const base = arm.part('base', kcad.box(50, 32, 14).translate(0, -16, 0));
  const upper = arm.part('upper', kcad.box(90, 24, 14).translate(20, -12, 14));
  const shoulder = axisAt([50, 0, 14]);
  base.connector('shoulder', shoulder);
  upper.connector('shoulder', shoulder);
  arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute', { pose: 0, limitsDeg: [0, 10] });

  const windows = fuse([
    kcad.box(18, 10, 20).translate(120, -5, 26),
    kcad.box(16, 10, 20).translate(150, -5, 26),
  ]);
  const boltX = [98, 172];
  const holes = fuse(boltX.map((x) => kcad.cylinder(20, 2.4).translate(x, 0, 26)));
  const forearm = arm.part(
    'forearm',
    kcad.box(100, 24, 14).translate(80, -12, 28).subtract(windows.union(holes)),
  );
  const elbow = axisAt([110, 0, 28]);
  upper.connector('elbow', elbow);
  forearm.connector('elbow', elbow);
  arm.mate('elbow', 'upper.elbow', 'forearm.elbow', 'revolute', { pose: 0, limitsDeg: [0, 10] });

  for (const x of boltX) {
    const shank = kcad.cylinder(12, 1.6).translate(x, 0, 30);
    const head = kcad.cylinder(5, 4.2).translate(x, 0, 42);
    const seat = frameAt([x, 0, 42]);
    forearm.connector(`bolt-${x}`, seat);
    arm.part(`bolt-${x}`, shank.union(head)).connector('seat', seat);
    arm.mate(`bolt-${x}`, `forearm.bolt-${x}`, `bolt-${x}.seat`, 'fastened');
  }

  const wrist = arm.part('wrist', fuse([
    kcad.box(60, 36, 12).translate(180, -12, 28),
    kcad.box(12, 8, 12).translate(214, 16, 40),
  ]));
  const wristSeat = frameAt([180, 0, 34]);
  forearm.connector('wrist', wristSeat);
  wrist.connector('seat', wristSeat);
  arm.mate('wrist-mount', 'forearm.wrist', 'wrist.seat', 'fastened');

  const jawPivot: Vec3 = [210, 0, 40];
  const teeth = 12;
  const gearCenter: Vec3 = [236, 0, 40];
  const toothSolids = Array.from({ length: teeth }, (_, index) => (
    splineTooth(kcad, gearCenter[0], gearCenter[1], (index / teeth) * Math.PI * 2, teeth, gearCenter[2])
  ));
  const jaw = arm.part('jaw', fuse([
    kcad.box(58, 8, 6).translate(200, -4, 40),
    kcad.cylinder(6, 3.4).translate(gearCenter[0], gearCenter[1], gearCenter[2]),
    ...toothSolids,
  ]));
  const jawAxis = axisAt(jawPivot);
  wrist.connector('jaw', jawAxis);
  jaw.connector('pivot', jawAxis);
  arm.mate('jaw-pivot', 'wrist.jaw', 'jaw.pivot', 'revolute', { pose: 0, limitsDeg: [0, jawMaxDeg] });
  return arm;
}

function estimatedWork(message: string | undefined): number {
  return Number(/estimated work (\d+)/.exec(message ?? '')?.[1]);
}

describe('detailed arm under the default sweep budget', () => {
  it('sweeps full spline teeth, windows, and through-bolts within 40000', async () => {
    expect(BREP_SWEEP_BUDGET).toBe(40_000);
    const arm = detailedArm(12);
    expect(arm.__ignoreInterference()).toEqual([]);
    expect(arm.__parts().every((part) => part.collisionShapes.length === 0)).toBe(true);

    // A zero budget uses the explicit forced-skip message, which omits the
    // work estimate. A small nonzero budget exercises the estimate-over-budget path.
    const skipped = await checkMechanismTruth(arm, { sweepBudget: 1 });
    const work = estimatedWork(skipped.failures.find((failure) => failure.code === 'mechanism.unverified-budget-exceeded')?.message);
    expect(work).toBeGreaterThan(0);
    expect(work).toBeLessThanOrEqual(40_000);

    const result = await checkMechanismTruth(arm);
    expect(result.coverage?.sweep).toBe(true);
    expect(result.failures.filter((failure) => failure.code === 'mechanism.interpenetration')).toEqual([]);
    expect(result.failures.filter((failure) => failure.severity === 'error').map((failure) => failure.code)).toEqual([]);
    expect(result.mechanism).toBe('real');
    expect(arm.__parts().every((part) => part.collisionShapes.length === 0)).toBe(true);
  }, 55_000);

  it('reports a seeded jaw-to-wrist overlap with the exact volume', async () => {
    const arm = detailedArm(50);
    expect(arm.__ignoreInterference()).toEqual([]);
    const result = await checkMechanismTruth(arm);
    expect(result.coverage?.sweep).toBe(true);
    const hits = result.failures.filter((failure) => failure.code === 'mechanism.interpenetration');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((failure) => (
      failure.message.includes("'jaw'") &&
      failure.message.includes("'wrist'") &&
      failure.message.includes("'jaw-pivot:50'")
    ))).toBe(true);
    const volume = Number(/interpenetrate by ([0-9.]+)/.exec(hits[0]!.message)?.[1]);
    expect(volume).toBeGreaterThan(0.01);
    expect(result.mechanism).toBe('broken');
  }, 55_000);
});
