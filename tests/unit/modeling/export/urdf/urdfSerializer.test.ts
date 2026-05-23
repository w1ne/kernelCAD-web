import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { urdfSerialize } from '../../../../../src/modeling/export/urdf/urdfSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../../src/modeling/api';

describe('urdfSerialize — Task B3.C', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits a well-formed <robot> with one link per part and one joint per mate', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    const base = arm.part('base', kcad.box(20, 20, 20), { density: 2700 });
    const link = arm.part('link', kcad.box(80, 10, 10), { density: 2700 });
    arm.revolute('shoulder', base, link, { axis: [0, 0, 1], origin: [0, 0, 20], limitsDeg: [-90, 90] });
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
    arm.revolute('ab', a, b, { axis: [0, 0, 1], origin: [10, 0, 0] });
    arm.revolute('bc', b, c, { axis: [0, 0, 1], origin: [10, 0, 0] });
    arm.revolute('cd', c, d, { axis: [0, 0, 1], origin: [10, 0, 0] });
    arm.revolute('da', d, a, { axis: [0, 0, 1], origin: [10, 0, 0] });
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
    arm.revolute('j', base, tip, { axis: [0, 0, 1], origin: [10, 0, 0] });
    const r = await urdfSerialize(arm, {});
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.inertia-density-declared');
  });

  it('emits ball-decomposed diagnostic and 3 chained joints for a ball joint', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    arm.ball('shoulder', base, tip, { origin: [0, 0, 10] });
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
    arm.fixed('j', base, tip, { origin: [10, 0, 0] });
    const r = await urdfSerialize(arm, {});
    expect(r.urdf).toMatch(/package:\/\/kernelcad_export\/meshes\/base\.stl/);
  });

  it('honors the meshPrefix option', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    arm.fixed('j', base, tip, { origin: [10, 0, 0] });
    const r = await urdfSerialize(arm, { meshPrefix: './meshes/' });
    expect(r.urdf).toMatch(/filename="\.\/meshes\/base\.stl"/);
  });
});
