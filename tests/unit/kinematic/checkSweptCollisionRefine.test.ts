// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #1680: real geometry. A bar swings about a hinge through a post. In the
// hinge frame the bar is x in [0, 40], y in [-3, 3]; the post is the square
// [18, 26]^2. The leading edge reaches post corner (26, 18) at
// 34.695 - asin(3 / 31.623) = 29.251 deg and the trailing edge leaves corner
// (18, 26) at 60.749 deg. A 15 deg walk samples 15 (clear), 30 (hit),
// 60 (hit), 75 (clear); refinement must bracket both ends to 15 / 64 deg.

import { describe, expect, it, vi } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { detectInterferencesForPoses } from '../../../src/modeling/mates/poseEnvelope';
import * as interference from '../../../src/modeling/runtime/detectInterferences';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';

vi.mock('../../../src/modeling/runtime/detectInterferences', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/runtime/detectInterferences')>();
  return { ...actual, detectInterferences: vi.fn(actual.detectInterferences) };
});

const START_DEG = 29.251;
const END_DEG = 60.749;

function swingingBar(opts: { fixedClamp?: boolean } = {}) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('swept-refine-hinge');
  arm.part('base', kcad.box(20, 20, 8).union(kcad.box(8, 8, 20).translate(28, 28, 0)))
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [10, 10, 8] },
      axis: [0, 0, 1],
    });
  arm.part('bar', kcad.box(40, 6, 6).translate(10, 7, 8))
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [10, 10, 8] },
      axis: [0, 0, 1],
    });
  arm.mate('swing', 'base.hinge', 'bar.hinge', 'revolute', { pose: 0, limitsDeg: [0, 90] });
  // An unmated clamp sunk 1 mm into the base: it never moves relative to
  // the base, and the bar never reaches it.
  if (opts.fixedClamp) arm.part('clamp', kcad.box(6, 6, 6).translate(2, 2, 3));
  return arm;
}

describe('checkSweptCollision overlap refinement (#1680)', () => {
  it('brackets the start and end of the overlap stretch and names the worst pose', async () => {
    const arm = swingingBar();
    const swept = await checkSweptCollision(arm, { joint: 'swing', range: [0, 90, 15] });

    expect(swept.ok).toBe(false);
    expect(swept.posesSampled).toBe(7);
    expect(swept.walks).toHaveLength(1);
    const walk = swept.walks![0];
    expect(walk.joint).toBe('swing');
    expect(walk.step).toBe(15);
    expect(walk.unknown).toEqual([]);
    expect(walk.overlaps).toHaveLength(1);
    const pair = walk.overlaps[0];
    expect([pair.partA, pair.partB].sort()).toEqual(['bar', 'base']);
    expect(pair.stretches).toHaveLength(1);
    const [s] = pair.stretches;
    expect(s.startResolution).toBeCloseTo(15 / 64, 9);
    expect(s.endResolution).toBeCloseTo(15 / 64, 9);
    // The overlap-side end is inside the stretch and within one resolution
    // of the analytic contact angle (0.01 mm^3 tolerance moves it inward).
    expect(s.start).toBeGreaterThan(START_DEG);
    expect(s.start - START_DEG).toBeLessThan(s.startResolution + 0.05);
    expect(s.end).toBeLessThan(END_DEG);
    expect(END_DEG - s.end).toBeLessThan(s.endResolution + 0.05);

    // Worst overlap is mid-travel, and a single-pose probe there agrees.
    const worstAngle = Number(pair.worstPose.swing);
    expect(worstAngle).toBe(45);
    const single = await detectInterferencesForPoses(arm, { swing: worstAngle }, 0.01);
    const singleHit = single.find((p) => [p.a, p.b].sort().join() === 'bar,base');
    expect(pair.worstVolumeMm3).toBeCloseTo(singleHit!.volumeMm3, 5);
    // The witness lies on the post (world x, y in [28, 36]).
    expect(pair.witness).toBeDefined();
    expect(pair.witness![0]).toBeGreaterThan(27.9);
    expect(pair.witness![0]).toBeLessThan(36.1);
    expect(pair.witness![1]).toBeGreaterThan(27.9);
    expect(pair.witness![1]).toBeLessThan(36.1);
  }, 60_000);

  it('reports a pose whose exact check fails as unknown, never clear', async () => {
    const arm = swingingBar();
    const mocked = vi.mocked(interference.detectInterferences);
    const actual = mocked.getMockImplementation()!;
    let call = 0;
    mocked.mockImplementation((...args) => {
      const result = actual(...args);
      call++;
      // The fourth sample (75 deg) is clear in geometry; fail its probe.
      if (call !== 4) return result;
      return { ...result, unconfirmedPairs: [{ a: 'bar', b: 'base', message: 'boolean failed' }] };
    });
    try {
      const swept = await checkSweptCollision(arm, { joint: 'swing', range: [30, 75, 15], refineRounds: 0 });
      expect(swept.ok).toBe(false);
      const walk = swept.walks![0];
      expect(walk.unknown).toEqual([
        { pose: { swing: 75 }, reason: 'exact interference check failed', pairs: [{ partA: 'bar', partB: 'base' }] },
      ]);
      const diag = swept.diagnostics.find((d) => d.code === 'kinematic.collision.swept.unmeasured');
      expect(diag?.severity).toBe('error');
      expect(diag?.poseContext).toEqual({ swing: 75 });
      // The stretch end next to the unknown pose stays at one step.
      expect(walk.overlaps[0].stretches[0].endResolution).toBe(15);
    } finally {
      mocked.mockImplementation(actual);
    }
  }, 60_000);

  it('leaves pairs that keep their relative pose to the static check', async () => {
    const swept = await checkSweptCollision(swingingBar({ fixedClamp: true }), { joint: 'swing', range: [0, 90, 15] });
    const walk = swept.walks![0];
    // base/bar and bar/clamp move; base/clamp keeps its place.
    expect(walk.movingPairs).toBe(2);
    expect(walk.fixedPairs).toBe(1);
    expect(walk.overlaps.map((p) => [p.partA, p.partB].sort().join('/'))).toEqual(['bar/base']);
    expect(walk.clearNote).toContain('1 pair(s) keep their relative pose');
    // Same refinement as without the clamp: the fixed overlap adds no bisection.
    const plain = await checkSweptCollision(swingingBar(), { joint: 'swing', range: [0, 90, 15] });
    expect(walk.refinementSamples).toBe(plain.walks![0].refinementSamples);
    expect(walk.overlaps[0].stretches).toEqual(plain.walks![0].overlaps[0].stretches);
    // The per-pose list is unchanged: the clamp overlap is still at every sample.
    expect(swept.collidingPoses).toHaveLength(7);
  }, 60_000);

  it('does not refine an explicit pose list', async () => {
    const swept = await checkSweptCollision(swingingBar(), { samples: [{ swing: 0 }, { swing: 45 }] });
    expect(swept.walks).toBeUndefined();
    expect(swept.collidingPoses.map((p) => p.pose.swing)).toEqual([45]);
  }, 60_000);
});
