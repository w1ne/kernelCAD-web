// src/modeling/capture/wrapGeom.test.ts
//
// P11 Slice 2 — capture-side validation for `part.wrapGeom(name, opts)`
// (collision-OFF tendon routing cylinders) and the `arm.tendon(...)`
// `wrapGeoms` reference list. Mirrors tendon.test.ts: a wrap geom must
// have a finite non-zero axis and positive radius, names are unique per
// part, and a tendon may only reference wrap geoms already declared on a
// real part.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('test');
  const a = kcad.box(10, 10, 100);
  const b = kcad.box(5, 5, 50);
  arm
    .part('a', a)
    .connector('topA', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
  arm
    .part('b', b)
    .connector('topB', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
  return { arm };
}

describe('part.wrapGeom(name, opts) — capture validation', () => {
  it('a part with no wrap geoms declared exposes an empty array', () => {
    const { arm } = makeArm();
    const part = arm.__parts().find((p) => p.name === 'a')!;
    expect(part.wrapGeoms).toEqual([]);
  });

  it('records a wrap geom through the builder chain', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('w');
    const a = kcad.box(10, 10, 100);
    arm
      .part('a', a)
      .wrapGeom('armWrap', { axis: [0, 0, 1], radius: 6, halfLengthMm: 40 });
    const part = arm.__parts().find((p) => p.name === 'a')!;
    expect(part.wrapGeoms).toHaveLength(1);
    expect(part.wrapGeoms[0]).toMatchObject({
      name: 'armWrap',
      axis: [0, 0, 1],
      origin: [0, 0, 0], // default
      radiusMm: 6,
      halfLengthMm: 40,
    });
  });

  it('omits halfLengthMm when not provided (infinite cylinder)', () => {
    const session = new CaptureSession();
    const arm = createApi({ session }).assembly('w');
    arm.part('a', createApi({ session }).box(10, 10, 100)).wrapGeom('w1', { axis: [1, 0, 0], radius: 4 });
    const part = arm.__parts()[0];
    expect(part.wrapGeoms[0].halfLengthMm).toBeUndefined();
  });

  it('rejects a duplicate wrap-geom name on the same part', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('w');
    const ref = arm.part('a', kcad.box(10, 10, 100));
    ref.wrapGeom('dup', { axis: [0, 0, 1], radius: 6 });
    expect(() => ref.wrapGeom('dup', { axis: [0, 0, 1], radius: 6 })).toThrow(
      /assembly\.wrap-geom\.duplicate-name/,
    );
  });

  it('rejects a zero-length axis', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('w');
    expect(() =>
      arm.part('a', kcad.box(10, 10, 100)).wrapGeom('w', { axis: [0, 0, 0], radius: 6 }),
    ).toThrow(/assembly\.wrap-geom\.invalid-axis/);
  });

  it('rejects a non-positive radius', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('w');
    expect(() =>
      arm.part('a', kcad.box(10, 10, 100)).wrapGeom('w', { axis: [0, 0, 1], radius: 0 }),
    ).toThrow(/assembly\.wrap-geom\.invalid-radius/);
  });

  it('rejects a non-positive halfLengthMm when provided', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('w');
    expect(() =>
      arm
        .part('a', kcad.box(10, 10, 100))
        .wrapGeom('w', { axis: [0, 0, 1], radius: 6, halfLengthMm: -1 }),
    ).toThrow(/assembly\.wrap-geom\.invalid-half-length/);
  });
});

describe('arm.tendon(...).wrapGeoms — routing reference validation', () => {
  function armWithWrap() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('t');
    arm
      .part('a', kcad.box(10, 10, 100))
      .connector('topA', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } })
      .wrapGeom('aWrap', { axis: [0, 0, 1], radius: 6, halfLengthMm: 40 });
    arm
      .part('b', kcad.box(5, 5, 50))
      .connector('topB', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
    return arm;
  }

  it('records a tendon that routes around a declared wrap geom', () => {
    const arm = armWithWrap();
    arm.tendon('spring', {
      from: 'a.topA',
      to: 'b.topB',
      restLengthMm: 30,
      stiffnessNmm: 0.5,
      wrapGeoms: [{ partName: 'a', wrapName: 'aWrap' }],
    });
    const t = arm.__tendons()[0];
    expect(t.wrapGeoms).toHaveLength(1);
    expect(t.wrapGeoms[0]).toMatchObject({ partName: 'a', wrapName: 'aWrap' });
  });

  it('defaults wrapGeoms to [] when omitted (straight tendon)', () => {
    const arm = armWithWrap();
    arm.tendon('s', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 });
    expect(arm.__tendons()[0].wrapGeoms).toEqual([]);
  });

  it('rejects a wrap geom on an unknown part', () => {
    const arm = armWithWrap();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        wrapGeoms: [{ partName: 'nope', wrapName: 'aWrap' }],
      }),
    ).toThrow(/assembly\.tendon\.unknown-wrap-part/);
  });

  it('rejects a reference to a wrap geom not declared on the part', () => {
    const arm = armWithWrap();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        wrapGeoms: [{ partName: 'a', wrapName: 'ghost' }],
      }),
    ).toThrow(/assembly\.tendon\.unknown-wrap-geom/);
  });
});
