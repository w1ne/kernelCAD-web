// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/workspaceReachability.test.ts
//
// v0.7 Slice 1 — workspace-reachability gate.
//
// Pins the three behavioural surfaces described in
// `2026-05-15-v0.7-kinematic-grounding-design.md` §workspace-reachability:
//   1. Pass path — declared targets inside the sampled envelope AABB
//      return zero diagnostics.
//   2. Fail path — a declared target beyond the envelope's reach produces
//      one `assembly.workspace.unreachable` (severity 'error') diagnostic
//      whose hint names the target, the delta, and the (currently unknown)
//      limiting mate.
//   3. Throw path — `solvedModel({validate:'error', posesGate:'envelope'})`
//      on the fail-path fixture throws via `validateAssemblyWithMates`'s
//      error-diagnostic surfacer, carrying the workspace gate's hint.
//
// Fixture: a flat 1-DOF arm. A horizontal `link` of length 100 mm rotates
// around a vertical revolute axis (`yaw`) at the origin; the tracked tip
// connector sits at the link's far end in local coords [100, 0, 0]. With
// limits ±90° the sampled connector workspace AABB spans roughly
// [-100..100] × [-100..100] × [0..0]; with limits ±10° it shrinks to a
// short arc near (+100, 0, 0). The pass / fail targets straddle that
// transition.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { reviewPoseEnvelope } from './poseEnvelope';
import { validateWorkspaceReachability } from './workspaceReachability';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('rig'), kcad };
}

// Build a 1-DOF arm rotating about a horizontal axis (Y). Mirrors the
// `kinematic-grounding-all-three-clean` fixture's geometric convention: a
// pair of blocks butted edge-to-edge along their shared X-face with the
// joint axis passing through that shared face. The axis line traverses
// both BREPs at the contact face — non-overlapping (no interference) and
// joint-axis-binding clean.
//
// Geometry (Z-up, mm) — boxes are NOT centred (kcad.box default), so the
// local frame origin sits at the corner with min coords (0, 0, 0). Mate FK
// is the SOLE positioner for the link: omit `at:` on the link so the
// lowerer does not double-translate the part.
//   - `pivot`: box(20, 20, 20) at world origin → covers
//     x ∈ [0, 20], y ∈ [0, 20], z ∈ [0, 20].
//   - `link`: box(80, 20, 10) positioned by mate FK so its -X face mates
//     with the pivot's +X face → world AABB x ∈ [20, 100], y ∈ [0, 20],
//     z ∈ [5, 15] (the link is centred along Y at the pivot's mid-Y face
//     and Z-aligned with the pivot's vertical mid-band).
//   - Joint axis: world line through [20, 10, 10] with direction [0, 1, 0].
//     The line lies in the contact face plane (x = 20) which is shared by
//     both BREPs — both face-plane checks admit it per the gate's
//     pad-by-EPSILON_MM accept condition (mirrors `all-three-clean`).
//
// With `limitsDeg = [-90, 90]` the tracked `link.tip` connector at world
// [100, 10, 10] (at zero rotation) sweeps an arc of radius 80 mm in the
// XZ plane around the axis (y stays at 10).
function buildOneLinkArm(limitsDeg: [number, number]) {
  const { arm, kcad } = makeArm();
  arm
    .part('pivot', kcad.box(20, 20, 20), { at: [0, 0, 0] })
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [20, 10, 10] },  // pivot +X face centre
      axis: [0, 1, 0],
    });
  arm
    .part('link', kcad.box(80, 20, 10))
    .connector('axis', {
      // Connector at link-local [0, 10, 5] — the -X face centre. Mate FK
      // puts this at world [20, 10, 10], so the link extends in +X to x=100.
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 10, 5] },
      axis: [0, 1, 0],
    })
    .connector('tip', {
      // Link's +X face centre, local frame → world [100, 10, 10] at zero pose.
      type: 'frame',
      origin: { kind: 'vec3', value: [80, 10, 5] },
    });
  arm.mate('yaw', 'pivot.axis', 'link.axis', 'revolute', { limitsDeg });
  return arm;
}

