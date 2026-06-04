import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { urdfSerialize } from '../../../../../src/modeling/export/urdf/urdfSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../../src/modeling/api';
import type { Vec3 } from '../../../../../src/shared/intent/types';

/** Helper: declare an axis connector on a part. */
function axisConn(part: ReturnType<ReturnType<typeof createApi>['assembly']>['part'], name: string, origin: Vec3, axis: Vec3) {
  part.connector(name, {
    type: 'axis',
    origin: { kind: 'vec3', value: origin },
    axis,
  });
}

/** Helper: declare a frame connector on a part. */
function frameConn(part: ReturnType<ReturnType<typeof createApi>['assembly']>['part'], name: string, origin: Vec3) {
  part.connector(name, {
    type: 'frame',
    origin: { kind: 'vec3', value: origin },
  });
}

/** Helper: declare a ball connector on a part. */
function ballConn(part: ReturnType<ReturnType<typeof createApi>['assembly']>['part'], name: string, origin: Vec3) {
  part.connector(name, {
    type: 'ball',
    origin: { kind: 'vec3', value: origin },
  });
}

describe('urdfSerialize — Task B3.C (G0 migrated to mate API)', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits a well-formed <robot> with one link per part and one joint per mate', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    const base = arm.part('base', kcad.box(20, 20, 20), { density: 2700 });
    const link = arm.part('link', kcad.box(80, 10, 10), { density: 2700 });
    axisConn(base, 'shoulder', [0, 0, 20], [0, 0, 1]);
    axisConn(link, 'shoulder', [0, 0, 0], [0, 0, 1]);
    arm.mate('shoulder', 'base.shoulder', 'link.shoulder', 'revolute', { limitsDeg: [-90, 90] });
    const r = await urdfSerialize(arm, {});
    expect(r.urdf).toMatch(/<robot name="two-link">/);
    expect((r.urdf.match(/<link /g) ?? []).length).toBe(2);
    expect((r.urdf.match(/<joint /g) ?? []).length).toBe(1);
    expect(r.urdf).toMatch(/<joint name="shoulder" type="revolute">/);
  });

  it('refuses export when the mate graph has a closed loop', async () => {
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
    const r = await urdfSerialize(arm, {});
    expect(r.urdf).toBe('');
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.closed-loop');
  });

  it('emits inertia-density-declared warning for any link without explicit density', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10));   // no density
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    axisConn(base, 'j', [10, 0, 0], [0, 0, 1]);
    axisConn(tip, 'j', [0, 0, 0], [0, 0, 1]);
    arm.mate('j', 'base.j', 'tip.j', 'revolute');
    const r = await urdfSerialize(arm, {});
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.inertia-density-declared');
  });

  it('emits ball-decomposed diagnostic and 3 chained joints for a ball mate', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    ballConn(base, 'shoulder', [0, 0, 10]);
    ballConn(tip, 'shoulder', [0, 0, 0]);
    arm.mate('shoulder', 'base.shoulder', 'tip.shoulder', 'ball');
    const r = await urdfSerialize(arm, {});
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.ball-decomposed');
    expect((r.urdf.match(/<joint /g) ?? []).length).toBe(3);
    // 2 dummy intermediate links present.
    expect(r.urdf).toMatch(/<link name="__shoulder_dummy_X">/);
  });

  it('emits package://kernelcad_export/meshes/<part>.stl by default', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    frameConn(base, 'j', [10, 0, 0]);
    frameConn(tip, 'j', [0, 0, 0]);
    arm.mate('j', 'base.j', 'tip.j', 'fastened');
    const r = await urdfSerialize(arm, {});
    expect(r.urdf).toMatch(/package:\/\/kernelcad_export\/meshes\/base\.stl/);
  });

  it('honors the meshPrefix option', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    frameConn(base, 'j', [10, 0, 0]);
    frameConn(tip, 'j', [0, 0, 0]);
    arm.mate('j', 'base.j', 'tip.j', 'fastened');
    const r = await urdfSerialize(arm, { meshPrefix: './meshes/' });
    expect(r.urdf).toMatch(/filename="\.\/meshes\/base\.stl"/);
  });
});
