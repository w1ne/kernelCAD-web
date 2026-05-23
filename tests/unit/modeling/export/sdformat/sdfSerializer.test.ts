import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { sdfSerialize } from '../../../../../src/modeling/export/sdformat/sdfSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../../src/modeling/api';

describe('sdfSerialize — Task B5.B', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits <sdf version="1.12"> + <model> + per-link inertial/visual/collision', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    const base = arm.part('base', kcad.box(20, 20, 8), { density: 2700 });
    const upper = arm.part('upper', kcad.box(80, 12, 8), { density: 2700 });
    arm.revolute('shoulder', base, upper, { axis: [0, 0, 1], origin: [0, 0, 8], limitsDeg: [-90, 90] });
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
    arm.revolute('ab', a, b, { axis: [0, 0, 1], origin: [10, 0, 0] });
    arm.revolute('bc', b, c, { axis: [0, 0, 1], origin: [10, 0, 0] });
    arm.revolute('cd', c, d, { axis: [0, 0, 1], origin: [10, 0, 0] });
    arm.revolute('da', d, a, { axis: [0, 0, 1], origin: [10, 0, 0] });
    const r = await sdfSerialize(arm, {});
    expect(r.sdf).not.toBe('');
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    // No closed-loop diagnostic — SDF accepts loops natively.
    expect(r.diagnostics.map(d => d.code)).not.toContain('export.sdf-gazebo.closed-loop');
    // All 4 joints preserved.
    expect((r.sdf.match(/<joint /g) ?? []).length).toBe(4);
  });

  it('emits no decomposition for a ball joint (native ball)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    arm.ball('shoulder', base, tip, { origin: [0, 0, 10] });
    const r = await sdfSerialize(arm, {});
    expect((r.sdf.match(/<joint /g) ?? []).length).toBe(1);
    expect(r.sdf).toMatch(/<joint name="shoulder" type="ball">/);
  });
});
