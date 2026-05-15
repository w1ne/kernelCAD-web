// src/lib/mates/jointAxisBinding.test.ts
//
// v0.7.4 Gate 2 — joint-axis-to-structure binding. Each
// revolute / prismatic / cylindrical mate's axis line must intersect a real
// face or edge of BOTH bound parts' BREP (no axes floating in space). The
// module is dead code until Phase 6 wires it into
// `validateAssemblyWithMates`; these tests pin the diagnostic shape and
// the per-fixture-class behaviour per spec
// `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 2.

import { describe, it, expect } from 'vitest';
import { validateJointAxisBinding } from './jointAxisBinding';
import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../../modules/api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('rig'), kcad, session };
}

describe('validateJointAxisBinding', () => {
  it('emits no diagnostic when the revolute axis passes through both parts bodies', async () => {
    const { arm, kcad } = makeArm();
    // partA spans [0..10]³ at world; partB spans [10..20]×[0..10]×[0..10].
    // Connector world origin = [5, 5, 5] (centre of partA, on the shared
    // face between the two boxes). Axis +X traverses partA's body from
    // x=0 to x=10 and partB's body from x=10 to x=20.
    arm
      .part('a', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [1, 0, 0] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [10, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 5] }, axis: [1, 0, 0] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');

    const diags = await validateJointAxisBinding(arm);
    expect(diags).toHaveLength(0);
  });

  it('emits assembly.joint-axis.unbound for both sides when the axis floats 50 mm offset from each body', async () => {
    const { arm, kcad } = makeArm();
    // Connector world origin lifted to z=50 (50 mm above both 10-tall
    // bodies). Axis +X traverses neither body.
    arm
      .part('a', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 50] }, axis: [1, 0, 0] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [10, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 50] }, axis: [1, 0, 0] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute');

    const diags = await validateJointAxisBinding(arm);
    expect(diags).toHaveLength(2);
    for (const d of diags) {
      expect(d.code).toBe('assembly.joint-axis.unbound');
      expect(d.severity).toBe('error');
      expect(d.mateName).toBe('hinge');
      expect(d.hint).toMatch(/joint-axis-unbound/);
      expect(d.hint).toMatch(/hinge/);
      expect(d.hint).toMatch(/revolute/);
    }
    const parts = diags.map((d) => d.partName).sort();
    expect(parts).toEqual(['a', 'b']);
  });

  it('emits one diagnostic naming partB only when the axis intersects partA but not partB', async () => {
    const { arm, kcad } = makeArm();
    // PartA at origin spans [0..10]³. PartB at at=[10,0,0] spans
    // [10..20]×[0..10]×[0..10]. Connector world origin = [5, 5, 5]
    // (inside partA), axis +Z. The vertical line at x=5 passes through
    // partA (x∈[0..10]) but misses partB (x∈[10..20]).
    arm
      .part('a', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [10, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 5] }, axis: [0, 0, 1] });
    arm.mate('prism', 'a.c', 'b.c', 'prismatic');

    const diags = await validateJointAxisBinding(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.joint-axis.unbound');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].mateName).toBe('prism');
    expect(diags[0].partName).toBe('b');
    expect(diags[0].hint).toMatch(/prismatic/);
    expect(diags[0].hint).toMatch(/part 'b'/);
  });

  it('skips ball / pin_slot / fastened / planar mates even when axes float free', async () => {
    const { arm, kcad } = makeArm();
    // Build five independent two-part sub-assemblies; one mate per pair
    // covering each non-gated type. All connectors are placed 50 mm above
    // both bodies, so a gated mate type would emit two diagnostics per
    // pair — Gate 2 must skip all of them and return zero diags.
    arm
      .part('a1', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('f', { type: 'frame', origin: { kind: 'vec3', value: [5, 5, 50] } });
    arm
      .part('a2', kcad.box(10, 10, 10), { at: [10, 0, 0] })
      .connector('f', { type: 'frame', origin: { kind: 'vec3', value: [-5, 5, 50] } });
    arm.mate('m_fastened', 'a1.f', 'a2.f', 'fastened');

    arm
      .part('b1', kcad.box(10, 10, 10), { at: [0, 30, 0] })
      .connector('p', { type: 'planar', origin: { kind: 'vec3', value: [5, 5, 50] }, normal: [0, 0, 1] });
    arm
      .part('b2', kcad.box(10, 10, 10), { at: [10, 30, 0] })
      .connector('p', { type: 'planar', origin: { kind: 'vec3', value: [-5, 5, 50] }, normal: [0, 0, 1] });
    arm.mate('m_planar', 'b1.p', 'b2.p', 'planar');

    arm
      .part('c1', kcad.box(10, 10, 10), { at: [0, 60, 0] })
      .connector('s', { type: 'ball', origin: { kind: 'vec3', value: [5, 5, 50] } });
    arm
      .part('c2', kcad.box(10, 10, 10), { at: [10, 60, 0] })
      .connector('s', { type: 'ball', origin: { kind: 'vec3', value: [-5, 5, 50] } });
    arm.mate('m_ball', 'c1.s', 'c2.s', 'ball');

    arm
      .part('d1', kcad.box(10, 10, 10), { at: [0, 90, 0] })
      .connector('a', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 50] }, axis: [1, 0, 0] });
    arm
      .part('d2', kcad.box(10, 10, 10), { at: [10, 90, 0] })
      .connector('a', { type: 'axis', origin: { kind: 'vec3', value: [-5, 5, 50] }, axis: [1, 0, 0] });
    arm.mate('m_pin_slot', 'd1.a', 'd2.a', 'pin_slot');

    const diags = await validateJointAxisBinding(arm);
    expect(diags).toHaveLength(0);
  });
});
