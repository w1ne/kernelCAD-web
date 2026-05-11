import { describe, it, expect } from 'vitest';
import { solveMates } from './solver';
import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../../modules/api';

// v0.6 Task 6: solveMates(arm) — tree-FK over the mate graph for all 7 mate
// types. Closed-loop topologies return 'did-not-converge' with iterations=0
// here; T7 replaces that path with a Newton-Raphson loop solver.

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

describe('solveMates — tree topology', () => {
  it('produces identity world transform for a single root part', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('root', kcad.box(10, 10, 10))
      .connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    const result = await solveMates(arm);
    expect(result.status).toBe('solved');
    const rootT = result.poses.get('root')!;
    expect(rootT).toBeDefined();
    const { translate } = rootT.decomposeToTranslateAndRotate();
    expect(translate[0]).toBeCloseTo(0);
    expect(translate[1]).toBeCloseTo(0);
    expect(translate[2]).toBeCloseTo(0);
  });

  it('chains a 3-part tree with two fastened mates', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
    arm
      .part('b', kcad.box(5, 5, 5))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
    arm
      .part('c', kcad.box(2, 2, 2))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('a-b', 'a.top', 'b.bot', 'fastened');
    arm.mate('b-c', 'b.top', 'c.bot', 'fastened');
    const r = await solveMates(arm);
    expect(r.status).toBe('solved');
    // a is root at identity. b is fastened with a.top at z=10 → b's origin at z=10.
    // c is fastened with b.top at z=5 (in b's local frame) → c's origin at z=15.
    const aT = r.poses.get('a')!;
    const bT = r.poses.get('b')!;
    const cT = r.poses.get('c')!;
    expect(aT.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(0);
    expect(bT.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(10);
    expect(cT.decomposeToTranslateAndRotate().translate[2]).toBeCloseTo(15);
  });

});

describe('solveMates — closed loop (Newton-Raphson)', () => {
  it('returns redundant-ok on a triangle of consistent fastened mates', async () => {
    // 3 parts in a triangle: a-b, b-c, c-a; all fastened. The connector
    // positions make m3 redundant (it agrees with the tree FK at zero-pose),
    // so the loop is consistent and the solver reports 'redundant-ok'.
    const { arm, kcad } = makeArm();
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
    arm.mate('m3', 'c.t', 'a.p', 'fastened'); // closes the loop — consistent
    const r = await solveMates(arm);
    expect(r.status).toBe('redundant-ok');
    expect(r.iterations ?? 0).toBeLessThanOrEqual(50);
    // All three parts should still be placed.
    expect(r.poses.get('a')).toBeDefined();
    expect(r.poses.get('b')).toBeDefined();
    expect(r.poses.get('c')).toBeDefined();
  });

  it('reports over-constrained when the loop is geometrically inconsistent', async () => {
    // Triangle where mate connector positions disagree at zero-pose.
    // b.r at (1,0,0) lands at world (1,0,0); c.s at (0,0,0) makes c at (1,0,0);
    // c.t at (1,0,0) lands at world (2,0,0); m3 says it should equal a.p at
    // (0,0,0). Inconsistent by 2 mm — over-constrained.
    const { arm, kcad } = makeArm();
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
    const r = await solveMates(arm);
    expect(r.status).toBe('over-constrained');
  });

  // T7.x will add an assembly-level did-not-converge test once T9 wires
  // pose-driven articulation (revolute/prismatic) — closed loops over
  // articulated joints exercise the Newton-Raphson iteration path that a
  // pure fastened-only loop cannot trigger (zero free DOFs ⇒ no iteration).
  // For now, the iter-cap path is exercised indirectly via the
  // jacobian.test.ts unit suite (finite-difference Jacobian on non-linear f).
  it.skip('reports did-not-converge when iteration cap hits (deferred to T9)', () => {});
});
