// src/lib/mates/mountingHoleConsistency.test.ts
//
// v0.7.4 Gate 1 — fastened-mate mounting-hole consistency check. Each
// fastened mate's two bound faces must expose compatible hole features
// (matching diameter ±0.05 mm; combined depth admits a screw). The module
// is dead code until Phase 6 wires it into `validateAssemblyWithMates`;
// these tests pin the diagnostic shape and the per-fixture-class behaviour
// per spec `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 1.

import { describe, it, expect } from 'vitest';
import { validateMountingHoleConsistency } from './mountingHoleConsistency';
import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad, session };
}

describe('validateMountingHoleConsistency', () => {
  it('emits no diagnostic when both sides have matching M5 holes', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
    arm.part('a', a).connector('top-hole', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('bot-hole', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.top-hole', 'b.bot-hole', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(0);
  });

  it('emits assembly.mounting-hole.mismatch for diameter mismatch', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
    arm.part('a', a).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.mounting-hole.mismatch');
    expect(diags[0].severity).toBe('error');
    expect(diags[0].hint).toMatch(/5.*mm/);
    expect(diags[0].hint).toMatch(/6.*mm/);
    expect(diags[0].mateName).toBe('screw');
  });

  it('emits mismatch when one side has no hole on bound face', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5);   // no hole
    arm.part('a', a).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].hint).toMatch(/no hole feature/i);
  });

  it('through + sufficient-depth blind: no diagnostic', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 10).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 8 });
    arm.part('a', a).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(0);
  });

  it('non-fastened mate types are skipped', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
    arm.part('a', a).connector('h', { type: 'axis', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } }, axis: [0, 0, 1] });
    arm.part('b', b).connector('h', { type: 'axis', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.h', 'b.h', 'revolute');   // not fastened

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(0);
  });
});
