// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/tendonRouting.test.ts
//
// Capture-side validation for routed / actuated / strap tendons (`via`,
// `actuator`, `strap*`, `material`, `texture`) and for revolute joint
// stiffness options on `arm.mate`.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';

function makeArm() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('t');
  const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] }, axis: [0, 1, 0] as [number, number, number] };
  const pt = (x: number) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value: [x, 0, 5] as [number, number, number] } });
  arm.part('a', kcad.box(10, 10, 10)).connector('h', axis).connector('pa', pt(0));
  arm.part('b', kcad.box(10, 10, 10)).connector('h', axis).connector('pb', pt(5)).wrapGeom('rail', { axis: [0, 1, 0], radius: 3 });
  arm.part('c', kcad.box(10, 10, 10)).connector('pc', pt(8));
  return arm;
}

describe('arm.tendon — via routing', () => {
  it('records via entries in order and validates connector refs', () => {
    const arm = makeArm();
    arm.tendon('t', { from: 'a.pa', via: ['b.pb', { wrap: { partName: 'b', wrapName: 'rail' } }], to: 'c.pc', actuator: { kind: 'force', maxForceN: 5 } });
    const t = arm.__tendons()[0];
    expect(t.via).toEqual(['b.pb', { wrap: { partName: 'b', wrapName: 'rail' } }]);
    expect(() => makeArm().tendon('t', { from: 'a.pa', via: ['b.nope'], to: 'c.pc', actuator: { kind: 'force', maxForceN: 5 } })).toThrow(/assembly\.tendon\.connector-not-found/);
    expect(() => makeArm().tendon('t', { from: 'a.pa', via: ['zzz.pb'], to: 'c.pc', actuator: { kind: 'force', maxForceN: 5 } })).toThrow(/connector-not-found/);
    expect(() => makeArm().tendon('t', { from: 'a.pa', via: [{ wrap: { partName: 'b', wrapName: 'nope' } }], to: 'c.pc', actuator: { kind: 'force', maxForceN: 5 } })).toThrow(/unknown-wrap-geom/);
  });

  it('rejects via combined with the legacy wrapGeoms option', () => {
    expect(() => makeArm().tendon('t', {
      from: 'a.pa', via: ['b.pb'], to: 'c.pc', restLengthMm: 10, stiffnessNmm: 1,
      wrapGeoms: [{ partName: 'b', wrapName: 'rail' }],
    })).toThrow(/via-with-wrap-geoms/);
  });
});

describe('arm.tendon — actuator', () => {
  it('accepts an actuated tendon without stiffness / rest length', () => {
    const arm = makeArm();
    arm.tendon('t', { from: 'a.pa', to: 'c.pc', actuator: { kind: 'force', maxForceN: 40 } });
    const t = arm.__tendons()[0];
    expect(t.actuator).toEqual({ kind: 'force', maxForceN: 40 });
    expect(t.stiffnessNmm).toBeUndefined();
    expect(t.restLengthMm).toBeUndefined();
  });

  it('still requires positive stiffness and rest length for a passive tendon', () => {
    const base = { from: 'a.pa', to: 'c.pc' };
    expect(() => makeArm().tendon('t', base as never)).toThrow(/invalid-rest-length/);
    expect(() => makeArm().tendon('t', { ...base, restLengthMm: 10 } as never)).toThrow(/invalid-stiffness/);
    expect(() => makeArm().tendon('t', { ...base, restLengthMm: 10, stiffnessNmm: 0 })).toThrow(/invalid-stiffness/);
  });

  it('validates spring fields when given alongside an actuator, and maxForceN', () => {
    expect(() => makeArm().tendon('t', { from: 'a.pa', to: 'c.pc', actuator: { kind: 'force', maxForceN: 5 }, stiffnessNmm: -1 })).toThrow(/invalid-stiffness/);
    expect(() => makeArm().tendon('t', { from: 'a.pa', to: 'c.pc', actuator: { kind: 'force', maxForceN: 0 } })).toThrow(/invalid-actuator/);
  });
});

describe('arm.tendon — profile + material', () => {
  it('records a profile and a cleaned PBR material with textures', () => {
    const arm = makeArm();
    arm.tendon('t', {
      from: 'a.pa', to: 'c.pc', actuator: { kind: 'force', maxForceN: 5 },
      profile: { kind: 'flat', widthMm: 5, thicknessMm: 1.2 },
      material: { baseColor: '#e8dfc8', metalness: 3, textures: { albedo: { path: 'data:image/png;base64,AAAA' } } },
    });
    const t = arm.__tendons()[0];
    expect(t.profile).toEqual({ kind: 'flat', widthMm: 5, thicknessMm: 1.2 });
    expect(t.material).toMatchObject({ baseColor: '#e8dfc8', metalness: 1, textures: { albedo: { path: 'data:image/png;base64,AAAA' } } });
  });

  it('rejects a bad profile, axis and material', () => {
    const o = { from: 'a.pa', to: 'c.pc', actuator: { kind: 'force' as const, maxForceN: 5 } };
    expect(() => makeArm().tendon('t', { ...o, profile: { kind: 'flat', widthMm: 0, thicknessMm: 1 } })).toThrow(/invalid-profile/);
    expect(() => makeArm().tendon('t', { ...o, profile: { kind: 'flat', widthMm: 4, thicknessMm: 1, widthAxis: [0, 0, 0] } })).toThrow(/invalid-profile/);
    expect(() => makeArm().tendon('t', { ...o, material: { baseColor: '' } })).toThrow(/base-color|baseColor/);
  });
});

describe('arm.mate — joint compliance options', () => {
  function mateWith(opts: Record<string, unknown>, type: 'revolute' | 'cylindrical' = 'revolute') {
    const arm = makeArm();
    arm.part('d', createModelingApi({ session: new CaptureSession() }).box(5, 5, 5)).connector('h', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    return () => arm.mate('m', 'a.h', 'd.h', type, opts as never);
  }

  it('records stiffness, spring reference (outside limits ok) and damping', () => {
    const arm = makeArm();
    arm.part('d', createModelingApi({ session: new CaptureSession() }).box(5, 5, 5)).connector('h', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    arm.mate('m', 'a.h', 'd.h', 'revolute', { limitsDeg: [0, 90], stiffnessNmmPerDeg: 3, springRefDeg: -10, dampingNmmsPerDeg: 0.1 });
    expect(arm.__mates()[0]).toMatchObject({ stiffnessNmmPerDeg: 3, springRefDeg: -10, dampingNmmsPerDeg: 0.1 });
  });

  it('rejects negative stiffness / damping and non-finite values', () => {
    expect(mateWith({ stiffnessNmmPerDeg: -1 })).toThrow(/invalid-joint-dynamics/);
    expect(mateWith({ dampingNmmsPerDeg: -0.1 })).toThrow(/invalid-joint-dynamics/);
    expect(mateWith({ springRefDeg: Number.NaN })).toThrow(/invalid-joint-dynamics/);
  });

  it('rejects a prismatic option on a revolute mate and vice versa', () => {
    expect(mateWith({ stiffnessNmmPerDeg: 1 }, 'cylindrical')).toThrow(/joint-dynamics-type-mismatch/);
    expect(mateWith({ stiffnessNPerMm: 1 })).toThrow(/joint-dynamics-type-mismatch/);
  });
});
