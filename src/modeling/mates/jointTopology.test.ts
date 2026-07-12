// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import type { Assembly } from '../capture/assembly';
import { reviewJointTopology, type JointTopologyDiagnosticCode } from './jointTopology';

function makeApi() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('hand'), kcad };
}

function codesOf(arm: Assembly): JointTopologyDiagnosticCode[] {
  return reviewJointTopology(arm).diagnostics.map((diagnostic) => diagnostic.code);
}

function armLike(overrides: {
  parts?: unknown[];
  mates?: unknown[];
  physicalUseCases?: unknown[];
  mechanicalJointIntents?: unknown[];
  jointSupportIntents?: unknown[];
}): Assembly {
  return {
    __parts: () => overrides.parts ?? [],
    __mates: () => overrides.mates ?? [],
    __physicalUseCases: () => overrides.physicalUseCases ?? [],
    __mechanicalJointIntents: () => overrides.mechanicalJointIntents ?? [],
    __jointSupportIntents: () => overrides.jointSupportIntents ?? [],
  } as unknown as Assembly;
}

describe('reviewJointTopology', () => {
  it('reports floating moving parts isolated from physical-use-case stable roots', () => {
    const { arm, kcad } = makeApi();
    arm.part('base', kcad.box(10, 10, 4));
    arm
      .part('finger-proximal', kcad.box(4, 4, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('finger-distal', kcad.box(4, 4, 18))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('knuckle', 'finger-proximal.hinge', 'finger-distal.hinge', 'revolute', {
      limitsDeg: [-20, 80],
    });
    arm.mechanicalJoint('knuckle-support', {
      mate: 'knuckle',
      actuator: 'finger-proximal',
      shaft: 'finger-proximal',
      supports: ['finger-proximal'],
      output: 'finger-distal',
    });
    arm.physicalUseCase('grasp', {
      stableParts: ['base'],
      loads: [{ part: 'finger-distal', force: [0, 0, -1] }],
    });

    const result = reviewJointTopology(arm);

    expect(result.checkedMateCount).toBe(1);
    expect(result.checkedMovingPartCount).toBe(2);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'assembly.connectivity.floating-moving-part',
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'assembly.connectivity.no-load-path',
    );
  });

  it('reports a missing rotational limit on a revolute mate', () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(10, 10, 4))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(4, 4, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.hinge', 'link.hinge', 'revolute');
    arm.mechanicalJoint('hinge-support', {
      mate: 'hinge',
      actuator: 'base',
      shaft: 'base',
      supports: ['base'],
      output: 'link',
    });

    expect(codesOf(arm)).toContain('assembly.joint-topology.missing-limit');
  });

  it('reports unsupported revolute axes without mechanical joint intent', () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(10, 10, 4))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(4, 4, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'base.hinge', 'link.hinge', 'revolute', { limitsDeg: [-45, 45] });

    const diagnostics = reviewJointTopology(arm).diagnostics;
    const unsupportedAxis = diagnostics.find((diagnostic) => diagnostic.code === 'assembly.joint-topology.unsupported-axis');

    expect(unsupportedAxis).toBeTruthy();
    expect(unsupportedAxis?.hint).toContain('jointSupport');
    expect(unsupportedAxis?.hint).toContain('mechanicalJoint');
  });

  it('reports missing connectors and invalid axes from stored mate records', () => {
    const arm = armLike({
      parts: [
        {
          name: 'base',
          mateConnectors: [
            { name: 'hinge', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 0] },
          ],
        },
        { name: 'link', mateConnectors: [] },
      ],
      mates: [
        {
          name: 'hinge',
          a: 'base.hinge',
          b: 'link.missing',
          type: 'revolute',
          limitsDeg: [-45, 45],
        },
      ],
      mechanicalJointIntents: [{ mate: 'hinge' }],
    });

    expect(codesOf(arm)).toEqual(
      expect.arrayContaining([
        'assembly.joint-topology.connector-missing',
        'assembly.joint-topology.axis-invalid',
      ]),
    );
  });

  it('reports invalid axes on prismatic mates', () => {
    const arm = armLike({
      parts: [
        {
          name: 'base',
          mateConnectors: [
            { name: 'slide', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 0] },
          ],
        },
        {
          name: 'carriage',
          mateConnectors: [
            { name: 'slide', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] },
          ],
        },
      ],
      mates: [
        {
          name: 'slide',
          a: 'base.slide',
          b: 'carriage.slide',
          type: 'prismatic',
          limitsMm: [0, 10],
        },
      ],
    });

    expect(codesOf(arm)).toContain('assembly.joint-topology.axis-invalid');
  });

  it('reports mismatched endpoint axes on revolute mates', () => {
    const arm = armLike({
      parts: [
        {
          name: 'base',
          mateConnectors: [
            { name: 'hinge', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] },
          ],
        },
        {
          name: 'link',
          mateConnectors: [
            { name: 'hinge', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] },
          ],
        },
      ],
      mates: [
        {
          name: 'hinge',
          a: 'base.hinge',
          b: 'link.hinge',
          type: 'revolute',
          limitsDeg: [-45, 45],
        },
      ],
      mechanicalJointIntents: [
        { mate: 'hinge', actuator: 'base', shaft: 'base', supports: ['base'], output: 'link' },
      ],
    });

    expect(codesOf(arm)).toContain('assembly.joint-topology.axis-invalid');
  });

  it('does not accept fake support intents that do not capture the driven output', () => {
    const { arm, kcad } = makeApi();
    arm
      .part('base', kcad.box(10, 10, 4))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(4, 4, 20))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.part('fake-output', kcad.box(4, 4, 4));
    arm.mate('hinge', 'base.hinge', 'link.hinge', 'revolute', { limitsDeg: [-45, 45] });
    arm.mechanicalJoint('fake-hinge-support', {
      mate: 'hinge',
      actuator: 'base',
      shaft: 'base',
      supports: ['base'],
      output: 'fake-output',
    });

    expect(codesOf(arm)).toContain('assembly.joint-topology.unsupported-axis');
  });

  it('does not accept support intents whose supports are disconnected from the hinge support side', () => {
    const arm = armLike({
      parts: [
        {
          name: 'base',
          mateConnectors: [
            { name: 'hinge', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] },
          ],
        },
        {
          name: 'link',
          mateConnectors: [
            { name: 'hinge', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] },
          ],
        },
        { name: 'fake-actuator', mateConnectors: [] },
        { name: 'fake-shaft', mateConnectors: [] },
        { name: 'fake-support', mateConnectors: [] },
      ],
      mates: [
        {
          name: 'hinge',
          a: 'base.hinge',
          b: 'link.hinge',
          type: 'revolute',
          limitsDeg: [-45, 45],
        },
      ],
      mechanicalJointIntents: [
        {
          mate: 'hinge',
          actuator: 'fake-actuator',
          shaft: 'fake-shaft',
          supports: ['fake-support'],
          output: 'link',
        },
      ],
    });

    expect(codesOf(arm)).toContain('assembly.joint-topology.unsupported-axis');
  });

  it('accepts passive support intents for supported revolute hinges', () => {
    const arm = armLike({
      parts: [
        {
          name: 'proximal',
          role: 'structure',
          mateConnectors: [
            { name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] },
          ],
        },
        {
          name: 'middle',
          role: 'structure',
          mateConnectors: [
            { name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] },
          ],
        },
      ],
      mates: [{ name: 'pip', a: 'proximal.pip', b: 'middle.pip', type: 'revolute', limitsDeg: [0, 40] }],
      jointSupportIntents: [{ mate: 'pip', shaft: 'proximal', supports: ['proximal'], output: 'middle' }],
    });

    expect(codesOf(arm)).not.toContain('assembly.joint-topology.unsupported-axis');
  });

  it('rejects passive support intents disconnected from the hinge support side', () => {
    const arm = armLike({
      parts: [
        {
          name: 'proximal',
          role: 'structure',
          mateConnectors: [
            { name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] },
          ],
        },
        {
          name: 'middle',
          role: 'structure',
          mateConnectors: [
            { name: 'pip', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] },
          ],
        },
        { name: 'fake-shaft', role: 'structure', mateConnectors: [] },
        { name: 'fake-support', role: 'structure', mateConnectors: [] },
      ],
      mates: [{ name: 'pip', a: 'proximal.pip', b: 'middle.pip', type: 'revolute', limitsDeg: [0, 40] }],
      jointSupportIntents: [{ mate: 'pip', shaft: 'fake-shaft', supports: ['fake-support'], output: 'middle' }],
    });

    expect(codesOf(arm)).toContain('assembly.joint-topology.unsupported-axis');
  });

  it('does not require load paths for contact target load parts', () => {
    const arm = armLike({
      parts: [
        { name: 'palm-root', role: 'structure', mateConnectors: [] },
        { name: 'grasp-cylinder', role: 'contact-target', mateConnectors: [] },
      ],
      physicalUseCases: [
        {
          name: 'grasp',
          stableParts: ['palm-root'],
          loads: [{ part: 'grasp-cylinder', force: [0, 0, -3] }],
        },
      ],
    });

    expect(codesOf(arm)).not.toContain('assembly.connectivity.no-load-path');
  });

  it('accepts a supported hinge with a stable root, finite limits, and mechanical intent', () => {
    const { arm, kcad } = makeApi();
    arm
      .part('palm', kcad.box(20, 16, 4))
      .connector('index-hinge', {
        type: 'axis',
        origin: { kind: 'vec3', value: [8, 0, 2] },
        axis: [0, 1, 0],
      });
    arm
      .part('index-proximal', kcad.box(4, 4, 24))
      .connector('root', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
    arm.mate('index-knuckle', 'palm.index-hinge', 'index-proximal.root', 'revolute', {
      limitsDeg: [-30, 70],
    });
    arm.mechanicalJoint('index-knuckle-support', {
      mate: 'index-knuckle',
      actuator: 'palm',
      shaft: 'palm',
      supports: ['palm'],
      output: 'index-proximal',
    });
    arm.physicalUseCase('pinch', {
      stableParts: ['palm'],
      loads: [{ part: 'index-proximal', force: [0, 0, -1] }],
    });

    expect(reviewJointTopology(arm)).toEqual({
      diagnostics: [],
      checkedMateCount: 1,
      checkedMovingPartCount: 2,
    });
  });
});
