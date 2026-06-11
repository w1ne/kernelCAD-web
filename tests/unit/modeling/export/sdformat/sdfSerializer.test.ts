import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { sdfSerialize } from '../../../../../src/modeling/export/sdformat/sdfSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../../src/modeling/api';
import type { Vec3 } from '../../../../../src/shared/intent/types';

function axisConn(part: ReturnType<ReturnType<typeof createApi>['assembly']>['part'], name: string, origin: Vec3, axis: Vec3) {
  part.connector(name, { type: 'axis', origin: { kind: 'vec3', value: origin }, axis });
}

function ballConn(part: ReturnType<ReturnType<typeof createApi>['assembly']>['part'], name: string, origin: Vec3) {
  part.connector(name, { type: 'ball', origin: { kind: 'vec3', value: origin } });
}

describe('sdfSerialize — Task B5.B (G0 migrated to mate API)', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits <sdf version="1.10"> + <model> + per-link inertial/visual/collision', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    const base = arm.part('base', kcad.box(20, 20, 8), { density: 2700 });
    const upper = arm.part('upper', kcad.box(80, 12, 8), { density: 2700 });
    axisConn(base, 'shoulder', [0, 0, 8], [0, 0, 1]);
    axisConn(upper, 'shoulder', [0, 0, 0], [0, 0, 1]);
    arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute', { limitsDeg: [-90, 90] });
    const r = await sdfSerialize(arm, {});
    expect(r.sdf).toMatch(/<sdf version="1\.10">/);
    expect(r.sdf).toMatch(/<model name="two-link">/);
    expect((r.sdf.match(/<link /g) ?? []).length).toBe(2);
    expect(r.sdf).toMatch(/<inertial>/);
  });

  it('accepts a closed 4-bar linkage (the URDF differentiator)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('4bar');
    const a = arm.part('a', kcad.box(10, 10, 10), { density: 2700 });
    const b = arm.part('b', kcad.box(10, 10, 10), { density: 2700 });
    const c = arm.part('c', kcad.box(10, 10, 10), { density: 2700 });
    const d = arm.part('d', kcad.box(10, 10, 10), { density: 2700 });
    axisConn(a, 'ab_a', [10, 0, 0], [0, 0, 1]);
    axisConn(b, 'ab_b', [0, 0, 0], [0, 0, 1]);
    axisConn(b, 'bc_b', [10, 0, 0], [0, 0, 1]);
    axisConn(c, 'bc_c', [0, 0, 0], [0, 0, 1]);
    axisConn(c, 'cd_c', [10, 0, 0], [0, 0, 1]);
    axisConn(d, 'cd_d', [0, 0, 0], [0, 0, 1]);
    axisConn(d, 'da_d', [10, 0, 0], [0, 0, 1]);
    axisConn(a, 'da_a', [0, 0, 0], [0, 0, 1]);
    arm.mate('ab', 'a.ab_a', 'b.ab_b', 'revolute');
    arm.mate('bc', 'b.bc_b', 'c.bc_c', 'revolute');
    arm.mate('cd', 'c.cd_c', 'd.cd_d', 'revolute');
    arm.mate('da', 'd.da_d', 'a.da_a', 'revolute');
    const r = await sdfSerialize(arm, {});
    expect(r.sdf).not.toBe('');
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    // No closed-loop diagnostic — SDF accepts loops natively.
    expect(r.diagnostics.map(d => d.code)).not.toContain('export.sdf-gazebo.closed-loop');
    // All 4 joints preserved.
    expect((r.sdf.match(/<joint /g) ?? []).length).toBe(4);
  });

  it('emits no decomposition for a ball mate (native ball)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    ballConn(base, 'shoulder', [0, 0, 10]);
    ballConn(tip, 'shoulder', [0, 0, 0]);
    arm.mate('shoulder', 'base.shoulder', 'tip.shoulder', 'ball');
    const r = await sdfSerialize(arm, {});
    expect((r.sdf.match(/<joint /g) ?? []).length).toBe(1);
    expect(r.sdf).toMatch(/<joint name="shoulder" type="ball">/);
  });
});

