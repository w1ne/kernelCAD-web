// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import {
  collectRegistryDrivenMates,
  isRegistryCompleteMechanicalJointIntent,
} from './mechanicalJointRegistry';

function makeApi() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  return { arm: kcad.assembly('enc'), kcad };
}

describe('mechanicalJointRegistry', () => {
  it('marks lid-hinge driven when shaft and output both name the lid', () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(120, 80, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
    arm
      .part('lid', kcad.box(120, 80, 10))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
    arm.part('friction-hinge-cartridge', kcad.cylinder(8, 4));
    arm.mate('lid-hinge', 'base.hinge', 'lid.hinge', 'revolute', { limitsDeg: [0, 115] });
    arm.mechanicalJoint('lid-friction-drive', {
      mate: 'lid-hinge',
      actuator: 'friction-hinge-cartridge',
      shaft: 'lid',
      supports: ['base'],
      output: 'lid',
    });

    const intent = arm.__mechanicalJointIntents()[0]!;
    const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
    const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));

    expect(isRegistryCompleteMechanicalJointIntent(intent, matesByName, partsByName)).toBe(true);
    expect([...collectRegistryDrivenMates(arm)]).toEqual(['lid-hinge']);
  });

  it('rejects intents with a missing support part', () => {
    const intent = {
      name: 'bad',
      mate: 'hinge',
      actuator: 'base',
      shaft: 'base',
      supports: ['missing'],
      output: 'lid',
    };
    const matesByName = new Map([
      ['hinge', { name: 'hinge', a: 'base.hinge', b: 'lid.hinge', type: 'revolute' as const }],
    ]);
    const partsByName = new Map([
      ['base', {}],
      ['lid', {}],
    ]);
    expect(isRegistryCompleteMechanicalJointIntent(intent, matesByName, partsByName)).toBe(false);
  });
});
