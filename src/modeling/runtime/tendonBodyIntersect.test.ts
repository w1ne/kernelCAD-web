// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/tendonBodyIntersect.test.ts
//
// P11 Slice 2 — criterion 8 (mechanism.tendon-body-intersect), tested at
// the helper level with a hand-built scene so every body position is
// deterministic (the mate solver + clevis geometry make end-to-end
// fixtures unreliable for precise pierce/clear assertions). The realistic
// end-to-end RED case is asserted on the Luxo lamp in
// tests/integration/examples/luxoLampClevis.validate.test.ts.

import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';
import { checkTendonBodyIntersectAtPose } from './tendonBodyIntersect';
import type { Assembly } from '../capture/assembly';

// A tendon from base.sb (world origin) to arm.sa (world (100,0,0)); the
// straight cable runs along +X at z=0. Bodies are placed by hand so we
// know exactly what the cable does or does not pass through.
async function buildArm(opts: { wrapObstacle?: boolean } = {}): Promise<{
  arm: Assembly;
  boxes: Record<string, OcctBackend>;
}> {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('det');

  const baseBox = kcad.box(20, 20, 20, true);
  const armBox = kcad.box(120, 20, 20, true);
  const obsBox = kcad.box(20, 20, 20, true);

  arm.part('base', baseBox).connector('sb', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  const obs = arm.part('obstacle', obsBox);
  if (opts.wrapObstacle) {
    obs.wrapGeom('rail', { axis: [0, 1, 0], origin: [0, 0, 0], radius: 6, halfLengthMm: 30 });
  }
  arm.part('arm', armBox).connector('sa', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

  arm.tendon('balance', {
    from: 'base.sb',
    to: 'arm.sa',
    restLengthMm: 90,
    stiffnessNmm: 0.6,
    ...(opts.wrapObstacle ? { wrapGeoms: [{ partName: 'obstacle', wrapName: 'rail' }] } : {}),
  });

  const boxes: Record<string, OcctBackend> = {
    base: (await baseBox.lower()) as OcctBackend,
    arm: (await armBox.lower()) as OcctBackend,
    obstacle: (await obsBox.lower()) as OcctBackend,
  };
  return { arm, boxes };
}

// Build a duck-typed scene + transforms map at chosen world placements.
function makeSample(
  boxes: Record<string, OcctBackend>,
  placements: Record<string, Transform>,
) {
  const parts = Object.keys(placements).map((name) => ({
    name,
    shape: boxes[name],
    worldTransform: placements[name],
  }));
  return {
    scene: { parts } as unknown as SceneBackend,
    transforms: new Map(Object.entries(placements)),
  };
}

function fired(results: { partName: string }[], part: string): boolean {
  return results.some((r) => r.partName === part);
}

describe('checkTendonBodyIntersectAtPose — criterion 8 helper', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('fires on a NON-anchor body the cable cuts through', async () => {
    const { arm, boxes } = await buildArm();
    // base at origin, arm anchor at (100,0,0); obstacle (±10) centred at
    // (50,0,0) sits squarely on the z=0 cable line.
    const sample = makeSample(boxes, {
      base: Transform.identity(),
      arm: Transform.translation(100, 0, 0),
      obstacle: Transform.translation(50, 0, 0),
    });
    const results = checkTendonBodyIntersectAtPose(arm, sample);
    expect(fired(results, 'obstacle')).toBe(true);
  });

  it('fires on an ANCHOR body when the cable dives through its interior', async () => {
    const { arm, boxes } = await buildArm();
    // The 120 mm arm spans x∈[40,160] at z=0; the cable from origin to the
    // arm anchor at (100,0,0) runs through the arm interior for x∈[40,95]
    // (beyond the 5 mm anchor margin). Anchor parts are checked.
    const sample = makeSample(boxes, {
      base: Transform.identity(),
      arm: Transform.translation(100, 0, 0),
      obstacle: Transform.translation(50, 0, 200), // far away, clear
    });
    const results = checkTendonBodyIntersectAtPose(arm, sample);
    expect(fired(results, 'arm')).toBe(true);
  });

  it('is GREEN when the obstacle is moved clear of the cable', async () => {
    const { arm, boxes } = await buildArm();
    const sample = makeSample(boxes, {
      base: Transform.identity(),
      arm: Transform.translation(100, 0, 0),
      obstacle: Transform.translation(50, 0, 200), // lifted off the line
    });
    const results = checkTendonBodyIntersectAtPose(arm, sample);
    expect(fired(results, 'obstacle')).toBe(false);
  });

  it('is GREEN on the obstacle when the tendon routes around it via a wrap geom', async () => {
    const { arm, boxes } = await buildArm({ wrapObstacle: true });
    // Obstacle still on the line, but the tendon declares a wrap rail on
    // it — the cable rides on the rail, so the wrap owner is excluded.
    const sample = makeSample(boxes, {
      base: Transform.identity(),
      arm: Transform.translation(100, 0, 0),
      obstacle: Transform.translation(50, 0, 0),
    });
    const results = checkTendonBodyIntersectAtPose(arm, sample);
    expect(fired(results, 'obstacle')).toBe(false);
  });
});
