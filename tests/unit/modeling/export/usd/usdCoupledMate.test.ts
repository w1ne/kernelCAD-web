// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { usdIsaacSerialize } from '../../../../../src/modeling/export/usd/usdIsaacSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../../src/modeling/api';
import type { Vec3 } from '../../../../../src/shared/intent/types';

type Part = ReturnType<ReturnType<typeof createModelingApi>['assembly']>['part'];

function axisConn(part: Part, name: string, origin: Vec3, axis: Vec3) {
  part.connector(name, { type: 'axis', origin: { kind: 'vec3', value: origin }, axis });
}

/** base carries an input gear and an output gear on parallel revolutes. */
function gearPair() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('pair');
  const base = arm.part('base', kcad.box(60, 20, 10), { density: 2700 });
  const input = arm.part('input', kcad.cylinder(8, 5), { density: 2700 });
  const output = arm.part('output', kcad.cylinder(16, 5), { density: 2700 });
  axisConn(base, 'in', [0, 0, 10], [0, 0, 1]);
  axisConn(base, 'out', [24, 0, 10], [0, 0, 1]);
  axisConn(input, 'hub', [0, 0, 0], [0, 0, 1]);
  axisConn(output, 'hub', [0, 0, 0], [0, 0, 1]);
  arm.mate('input', 'base.in', 'input.hub', 'revolute', { limitsDeg: [-180, 180] });
  arm.mate('output', 'base.out', 'output.hub', 'revolute', { limitsDeg: [-90, 90] });
  return arm;
}

describe('usdIsaacSerialize — coupleMates on the UsdPhysics target', () => {
  beforeAll(async () => { await initOcct(); });

  it('warns that a coupling is not carried, naming the driven and source mates', async () => {
    const arm = gearPair();
    arm.coupleMates('output', { source: 'input', ratio: -0.5 });
    const { usda, diagnostics } = await usdIsaacSerialize(arm, {});
    // The stage still exports; the coupled joint ships as a free revolute.
    expect(usda).toContain('PhysicsRevoluteJoint "output"');
    expect(usda).not.toContain('Mimic');
    const dropped = diagnostics.filter((d) => d.code === 'export.usd.coupling-dropped');
    expect(dropped).toHaveLength(1);
    expect(dropped[0].severity).toBe('warn');
    expect(dropped[0].message).toContain("'output'");
    expect(dropped[0].message).toContain("'input'");
    expect(dropped[0].message).toContain('-0.5');
    expect(dropped[0].nextAction).toBeDefined();
  });

  it('an uncoupled assembly emits no coupling diagnostic', async () => {
    const { diagnostics } = await usdIsaacSerialize(gearPair(), {});
    expect(diagnostics.some((d) => d.code === 'export.usd.coupling-dropped')).toBe(false);
  });
});