describe('sdfSerialize — simulator-consumable output (links posed, meshes scaled, loop solved)', () => {
  beforeAll(async () => { await initOcct(); });

  function parallelogram4Bar() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('fourbar');
    const ground = arm.part('ground', kcad.box(60, 10, 10), { density: 2700 });
    const crank = arm.part('crank', kcad.box(10, 10, 35), { density: 2700 });
    const coupler = arm.part('coupler', kcad.box(60, 10, 10), { density: 2700 });
    const rocker = arm.part('rocker', kcad.box(10, 10, 35), { density: 2700 });
    axisConn(ground, 'crankPivot', [5, 5, 5], [0, 1, 0]);
    axisConn(crank, 'groundPivot', [5, 5, 5], [0, 1, 0]);
    axisConn(crank, 'couplerPivot', [5, 5, 30], [0, 1, 0]);
    axisConn(coupler, 'crankPivot', [5, 5, 5], [0, 1, 0]);
    axisConn(coupler, 'rockerPivot', [55, 5, 5], [0, 1, 0]);
    axisConn(rocker, 'couplerPivot', [5, 5, 30], [0, 1, 0]);
    axisConn(rocker, 'groundPivot', [5, 5, 5], [0, 1, 0]);
    axisConn(ground, 'rockerPivot', [55, 5, 5], [0, 1, 0]);
    arm.mate('crank_ground', 'ground.crankPivot', 'crank.groundPivot', 'revolute');
    arm.mate('crank_coupler', 'crank.couplerPivot', 'coupler.crankPivot', 'revolute');
    arm.mate('coupler_rocker', 'coupler.rockerPivot', 'rocker.couplerPivot', 'revolute');
    arm.mate('rocker_ground', 'rocker.groundPivot', 'ground.rockerPivot', 'revolute');
    return arm;
  }

  it('emits per-link <pose> from the solved mate graph so links spawn assembled, not stacked at the origin', async () => {
    const arm = parallelogram4Bar();
    const r = await sdfSerialize(arm, {});
    // Loop closes at pose 0 → no pose-unsolved warning.
    expect(r.diagnostics.map(d => d.code)).not.toContain('export.sdf-gazebo.pose-unsolved');
    // coupler sits 25mm above the ground link, rocker 50mm along +X (metres in SDF).
    expect(r.sdf).toMatch(/<link name="coupler">\n {4}<pose>0\.000000 0\.000000 0\.025000 /);
    expect(r.sdf).toMatch(/<link name="rocker">\n {4}<pose>0\.050000 0\.000000 0\.000000 /);
  });

  it('warns pose-unsolved and falls back to identity link poses when the loop cannot close', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('badloop');
    const a = arm.part('a', kcad.box(10, 10, 10), { density: 2700 });
    const b = arm.part('b', kcad.box(10, 10, 10), { density: 2700 });
    axisConn(a, 'p', [0, 0, 0], [0, 0, 1]);
    axisConn(b, 'p', [0, 0, 0], [0, 0, 1]);
    axisConn(a, 'q', [10, 0, 0], [0, 0, 1]);
    axisConn(b, 'q', [20, 0, 0], [0, 0, 1]);
    arm.mate('m1', 'a.p', 'b.p', 'revolute');
    arm.mate('m2', 'a.q', 'b.q', 'revolute'); // disagrees with m1 by 10mm
    const r = await sdfSerialize(arm, {});
    expect(r.diagnostics.map(d => d.code)).toContain('export.sdf-gazebo.pose-unsolved');
    expect(r.sdf).toMatch(/<link name="a">\n {4}<pose>0 0 0 0 0 0<\/pose>/);
  });

  it('scales mesh geometry mm->m and defaults to a relative meshes/ uri the simulator resolves next to the .sdf', async () => {
    const arm = parallelogram4Bar();
    const r = await sdfSerialize(arm, {});
    expect(r.sdf).toMatch(/<uri>meshes\/ground\.stl<\/uri><scale>0\.001 0\.001 0\.001<\/scale>/);
    // One mesh emission request per part, so the writer can put real files on disk.
    expect(r.meshPaths.map(m => m.relPath).sort()).toEqual([
      'meshes/coupler.stl', 'meshes/crank.stl', 'meshes/ground.stl', 'meshes/rocker.stl',
    ]);
  });

  it('lowers a fixed world virtual joint to a native world-parent joint so the model spawns anchored', async () => {
    const arm = parallelogram4Bar();
    arm.virtualJoint('world_weld', { type: 'fixed', parentFrame: 'world', childLink: 'ground' });
    const r = await sdfSerialize(arm, {});
    expect(r.sdf).toMatch(/<joint name="world_weld" type="fixed"><parent>world<\/parent><child>ground<\/child><\/joint>/);
  });
});
