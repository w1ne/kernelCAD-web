// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kinematic/checkReachableMates.test.ts
//
// `verify({ check: 'reachable' })` on an arm articulated through MATES
// (`arm.mate(..., 'revolute')`) rather than the joint graph. The numeric IK
// used to walk `arm.__joints()` only — empty on a mate-built arm — so it saw
// a zero-DOF chain and reported the distance from the un-posed tip origin to
// the target as `kinematic.unreachable` (130–220 mm on a 120/100 mm desk
// arm), even for the tip's own rest position.
//
// Ground truth: every `fore.tip` position the pose-envelope sampler of
// review_cad visits (its `connectorWorkspace` samples) is reachable by
// definition; IK must reach each of them.

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/composition/runScript';
import { checkReachable } from '../../../src/kinematic/checkReachable';
import { mateTipWorld, resolveMateTipPoint } from '../../../src/kinematic/inverseKinematicsMates';
import { reviewPoseEnvelope } from '../../../src/modeling/mates/poseEnvelope';
import { checkReachableTool } from '../../../src/agent/mcp/tools/checkReachable';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const FIXTURE = 'tests/unit/kinematic/fixtures/desk-arm-mates.kcad.ts';
const code = readFileSync(FIXTURE, 'utf8');

async function loadArm(): Promise<Assembly> {
  const run = await runScript({ code, fileName: 'desk-arm-mates.kcad.ts' });
  return [...run.session.assemblies.values()][0] as Assembly;
}

describe('checkReachable on a mate-built arm', () => {
  let arm: Assembly;
  beforeAll(async () => {
    await initOcct();
    arm = await loadArm();
  }, 60_000);

  it("reaches the tip's own rest position with zero displacement", async () => {
    // Rest pose: shoulder at z = 40 + 30 = 70, upper arm along +X (120),
    // forearm along +X (100): fore frame origin at [120, 0, 70], tip at [220, 0, 70].
    const byPart = await checkReachable(arm, { tipLink: 'fore', target: { position: [120, 0, 70] } });
    expect(byPart.ok, JSON.stringify(byPart.diagnostics)).toBe(true);
    const byConnector = await checkReachable(arm, { tipLink: 'fore.tip', target: { position: [220, 0, 70] } });
    expect(byConnector.ok, JSON.stringify(byConnector.diagnostics)).toBe(true);
    expect(byConnector.pose).toEqual({ 'base-yaw': 0, shoulder: 0, elbow: 0 });
  });

  it('reaches every fore.tip position the review_cad pose envelope samples', async () => {
    const envelope = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      samplesPerMate: 3,
      trackConnectors: ['fore.tip'],
    });
    const targets = envelope.connectorPoses.filter((p) => p.ref === 'fore.tip');
    expect(targets.length).toBeGreaterThan(3);
    const tip = resolveMateTipPoint(arm, 'fore.tip');
    if (typeof tip === 'string') throw new Error(tip);
    for (const t of targets) {
      const res = await checkReachable(arm, {
        tipLink: 'fore.tip',
        target: { position: t.world, positionToleranceMm: 0.5 },
      });
      expect(res.ok, `${t.sampleName} ${JSON.stringify(t.world)} ${JSON.stringify(res.diagnostics)}`).toBe(true);
      // The returned pose really puts the tip on the target.
      const reached = await mateTipWorld(arm, tip, res.pose!);
      const err = Math.hypot(reached![0] - t.world[0], reached![1] - t.world[1], reached![2] - t.world[2]);
      expect(err).toBeLessThan(0.5);
    }
  }, 120_000);

  it('solves an off-axis target that needs all three joints', async () => {
    const tip = resolveMateTipPoint(arm, 'fore.tip');
    if (typeof tip === 'string') throw new Error(tip);
    const truth = await mateTipWorld(arm, tip, { 'base-yaw': 35, shoulder: -25, elbow: 60 });
    const res = await checkReachable(arm, { tipLink: 'fore.tip', target: { position: truth! } });
    expect(res.ok, JSON.stringify(res.diagnostics)).toBe(true);
    expect(Math.abs((res.pose!['base-yaw'] as number) - 35)).toBeLessThan(1);
  });

  it('still reports a target beyond the 220 mm reach as unreachable, with a real closest approach', async () => {
    const res = await checkReachable(arm, { tipLink: 'fore.tip', target: { position: [400, 0, 70] } });
    expect(res.ok).toBe(false);
    const d = res.diagnostics.find((x) => x.code === 'kinematic.unreachable')!;
    expect(d).toBeDefined();
    // Closest approach is the arm stretched toward the target: 400 - 220 = 180 mm.
    expect(d.message).toMatch(/positionError=180\.\d\d mm/);
    expect(d.message).toContain("Tracked tip point: 'fore.tip'");
    expect(Object.keys(res.closestApproach ?? {})).toEqual(['base-yaw', 'shoulder', 'elbow']);
  });

  it('the verify MCP path (check_reachable tool) reaches the rest-pose target', async () => {
    const out = await checkReachableTool({ code, tip_link: 'fore.tip', target_position: [220, 0, 70] });
    expect(out.ok, JSON.stringify(out)).toBe(true);
  }, 60_000);
});
