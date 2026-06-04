// src/modeling/mates/tendon.test.ts
//
// P7 — capture-side validation for `arm.tendon(name, opts)`. Verifies the
// minimum invariants that keep the MJCF emitter and Studio renderer
// downstream safe: unique tendon name, both endpoints reference declared
// connectors on different parts, and all numeric inputs are positive
// (damping >= 0).

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('test');
  // Two boxes with one frame-connector each; enough to attach a tendon
  // between them.
  const a = kcad.box(10, 10, 10);
  const b = kcad.box(5, 5, 5);
  arm
    .part('a', a)
    .connector('topA', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
  arm
    .part('b', b)
    .connector('topB', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
  return arm;
}

describe('arm.tendon(name, opts) — capture validation', () => {
  it('records a tendon between two declared connectors', () => {
    const arm = makeArm();
    arm.tendon('spring-1', {
      from: 'a.topA',
      to: 'b.topB',
      restLengthMm: 30,
      stiffnessNmm: 0.5,
    });
    const tendons = arm.__tendons();
    expect(tendons).toHaveLength(1);
    expect(tendons[0].name).toBe('spring-1');
    expect(tendons[0].from).toBe('a.topA');
    expect(tendons[0].to).toBe('b.topB');
    expect(tendons[0].restLengthMm).toBe(30);
    expect(tendons[0].stiffnessNmm).toBe(0.5);
    expect(tendons[0].dampingNsmm).toBe(0); // default
    expect(tendons[0].visualDiameterMm).toBe(3); // default
    // P10 defaults: visual style 'line' (back-compat) + coil dims that
    // satisfy the coil > 2 * wire validator if the user later switches.
    expect(tendons[0].visualStyle).toBe('line');
    expect(tendons[0].coilTurns).toBe(10);
    expect(tendons[0].coilDiameterMm).toBe(7);
  });

  it('records visualStyle: coil + custom coil dimensions (P10)', () => {
    const arm = makeArm();
    arm.tendon('coil-spring', {
      from: 'a.topA',
      to: 'b.topB',
      restLengthMm: 30,
      stiffnessNmm: 0.6,
      visualStyle: 'coil',
      coilTurns: 12,
      coilDiameterMm: 8,
      visualDiameterMm: 1.2,
    });
    const t = arm.__tendons()[0];
    expect(t.visualStyle).toBe('coil');
    expect(t.coilTurns).toBe(12);
    expect(t.coilDiameterMm).toBe(8);
    expect(t.visualDiameterMm).toBe(1.2);
  });

  it('rejects coilTurns < 1 (P10)', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        visualStyle: 'coil',
        coilTurns: 0,
      }),
    ).toThrow(/assembly\.tendon\.invalid-coil-turns/);
  });

  it('rejects coilDiameterMm <= 2 * visualDiameterMm when visualStyle is coil (P10)', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        visualStyle: 'coil',
        coilDiameterMm: 4,
        visualDiameterMm: 2.5, // 4 <= 2*2.5 = 5 → reject
      }),
    ).toThrow(/assembly\.tendon\.invalid-coil-diameter/);
  });

  it('rejects unknown visualStyle (P10)', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        visualStyle: 'helix' as unknown as 'line',
      }),
    ).toThrow(/assembly\.tendon\.invalid-visual-style/);
  });

  it('honors explicit damping + visualDiameter', () => {
    const arm = makeArm();
    arm.tendon('s', {
      from: 'a.topA',
      to: 'b.topB',
      restLengthMm: 30,
      stiffnessNmm: 0.5,
      dampingNsmm: 0.02,
      visualDiameterMm: 4,
    });
    const t = arm.__tendons()[0];
    expect(t.dampingNsmm).toBe(0.02);
    expect(t.visualDiameterMm).toBe(4);
  });

  it('rejects duplicate tendon name', () => {
    const arm = makeArm();
    arm.tendon('s', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 });
    expect(() =>
      arm.tendon('s', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.duplicate-name/);
  });

  it('rejects malformed connector ref', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', { from: 'no-dot', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.connector-not-found/);
  });

  it('rejects unknown part name', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', { from: 'ghost.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.connector-not-found/);
  });

  it('rejects unknown connector on declared part', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', { from: 'a.missing', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.connector-not-found/);
  });

  it('rejects both endpoints on the same part', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('t');
    arm
      .part('lone', kcad.box(10, 10, 10))
      .connector('c1', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('c2', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
    expect(() =>
      arm.tendon('s', { from: 'lone.c1', to: 'lone.c2', restLengthMm: 30, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.same-body-endpoints/);
  });

  it('rejects non-positive rest length', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', { from: 'a.topA', to: 'b.topB', restLengthMm: 0, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.invalid-rest-length/);
    expect(() =>
      arm.tendon('s2', { from: 'a.topA', to: 'b.topB', restLengthMm: -5, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.invalid-rest-length/);
    expect(() =>
      arm.tendon('s3', { from: 'a.topA', to: 'b.topB', restLengthMm: Number.NaN, stiffnessNmm: 0.5 }),
    ).toThrow(/assembly\.tendon\.invalid-rest-length/);
  });

  it('rejects non-positive stiffness', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: 0 }),
    ).toThrow(/assembly\.tendon\.invalid-stiffness/);
    expect(() =>
      arm.tendon('s2', { from: 'a.topA', to: 'b.topB', restLengthMm: 30, stiffnessNmm: -1 }),
    ).toThrow(/assembly\.tendon\.invalid-stiffness/);
  });

  it('rejects negative damping', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        dampingNsmm: -0.1,
      }),
    ).toThrow(/assembly\.tendon\.invalid-damping/);
  });

  it('rejects non-positive visualDiameter', () => {
    const arm = makeArm();
    expect(() =>
      arm.tendon('s', {
        from: 'a.topA',
        to: 'b.topB',
        restLengthMm: 30,
        stiffnessNmm: 0.5,
        visualDiameterMm: 0,
      }),
    ).toThrow(/assembly\.tendon\.invalid-visual-diameter/);
  });

  it('accepts damping = 0 explicitly', () => {
    const arm = makeArm();
    arm.tendon('s', {
      from: 'a.topA',
      to: 'b.topB',
      restLengthMm: 30,
      stiffnessNmm: 0.5,
      dampingNsmm: 0,
    });
    expect(arm.__tendons()[0].dampingNsmm).toBe(0);
  });

  it('returns `this` for chaining', () => {
    const arm = makeArm();
    const result = arm.tendon('s', {
      from: 'a.topA',
      to: 'b.topB',
      restLengthMm: 30,
      stiffnessNmm: 0.5,
    });
    expect(result).toBe(arm);
  });

  it('__tendons() returns empty array when no tendon declared', () => {
    const arm = makeArm();
    expect(arm.__tendons()).toEqual([]);
  });
});
