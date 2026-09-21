// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import { reviewMechanicalIntent } from './mechanicalIntent';

function makeApi() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  return { arm: kcad.assembly('rig'), kcad };
}

describe('reviewMechanicalIntent', () => {
  it('reports a non-revolute mate and every missing referenced part', async () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(10, 10, 4))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('link', kcad.box(4, 4, 20))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('hinge', 'base.mount', 'link.mount', 'fastened');
    arm.mechanicalJoint('bad-mate', {
      mate: 'hinge',
      actuator: 'ghost-actuator',
      shaft: 'ghost-shaft',
      supports: ['ghost-support'],
      output: 'link',
    });

    const result = await reviewMechanicalIntent(arm);

    expect(result.checkedIntentCount).toBe(1);
    expect(result.diagnostics).toEqual([
      {
        code: 'assembly.mechanical.intent.mate-not-revolute',
        severity: 'error',
        intentName: 'bad-mate',
        mateName: 'hinge',
        mateType: 'fastened',
        message: "Mechanical intent 'bad-mate' expects mate 'hinge' to be revolute, but it is 'fastened'.",
        hint: 'mechanical-intent.mate-not-revolute — v1 mechanicalJoint contracts describe driven revolute joints; use a revolute mate or skip this contract.',
      },
      {
        code: 'assembly.mechanical.intent.part-missing',
        severity: 'error',
        intentName: 'bad-mate',
        role: 'actuator',
        partName: 'ghost-actuator',
        message: "Mechanical intent 'bad-mate' references missing actuator part 'ghost-actuator'.",
        hint: "mechanical-intent.part-missing — declare arm.part('ghost-actuator', ...) or update the mechanicalJoint actuator reference.",
      },
      {
        code: 'assembly.mechanical.intent.part-missing',
        severity: 'error',
        intentName: 'bad-mate',
        role: 'shaft',
        partName: 'ghost-shaft',
        message: "Mechanical intent 'bad-mate' references missing shaft part 'ghost-shaft'.",
        hint: "mechanical-intent.part-missing — declare arm.part('ghost-shaft', ...) or update the mechanicalJoint shaft reference.",
      },
      {
        code: 'assembly.mechanical.intent.part-missing',
        severity: 'error',
        intentName: 'bad-mate',
        role: 'support',
        partName: 'ghost-support',
        message: "Mechanical intent 'bad-mate' references missing support part 'ghost-support'.",
        hint: "mechanical-intent.part-missing — declare arm.part('ghost-support', ...) or update the mechanicalJoint support reference.",
      },
    ]);
  });

  it('reports unmounted actuator, unfixed support, uncaptured output, and off-axis shaft', async () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(10, 10, 4))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(4, 4, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.part('servo', kcad.box(4, 4, 4));
    arm
      .part('shaft', kcad.box(4, 4, 4))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
    arm.part('support', kcad.box(4, 4, 4));
    arm.mate('hinge', 'base.hinge', 'link.hinge', 'revolute', { limitsDeg: [-45, 45] });
    arm.mechanicalJoint('unrealized', {
      mate: 'hinge',
      actuator: 'servo',
      shaft: 'shaft',
      supports: ['support'],
      output: 'servo',
    });

    const result = await reviewMechanicalIntent(arm);

    expect(result.diagnostics).toEqual([
      {
        code: 'assembly.mechanical.intent.actuator-not-mounted',
        severity: 'error',
        intentName: 'unrealized',
        actuatorPartName: 'servo',
        message: "Mechanical intent 'unrealized' actuator 'servo' is not mounted by any fastened mate.",
        hint: "mechanical-intent.actuator-not-mounted — fasten 'servo' to a bracket, support, or frame part so the actuator has a physical load path.",
      },
      {
        code: 'assembly.mechanical.intent.support-missing',
        severity: 'error',
        intentName: 'unrealized',
        supportPartName: 'support',
        message: "Mechanical intent 'unrealized' support 'support' is not fixed to the assembly by any fastened mate.",
        hint: "mechanical-intent.support-missing — fasten 'support' to the frame, actuator bracket, or joint carrier.",
      },
      {
        code: 'assembly.mechanical.intent.output-not-captured',
        severity: 'error',
        intentName: 'unrealized',
        outputPartName: 'servo',
        mateName: 'hinge',
        message: "Mechanical intent 'unrealized' output 'servo' is not one side of mate 'hinge'.",
        hint: 'mechanical-intent.output-not-captured — set output to the driven link connected by the declared revolute mate.',
      },
      {
        code: 'assembly.mechanical.intent.shaft-not-on-axis',
        severity: 'error',
        intentName: 'unrealized',
        shaftPartName: 'shaft',
        mateName: 'hinge',
        distanceMm: 10,
        message: "Mechanical intent 'unrealized' shaft 'shaft' axis is 10.0 mm from mate 'hinge'.",
        hint: "mechanical-intent.shaft-not-on-axis — add an axis connector to 'shaft' and fasten the shaft so that connector lies on the revolute mate axis.",
      },
    ]);
  });

  it('reports a declared required support that does not reach the named connector', async () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(10, 10, 4))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('link', kcad.box(4, 4, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('bracket', kcad.box(2, 2, 2).translate(50, 0, 0))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('hinge', 'base.hinge', 'link.hinge', 'revolute', { limitsDeg: [-45, 45] });
    arm.mate('bracket-fix', 'base.mount', 'bracket.mount', 'fastened');
    arm.mechanicalJoint('supported-hinge', {
      mate: 'hinge',
      actuator: 'base',
      shaft: 'base',
      supports: ['bracket'],
      output: 'link',
      requiredSupport: {
        kind: 'hinge-bracket',
        around: 'link.hinge',
        supports: ['bracket'],
        minBearingLengthMm: 8,
      },
    });

    const result = await reviewMechanicalIntent(arm);

    expect(result.diagnostics).toEqual([
      {
        code: 'assembly.mechanical.intent.required-support-missing',
        severity: 'error',
        intentName: 'supported-hinge',
        supportKind: 'hinge-bracket',
        around: 'link.hinge',
        supportPartNames: ['bracket'],
        distanceMm: 49,
        minBearingLengthMm: 8,
        message: "Mechanical intent 'supported-hinge' requires hinge-bracket support around 'link.hinge', but modeled support does not reach that connector.",
        hint: "mechanical-intent.required-support-missing — add bearing/hinge/bracket material on bracket so it reaches 'link.hinge' and preserves clearance through the mate travel.",
      },
    ]);
  });
});
