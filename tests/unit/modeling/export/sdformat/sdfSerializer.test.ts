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

  it('emits <sdf version="1.12"> + <model> + per-link inertial/visual/collision', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    const base = arm.part('base', kcad.box(20, 20, 8), { density: 2700 });
    const upper = arm.part('upper', kcad.box(80, 12, 8), { density: 2700 });
    axisConn(base, 'shoulder', [0, 0, 8], [0, 0, 1]);
    axisConn(upper, 'shoulder', [0, 0, 0], [0, 0, 1]);
    arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute', { limitsDeg: [-90, 90] });
    const r = await sdfSerialize(arm, {});
    expect(r.sdf).toMatch(/<sdf version="1\.12">/);
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