describe('validateWorkspaceReachability', () => {
  it('returns [] when every declared target lies inside the sampled AABB', async () => {
    const arm = buildOneLinkArm([-90, 90]);
    // With ±90° rotation around the Y axis at world [20, 10, 10], the
    // tracked `link.tip` sweeps approximately:
    //   x in [20..100], y = 10, z in [-70..90]
    // Pick targets well inside this box so floating-point sampling noise
    // can't push them outside.
    arm.workspace('link.tip', {
      reachable: [
        [60, 10, 10],
        [70, 10, 40],
        [30, 10, -40],
      ],
      toleranceMm: 1,
    });
    const env = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.tip'],
    });
    const diags = validateWorkspaceReachability(arm, env.connectorWorkspace);
    expect(diags).toEqual([]);
  });

  it('emits one error diagnostic per out-of-range target', async () => {
    const arm = buildOneLinkArm([-10, 10]);
    // With ±10° the tip can barely move off its zero-pose position
    // (~world [100, 10, 10]): the AABB is a thin slice. [-200, 10, 10]
    // sits ~300 mm outside on -X.
    arm.workspace('link.tip', {
      reachable: [[-200, 10, 10]],
      toleranceMm: 5,
    });
    const env = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.tip'],
    });
    const diags = validateWorkspaceReachability(arm, env.connectorWorkspace);
    expect(diags).toHaveLength(1);
    const d = diags[0];
    expect(d.code).toBe('assembly.workspace.unreachable');
    expect(d.severity).toBe('error');
    expect(d.connectorRef).toBe('link.tip');
    // Hint includes the target literal, a delta-mm number, and the
    // (currently unknown) limiting mate placeholder.
    expect(d.hint).toMatch(/\[-200, 10, 10\]/);
    expect(d.hint).toMatch(/mm outside/);
    expect(d.hint).toMatch(/'unknown'/);
  });

  it('reports a structured diagnostic when the connectorRef is not observed', async () => {
    const arm = buildOneLinkArm([-90, 90]);
    arm.workspace('link.nope', {
      reachable: [[60, 10, 10]],
      toleranceMm: 1,
    });
    const env = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.tip'],
    });
    const diags = validateWorkspaceReachability(arm, env.connectorWorkspace);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.workspace.unreachable');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].connectorRef).toBe('link.nope');
    expect(diags[0].message).toMatch(/not observed/);
  });

  it('returns [] when no workspace targets are declared', async () => {
    const arm = buildOneLinkArm([-90, 90]);
    const env = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.tip'],
    });
    expect(validateWorkspaceReachability(arm, env.connectorWorkspace)).toEqual([]);
  });

  it('emits info-severity hint when envelope was not sampled', () => {
    const arm = buildOneLinkArm([-90, 90]);
    arm.workspace('link.tip', { reachable: [[60, 10, 10]] });
    const diags = validateWorkspaceReachability(arm, undefined);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.workspace.unreachable');
    expect(diags[0].severity).toBe('info');
    expect(diags[0].hint).toMatch(/posesGate: 'envelope'/);
  });

  it('respects toleranceMm — a target marginally outside but within tolerance returns []', async () => {
    const arm = buildOneLinkArm([-90, 90]);
    // Pick a point 1 mm beyond the AABB's max-X face (~70 at zero pose);
    // with a generous tolerance the gate should pass even with floating-
    // point jitter.
    arm.workspace('link.tip', {
      reachable: [[101, 10, 10]],  // 1 mm outside on +X (AABB max ~100)
      toleranceMm: 5,
    });
    const env = await reviewPoseEnvelope(arm, {
      includeInterference: false,
      trackConnectors: ['link.tip'],
    });
    const diags = validateWorkspaceReachability(arm, env.connectorWorkspace);
    expect(diags).toEqual([]);
  });
});

describe('arm.workspace(...) capture-time validation', () => {
  it('throws on a malformed connectorRef', () => {
    const { arm } = makeArm();
    expect(() => arm.workspace('not-a-dot-ref', { reachable: [[0, 0, 0]] })).toThrow(
      /not a 'partName.connectorName' reference/,
    );
  });

  it('throws on an empty reachable array', () => {
    const { arm } = makeArm();
    expect(() => arm.workspace('p.c', { reachable: [] })).toThrow(/non-empty array/);
  });

  it('throws on a malformed Vec3 entry', () => {
    const { arm } = makeArm();
    // @ts-expect-error — testing runtime guard
    expect(() => arm.workspace('p.c', { reachable: [[0, 'x', 0]] })).toThrow(/finite Vec3/);
  });

  it('throws on a negative toleranceMm', () => {
    const { arm } = makeArm();
    expect(() => arm.workspace('p.c', { reachable: [[0, 0, 0]], toleranceMm: -1 })).toThrow(
      /non-negative/,
    );
  });
});

describe('solvedModel throw path', () => {
  it("throws KernelError('feature.invalid-args') when a workspace target is unreachable under validate:'error'", async () => {
    const arm = buildOneLinkArm([-10, 10]);
    arm.workspace('link.tip', {
      reachable: [[-200, 10, 10]],
      toleranceMm: 5,
    });
    await expect(
      arm.solvedModel({}, { validate: 'error', posesGate: 'envelope' }),
    ).rejects.toThrow(/lies .* mm outside/);
  });
});
