// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Gate: mixing the two assembly conventions. Joint primitives are URDF —
// `origin` is the parent->child frame offset and the child is modeled about
// its own origin. `.mate()` + connectors treat the origin as a pivot and
// preserve the modeled position at pose 0. Mixing them silently displaces the
// child by the joint origin at EVERY pose, including 0.
//
// The false-positive cases below matter more than the positive one: a
// correctly-authored URDF link must stay silent, or the warning is noise and
// gets ignored.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { validateJointConventionMix } from './jointConventionMix';

const CODE = 'assembly.joint.child-modeled-in-place';

function api() {
  const session = new CaptureSession();
  return createApi({ session });
}

describe('validateJointConventionMix', () => {
  it('warns when a joint primitive drives a part placed by .translate(...)', () => {
    const kcad = api();
    const arm = kcad.assembly('hinge');
    const base = arm.part('base', kcad.box(60, 40, 10));
    // Modeled in place, resting on the base — the natural thing to write.
    const link = arm.part('arm', kcad.box(50, 10, 8).translate(5, 15, 12));
    arm.revolute('elbow', base, link, { axis: [0, -1, 0], origin: [5, 20, 16] });

    const d = validateJointConventionMix(arm);
    expect(d).toHaveLength(1);
    expect(d[0].code).toBe(CODE);
    expect(d[0].severity).toBe('warning');
    expect(d[0].partName).toBe('arm');
    // The message must name both the joint and the offset, or it isn't actionable.
    expect(d[0].message).toContain("'elbow'");
    expect(d[0].message).toContain('5, 20, 16');
    // And the hint must offer BOTH exits, not just one.
    expect(d[0].hint).toContain('arm.mate(');
    expect(d[0].hint).toContain('about its own origin');
  });

  it('warns when the part was placed via part(..., { at })', () => {
    const kcad = api();
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10), { at: [0, 0, 10] });
    arm.revolute('j', base, link, { axis: [0, 0, 1], origin: [0, 0, 10] });

    expect(validateJointConventionMix(arm).map((x) => x.code)).toEqual([CODE]);
  });

  // ---- false-positive controls -------------------------------------------

  it('stays silent on a correctly-authored URDF link (modeled about its own origin)', () => {
    const kcad = api();
    const arm = kcad.assembly('robot');
    const base = arm.part('base', kcad.box(10, 10, 10));
    // No placement: the joint origin alone positions the link. This is the
    // convention the robotics stack and checkReachable depend on.
    const link = arm.part('link', kcad.box(10, 10, 10));
    arm.revolute('shoulder', base, link, { axis: [0, 1, 0], origin: [0, 0, 10] });

    expect(validateJointConventionMix(arm)).toEqual([]);
  });

  it('stays silent when the joint origin is zero — the conventions agree there', () => {
    const kcad = api();
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10).translate(0, 0, 10));
    arm.revolute('j', base, link, { axis: [0, 0, 1], origin: [0, 0, 0] });

    expect(validateJointConventionMix(arm)).toEqual([]);
  });

  it('stays silent for a mate-based assembly — mates use the pivot convention', () => {
    const kcad = api();
    const arm = kcad.assembly('hinge');
    const base = arm.part('base', kcad.box(60, 40, 10));
    const link = arm.part('arm', kcad.box(50, 10, 8).translate(5, 15, 12));
    base.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 20, 16] }, axis: [0, 1, 0] });
    link.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 20, 16] }, axis: [0, 1, 0] });
    arm.mate('elbow', 'base.pivot', 'arm.pivot', 'revolute', { limitsDeg: [0, 90] });

    expect(validateJointConventionMix(arm)).toEqual([]);
  });

  it('does not treat a link BUILT from translated primitives as placement', () => {
    const kcad = api();
    const arm = kcad.assembly('robot');
    const base = arm.part('base', kcad.box(10, 10, 10));
    // The union is the link's own shape, authored about its origin. The
    // .translate() here is interior construction, not placement — the
    // transform lands on the operand, not on the part's top-level shape.
    const body = kcad.box(10, 10, 10).union(kcad.box(4, 4, 4).translate(3, 3, 10));
    const link = arm.part('link', body);
    arm.revolute('j', base, link, { axis: [0, 0, 1], origin: [0, 0, 10] });

    expect(validateJointConventionMix(arm)).toEqual([]);
  });

  it('reports one diagnostic per offending joint in a chain', () => {
    const kcad = api();
    const arm = kcad.assembly('chain');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10).translate(0, 0, 10));
    const c = arm.part('c', kcad.box(10, 10, 10).translate(0, 0, 20));
    arm.revolute('j1', a, b, { axis: [0, 0, 1], origin: [0, 0, 10] });
    arm.revolute('j2', b, c, { axis: [0, 0, 1], origin: [0, 0, 20] });

    const d = validateJointConventionMix(arm);
    expect(d).toHaveLength(2);
    expect(d.map((x) => x.partName)).toEqual(['b', 'c']);
  });
});

// Wiring check. A gate that is never called by the real validator is not a
// gate — it is dead code that reads green. This drives the same entry point
// `verify assembly` / `review_cad` / `solvedModel({ validate })` use.
describe('validateJointConventionMix — reaches the real validator', () => {
  it('surfaces through validateAssemblyWithMates, not just the unit function', async () => {
    const { validateAssemblyWithMates } = await import('./validator');
    const kcad = api();
    const arm = kcad.assembly('hinge');
    const base = arm.part('base', kcad.box(60, 40, 10));
    const link = arm.part('arm', kcad.box(50, 10, 8).translate(5, 15, 12));
    arm.revolute('elbow', base, link, { axis: [0, -1, 0], origin: [5, 20, 16] });

    const result = await validateAssemblyWithMates(arm);
    const hit = result.diagnostics.find((d) => d.code === CODE);
    expect(hit).toBeDefined();
    expect(hit?.partName).toBe('arm');
  });
});
