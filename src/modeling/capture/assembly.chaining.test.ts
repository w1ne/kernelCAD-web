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

    expect(typeof ref.id).toBe('string');
    expect(ref.id.length).toBeGreaterThan(0);
    expect(ref.name).toBe('hinge');
    expect(ref.kind).toBe('revolute');

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

  it('rejects a non-finite origin', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10));

    expect(() =>
      arm.revolute('hinge', base, link, {
        axis: [0, 1, 0],
        origin: [0, Number.POSITIVE_INFINITY, 0],
      }),
    ).toThrow(/revolute joint origin must be a finite Vec3/);
  });

  it('rejects limitsDeg with min >= max', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10));

    expect(() =>
      arm.revolute('hinge', base, link, {
        axis: [0, 1, 0],
        origin: [0, 0, 0],
        limitsDeg: [90, -90],
      }),
    ).toThrow(/revolute joint limitsDeg/);
  });
});

// Issue #536: a revolute declared via `arm.mate(name, a, b, 'revolute')` is a
// constraint, not a drivable joint — it is NOT in `arm.__joints()`. Posing it
// with `arm.solve({ <name>: deg })` used to fall through to forwardKinematics
// and crash with a cryptic `TypeError: Cannot read properties of undefined
// (reading 'kind')`. solve() must now reject the mate name with a clear
// diagnostic that names the key and points at the joint API.
describe('Assembly.solve(...) rejects posing a mate name (issue #536)', () => {
  const buildMate = () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(10, 10, 10), { at: [0, 0, 10] })
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute');
    return arm;
  };

  it('throws a clear "not a drivable joint" error naming the mate + the joint API', () => {
    const arm = buildMate();
    // The mate is a constraint, not a posable DOF — not in __joints().
    expect(arm.__joints()).toHaveLength(0);

    let thrown: unknown;
    try {
      arm.solve({ hinge: 30 } as Parameters<typeof arm.solve>[0]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    const msg = (thrown as Error).message;
    // Clear diagnostic, NOT the raw undefined-read crash.
    expect(msg).toMatch(/not a drivable joint/);
    expect(msg).toMatch(/hinge/);
    expect(msg).toMatch(/mate/);
    expect(msg).toMatch(/assembly\.revolute/);
    expect(msg).not.toMatch(/reading 'kind'/);
  });

  it('throws "not a drivable joint" for a totally unknown pose key too', () => {
    const arm = buildMate();
    expect(() =>
      arm.solve({ nope: 30 } as Parameters<typeof arm.solve>[0]),
    ).toThrow(/not a drivable joint/);
  });

  it('still solves a real joint pose (no regression)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10), { at: [0, 0, 10] });
    arm.revolute('hinge', base, link, { axis: [0, 1, 0], origin: [0, 0, 0] });

    const solved = arm.solve({ hinge: 45 });
    expect(solved.value('hinge')).toBe(45);
    expect(solved.transform('link')).toBeDefined();
  });
});
