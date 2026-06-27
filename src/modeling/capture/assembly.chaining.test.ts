// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';

// `assembly.part(a).part(b).part(c)` must register every part on the SAME
// assembly and return the last part's ref. Previously `part()` returned a
// part-ref with no `.part(...)`, so only `part().connector()` chained and
// `part().part()` was a TypeError — agents had to break the chain into
// separate statements.

describe('Assembly.part(...) fluent chaining', () => {
  it('chains part(a).part(b).part(c) — all registered, last ref returned', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');

    const refC = arm
      .part('a', kcad.box(10, 10, 10))
      .part('b', kcad.box(10, 10, 10))
      .part('c', kcad.box(10, 10, 10));

    expect(refC.name).toBe('c');
    expect(refC.assemblyName).toBe('arm');
    expect(arm.__parts().map((p) => p.name)).toEqual(['a', 'b', 'c']);
    // Each chained part is a distinct feature, not an alias of the first.
    expect(new Set(arm.__parts().map((p) => p.id)).size).toBe(3);
  });

  it('a chained part still supports connector() and further chaining (no regression)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');

    const linkRef = arm
      .part('base', kcad.box(10, 10, 10))
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

    // connector(name, opts) still returns the part-ref it was called on.
    expect(linkRef.name).toBe('link');
    expect(linkRef.mateConnectors.map((c) => c.name)).toContain('axis');

    // ...and chaining another part after a connector still works.
    linkRef.part('tip', kcad.box(2, 2, 2));
    expect(arm.__parts().map((p) => p.name)).toEqual(['base', 'link', 'tip']);
  });
});

// Issue #535: `assembly.revolute(...)` was removed in v0.5 and the only way to
// declare a drivable revolute was reaching into internals. The public method is
// restored — it must capture the joint on the body-tree graph and drive FK.
describe('Assembly.revolute(...) capture', () => {
  it('captures a revolute joint with kind/axis/origin/limitsDeg', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');

    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10), { at: [0, 0, 10] });

    const ref = arm.revolute('hinge', base, link, {
      axis: [0, 1, 0],
      origin: [0, 0, 0],
      limitsDeg: [-90, 90],
    });

    expect(ref).toEqual({ id: ref.id, name: 'hinge', kind: 'revolute' });

    const joints = arm.__joints();
    expect(joints).toHaveLength(1);
    expect(joints[0]).toMatchObject({
      name: 'hinge',
      kind: 'revolute',
      parentPartId: base.id,
      childPartId: link.id,
      axis: [0, 1, 0],
      origin: [0, 0, 0],
      limitsDeg: [-90, 90],
    });
  });

  it('drives forward kinematics via solve({ hinge })', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');

    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10), { at: [0, 0, 10] });
    arm.revolute('hinge', base, link, { axis: [0, 1, 0], origin: [0, 0, 0] });

    const solved = arm.solve({ hinge: 60 });
    expect(solved.value('hinge')).toBe(60);
    // The driven child part has a defined world transform under the pose.
    expect(solved.transform('link')).toBeDefined();
  });

  it('rejects a non-finite axis', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10));

    expect(() =>
      arm.revolute('hinge', base, link, {
        axis: [Number.NaN, 0, 0],
        origin: [0, 0, 0],
      }),
    ).toThrow(/revolute joint axis must be a finite Vec3/);
  });
});
