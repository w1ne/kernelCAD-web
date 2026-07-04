// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-condition trust gate: solve_mates must report `ok` that reflects
// solver convergence, not merely "the solver returned without throwing".
// A non-converging / over-constrained solve is the only SILENT-WRONG path
// in the kernel — it would otherwise ship a WRONG configuration as success.
import { describe, it, expect, afterEach } from 'vitest';
import { solveMatesTool } from './solveMates';
import { setActiveMcpSession, clearActiveMcpSession } from '../activeSession';
import { CaptureSession } from '../../../modeling/capture/captureSession';
import { createApi } from '../../../modeling/api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { session, kcad, arm: kcad.assembly('t') };
}

function activate(session: CaptureSession) {
  setActiveMcpSession({ session });
}

afterEach(() => {
  clearActiveMcpSession();
});

describe('solve_mates — ok reflects convergence', () => {
  it('returns ok:true with status "solved" for a converging tree assembly', async () => {
    const { session, kcad, arm } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
    arm
      .part('b', kcad.box(5, 5, 5))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('a-b', 'a.top', 'b.bot', 'fastened');
    activate(session);

    const r = await solveMatesTool({});
    expect(r.ok).toBe(true);
    expect(r.status).toBe('solved');
    if (r.ok) {
      expect(r.poses.a).toBeDefined();
      expect(r.poses.b).toBeDefined();
    }
  });

  it('returns ok:true with status "redundant-ok" for a consistent fastened loop', async () => {
    const { session, kcad, arm } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened');
    activate(session);

    const r = await solveMatesTool({});
    expect(r.ok).toBe(true);
    expect(r.status).toBe('redundant-ok');
  });

  it('returns ok:false with status "over-constrained" for an inconsistent fastened loop', async () => {
    const { session, kcad, arm } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened'); // inconsistent by 2 mm
    activate(session);

    const r = await solveMatesTool({});
    expect(r.ok).toBe(false);
    expect(r.status).toBe('over-constrained');
    if (!r.ok) {
      expect(r.error).toMatch(/over-constrained/i);
      expect(r.errorCode).toBe('assembly.mate.over-constrained');
      expect(r.errorHint).toBeTruthy();
      // best-effort poses are still surfaced so the agent can diagnose
      expect(r.poses).toBeDefined();
    }
  });

  it('returns ok:false with status "did-not-converge" for an unsupported articulated loop', async () => {
    const { session, kcad, arm } = makeArm();
    const ground = arm.part('ground', kcad.box(60, 10, 10));
    const crank = arm.part('crank', kcad.box(10, 10, 35));
    const coupler = arm.part('coupler', kcad.box(60, 10, 10));
    const rocker = arm.part('rocker', kcad.box(10, 10, 35));
    ground.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    crank.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    crank.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
    coupler.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    coupler.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
    rocker.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
    rocker.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
    ground.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
    arm.mate('crank_ground', 'ground.crankPivot', 'crank.groundPivot', 'revolute');
    arm.mate('crank_coupler', 'crank.couplerPivot', 'coupler.crankPivot', 'revolute');
    arm.mate('coupler_rocker', 'coupler.rockerPivot', 'rocker.couplerPivot', 'revolute');
    arm.mate('rocker_ground', 'rocker.groundPivot', 'ground.rockerPivot', 'revolute');
    activate(session);

    const r = await solveMatesTool({});
    expect(r.ok).toBe(false);
    expect(r.status).toBe('did-not-converge');
    if (!r.ok) {
      expect(r.errorCode).toBe('assembly.solver.did-not-converge');
      expect(r.errorHint).toBeTruthy();
    }
  });
});
