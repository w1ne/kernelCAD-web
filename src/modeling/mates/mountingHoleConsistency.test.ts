// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/mountingHoleConsistency.test.ts
//
// v0.7.4 Gate 1 — fastened-mate mounting-hole consistency check. Each
// fastened mate's two bound faces must expose hole features one screw can
// use (equal diameter, or clearance over a tap drill / threaded hole of the
// same metric size; combined depth admits a screw). Hole-free faces are a
// rigid bond; unresolvable sides are `unverified`, never a mismatch.

import { describe, it, expect } from 'vitest';
import { observeFastenedMateHoles, validateMountingHoleConsistency } from './mountingHoleConsistency';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
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
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 12, depth: 'through' });
    arm.part('a', a).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.mounting-hole.mismatch');
    // Demoted to 'info' under the physics-grounded loop (P3, 2026-06-01):
    // the merge gate is mechanism.disconnect.
    expect(diags[0].severity).toBe('info');
    expect(diags[0].hint).toMatch(/5.*mm/);
    expect(diags[0].hint).toMatch(/12.*mm/);
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

  it('resolves a ParamRef hole diameter to its evaluated value (matching sides pass)', () => {
    const { arm, kcad } = makeArm();
    const dia = kcad.param('HoleDia', 5);
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: dia, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
    arm.part('a', a).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(0);
  });

  it('resolves a ParamRef hole diameter and reports a real mismatch (not "no hole")', () => {
    const { arm, kcad } = makeArm();
    const dia = kcad.param('HoleDia', 12);
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: dia, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
    arm.part('a', a).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
    arm.part('b', b).connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
    arm.mate('screw', 'a.h', 'b.h', 'fastened');

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('assembly.mounting-hole.mismatch');
    expect(diags[0].hint).toMatch(/12.*mm/);
    expect(diags[0].hint).toMatch(/5.*mm/);
    expect(diags[0].hint).not.toMatch(/no hole feature/i);
  });

  it('non-fastened mate types are skipped', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
    const b = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 12, depth: 'through' });
    arm.part('a', a).connector('h', { type: 'axis', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } }, axis: [0, 0, 1] });
    arm.part('b', b).connector('h', { type: 'axis', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.h', 'b.h', 'revolute');   // not fastened

    const diags = validateMountingHoleConsistency(arm);
    expect(diags).toHaveLength(0);
  });
  const faceCenter = (name: string) => ({ type: 'frame' as const, origin: { kind: 'topology' as const, query: { kind: 'face-center' as const, name } } });

  it('accepts an M3 clearance hole over an M3 tap drill (3.4 mm vs 2.5 mm)', () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 3.4, depth: 'through' })).connector('h', faceCenter('top'));
    arm.part('b', kcad.box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 2.5, depth: 6 })).connector('h', faceCenter('top'));
    arm.mate('screw', 'a.h', 'b.h', 'fastened');
    expect(validateMountingHoleConsistency(arm)).toEqual([]);
  });

  it('accepts a clearance hole over a hole({ thread }) of the same nominal size', () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 3.4, depth: 'through' })).connector('h', faceCenter('top'));
    arm.part('b', kcad.box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 3, depth: 6, thread: { pitch: 0.5 } })).connector('h', faceCenter('top'));
    arm.mate('screw', 'a.h', 'b.h', 'fastened');
    expect(validateMountingHoleConsistency(arm)).toEqual([]);
  });

  it('rejects a threaded hole over a tap drill of a different size (no side passes the screw shank)', () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 3, depth: 'through', thread: { pitch: 0.5 } })).connector('h', faceCenter('top'));
    arm.part('b', kcad.box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 2.5, depth: 6 })).connector('h', faceCenter('top'));
    arm.mate('screw', 'a.h', 'b.h', 'fastened');
    expect(validateMountingHoleConsistency(arm).map((d) => d.code)).toEqual(['assembly.mounting-hole.mismatch']);
  });

  it('a through hole drilled from the opposite face opens on the bound face', () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 3.4, depth: 'through' })).connector('h', faceCenter('bottom'));
    arm.part('b', kcad.box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 2.5, depth: 6 })).connector('h', faceCenter('top'));
    arm.mate('screw', 'a.h', 'b.h', 'fastened');
    expect(validateMountingHoleConsistency(arm)).toEqual([]);
  });

  it('two hole-free faces are a rigid (bonded / press-fit) attachment, not a mismatch', () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 20, 5)).connector('h', faceCenter('top'));
    arm.part('b', kcad.box(20, 20, 5)).connector('h', faceCenter('bottom'));
    arm.mate('glue', 'a.h', 'b.h', 'fastened');
    expect(validateMountingHoleConsistency(arm)).toEqual([]);
    expect(observeFastenedMateHoles(arm).map((o) => o.verdict)).toEqual(['rigid']);
  });

  it('a vec3-origin side is unverified (info, own code), never a mismatch', () => {
    const { arm, kcad } = makeArm();
    arm.part('a', kcad.box(20, 20, 5)).connector('h', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 5] } });
    arm.part('b', kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 7, depth: 'through' })).connector('h', faceCenter('bottom'));
    arm.mate('screw', 'a.h', 'b.h', 'fastened');
    const diags = validateMountingHoleConsistency(arm);
    expect(diags.map((d) => [d.code, d.severity, d.partA])).toEqual([['assembly.mounting-hole.unverified', 'info', 'a']]);
    expect(observeFastenedMateHoles(arm).map((o) => o.verdict)).toEqual(['unverified']);
  });
});
