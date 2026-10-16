// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mateClosure.test.ts
//
// Per-mate satisfaction (CADPilot-style) and solver failures named by mate
// (Onshape / SolidWorks-style), on real solver output.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { solveMates } from '../mates/solver';
import { checkMateClosure, type ClosureSample } from './mateClosure';

type V3 = [number, number, number];
const frame = (value: V3) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value } });
const axis = (value: V3) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value }, axis: [0, 0, 1] as V3 });

function api() {
  const session = new CaptureSession();
  return createModelingApi({ session });
}

async function sample(arm: Parameters<typeof solveMates>[0], name: string, poses = {}): Promise<ClosureSample> {
  const r = await solveMates(arm, poses);
  return { name, status: r.status, ...(r.loopResiduals ? { loopResiduals: r.loopResiduals } : {}) };
}

describe('checkMateClosure', () => {
  it('names the mate of an over-constrained fastened loop', async () => {
    const k = api();
    const arm = k.assembly('tri');
    const a = arm.part('a', k.box(10, 10, 10));
    const b = arm.part('b', k.box(10, 10, 10));
    const c = arm.part('c', k.box(10, 10, 10));
    a.connector('ab', frame([10, 0, 0])); b.connector('ab', frame([10, 0, 0]));
    b.connector('bc', frame([0, 10, 0])); c.connector('bc', frame([0, 10, 0]));
    c.connector('ca', frame([0, 0, 10])); a.connector('ca', frame([2, 0, 10]));
    arm.mate('ab', 'a.ab', 'b.ab', 'fastened');
    arm.mate('bc', 'b.bc', 'c.bc', 'fastened');
    arm.mate('ca', 'c.ca', 'a.ca', 'fastened');
    const rest = await sample(arm, 'rest');
    expect(rest.status).toBe('over-constrained');
    const [d] = checkMateClosure([rest]);
    expect(d.code).toBe('assembly.mate.over-constrained');
    expect(d.severity).toBe('error');
    // The BFS tree takes ab and ca from 'a'; bc closes the loop, so bc is named.
    expect(d.message).toBe("Mate 'bc' contradicts the other mates in its closed loop: at the rest pose its connectors are 2.00 mm apart.");
  });

  it('fails a loop mate that closes at rest but comes apart when a joint moves', async () => {
    const k = api();
    const arm = k.assembly('braced');
    const base = arm.part('base', k.box(40, 40, 10));
    const link = arm.part('link', k.box(40, 8, 4));
    base.connector('pivot', axis([0, 0, 10])); link.connector('pivot', axis([0, 0, 10]));
    base.connector('brace', frame([30, 0, 10])); link.connector('brace', frame([30, 0, 10]));
    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', { limitsDeg: [-10, 10] });
    arm.mate('brace', 'base.brace', 'link.brace', 'fastened');
    const samples = [await sample(arm, 'rest'), await sample(arm, 'hinge:10', { hinge: 10 })];
    const diags = checkMateClosure(samples);
    expect(diags.map((d) => d.code)).toEqual(['mechanism.mate-unsatisfied']);
    expect(diags[0].message).toMatch(/^Mate 'brace' is not satisfied when joint 'hinge' is at 10: its connectors are 5\.\d\d mm apart/);
  });

  it('passes an open chain: every mate is placed by the FK walk', async () => {
    const k = api();
    const arm = k.assembly('chain');
    const base = arm.part('base', k.box(40, 40, 10));
    const link = arm.part('link', k.box(40, 8, 4));
    base.connector('pivot', axis([0, 0, 10])); link.connector('pivot', axis([0, 0, 10]));
    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', { limitsDeg: [-10, 10] });
    const samples = [await sample(arm, 'rest'), await sample(arm, 'hinge:10', { hinge: 10 })];
    expect(checkMateClosure(samples)).toEqual([]);
  });
});
