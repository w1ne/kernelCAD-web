// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { urdfSerialize } from '../../../../../src/modeling/export/urdf/urdfSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../../src/modeling/api';
import type { Vec3 } from '../../../../../src/shared/intent/types';

type Part = ReturnType<ReturnType<typeof createModelingApi>['assembly']>['part'];

function axisConn(part: Part, name: string, origin: Vec3, axis: Vec3) {
  part.connector(name, { type: 'axis', origin: { kind: 'vec3', value: origin }, axis });
}

/** base carries an input gear (revolute) and an output stage (revolute or
 *  prismatic). coupleMates drives the output from the input. */
function gearTrain(outputType: 'revolute' | 'prismatic', withIdler = false) {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('train');
  const base = arm.part('base', kcad.box(60, 20, 10), { density: 2700 });
  const input = arm.part('input', kcad.cylinder(8, 5), { density: 2700 });
  const output = arm.part('output', kcad.cylinder(16, 5), { density: 2700 });
  axisConn(base, 'in', [0, 0, 10], [0, 0, 1]);
  axisConn(base, 'out', [24, 0, 10], outputType === 'revolute' ? [0, 0, 1] : [1, 0, 0]);
  axisConn(input, 'hub', [0, 0, 0], [0, 0, 1]);
  axisConn(output, 'hub', [0, 0, 0], outputType === 'revolute' ? [0, 0, 1] : [1, 0, 0]);
  arm.mate('input', 'base.in', 'input.hub', 'revolute', { limitsDeg: [-180, 180] });
  if (outputType === 'revolute') {
    arm.mate('output', 'base.out', 'output.hub', 'revolute', { limitsDeg: [-90, 90] });
  } else {
    arm.mate('output', 'base.out', 'output.hub', 'prismatic', { limitsMm: [0, 40] });
  }
  if (withIdler) {
    const idler = arm.part('idler', kcad.cylinder(10, 5), { density: 2700 });
    axisConn(base, 'idle', [12, 0, 10], [0, 0, 1]);
    axisConn(idler, 'hub', [0, 0, 0], [0, 0, 1]);
    arm.mate('idler', 'base.idle', 'idler.hub', 'revolute', { limitsDeg: [-360, 360] });
  }
  return arm;
}

function jointBlock(urdf: string, name: string): string {
  const m = urdf.match(new RegExp(`<joint name="${name}"[\\s\\S]*?</joint>`));
  expect(m, `joint '${name}' missing`).not.toBeNull();
  return m![0];
}

describe('urdfSerialize — coupleMates lowers to <mimic>', () => {
  beforeAll(async () => { await initOcct(); });

  it('a coupled revolute mimics its source with the authored ratio and offset', async () => {
    const arm = gearTrain('revolute');
    arm.coupleMates('output', { source: 'input', ratio: -0.5, offset: 10 });
    const { urdf } = await urdfSerialize(arm, {});
    // Both joints are angles, so the ratio is unitless; offset 10 deg -> rad.
    expect(jointBlock(urdf, 'output')).toContain(
      `<mimic joint="input" multiplier="-0.500000" offset="${(10 * Math.PI / 180).toFixed(6)}"/>`,
    );
    expect(jointBlock(urdf, 'input')).not.toContain('<mimic');
  });

  it('a rack driven by a pinion converts the multiplier from mm/deg to m/rad', async () => {
    const arm = gearTrain('prismatic');
    // 0.2 mm of travel per degree of pinion rotation.
    arm.coupleMates('output', { source: 'input', ratio: 0.2 });
    const { urdf } = await urdfSerialize(arm, {});
    const multiplier = (0.2 * 1e-3) / (Math.PI / 180);
    expect(jointBlock(urdf, 'output')).toContain(
      `<mimic joint="input" multiplier="${multiplier.toFixed(6)}" offset="0.000000"/>`,
    );
  });

  it('a chained coupling mimics the uncoupled root with the composed ratio and offset', async () => {
    const arm = gearTrain('prismatic', true);
    // Declared output-first: output = 0.2 * idler + 3 mm, idler = -2 * input + 5 deg,
    // so output = -0.4 * input + 4 mm.
    arm.coupleMates('output', { source: 'idler', ratio: 0.2, offset: 3 });
    arm.coupleMates('idler', { source: 'input', ratio: -2, offset: 5 });
    const { urdf } = await urdfSerialize(arm, {});
    const multiplier = (-0.4 * 1e-3) / (Math.PI / 180);
    expect(jointBlock(urdf, 'output')).toContain(
      `<mimic joint="input" multiplier="${multiplier.toFixed(6)}" offset="${(0.004).toFixed(6)}"/>`,
    );
    expect(jointBlock(urdf, 'idler')).toContain(
      `<mimic joint="input" multiplier="-2.000000" offset="${(5 * Math.PI / 180).toFixed(6)}"/>`,
    );
    expect(urdf).not.toContain('<mimic joint="idler"');
  });

  it('an uncoupled assembly emits no <mimic>', async () => {
    const { urdf } = await urdfSerialize(gearTrain('revolute'), {});
    expect(urdf).not.toContain('<mimic');
  });
});
