// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { reviewCadTool } from '../../agent/mcp/tools/reviewCad';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { CaptureSession } from '../capture/captureSession';

describe('joint.supportedServoRevolute', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('creates a seated servo actuator, fastened mount, and mechanical joint support contract', () => {
    const { kcad, arm } = makeSupportedArm();

    const result = kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.axis',
    });

    expect(result.actuatorPartName).toBe('curl-drive-servo');
    const servoPart = arm.__parts().find((part) => part.name === 'curl-drive-servo');
    expect(servoPart?.mateConnectors).toContainEqual(expect.objectContaining({
      name: 'mount',
      type: 'frame',
    }));
    expect(arm.__mechanicalJointIntents()).toContainEqual({
      name: 'curl-drive',
      mate: 'curl',
      actuator: 'curl-drive-servo',
      shaft: 'base',
      supports: ['base'],
      output: 'link',
      requiredSupport: {
        kind: 'hinge-bracket',
        around: 'base.axis',
        supports: ['base'],
        minBearingLengthMm: 8,
      },
    });
    expect(arm.__mates()).toContainEqual(
      expect.objectContaining({
        name: 'curl-drive-servo-fix',
        a: 'base.servo-mount',
        b: 'curl-drive-servo.mount',
        type: 'fastened',
      }),
    );
  });

  it('rejects supportMount on the moving output before mutating the assembly', () => {
    const { kcad, arm } = makeSupportedArm({ linkServoMount: true });
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'link.servo-mount',
      output: 'link',
      axis: 'base.axis',
    })).toThrow(/supportMount.*must be on support part 'base'/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('rejects a non-frame supportMount connector before mutating the assembly', () => {
    const { kcad, arm } = makeSupportedArm();
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.axis',
      output: 'link',
      axis: 'base.axis',
    })).toThrow(/supportMount.*must be a frame connector/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('rejects a duplicate helper call before adding another generated part or mate', () => {
    const { kcad, arm } = makeSupportedArm();
    const opts = {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.axis',
    };

    kcad.joint.supportedServoRevolute(arm, opts);
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, opts))
      .toThrow(/actuator part 'curl-drive-servo' already exists/);
    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('validates bodySizeMm before creating servo geometry', () => {
    const { kcad, arm } = makeSupportedArm();
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.axis',
      bodySizeMm: [24, -12, 24],
    })).toThrow(/bodySizeMm.*positive finite 3-tuple/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('validates required string options before mutating the assembly', () => {
    const { kcad, arm } = makeSupportedArm();
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: '',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.axis',
    })).toThrow(/name.*non-empty string/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('rejects a missing axis connector before mutating the assembly', () => {
    const { kcad, arm } = makeSupportedArm();
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.missing',
    })).toThrow(/axis connector 'missing' does not exist on part 'base'/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('rejects a non-axis axis connector before mutating the assembly', () => {
    const { kcad, arm } = makeSupportedArm();
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.servo-mount',
    })).toThrow(/axis.*must be an axis connector/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('rejects the output-side axis connector before mutating the assembly', () => {
    const { kcad, arm } = makeSupportedArm();
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'link.axis',
    })).toThrow(/axis 'link\.axis' must match support-side connector 'base\.axis'/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('rejects a support-side axis that is not the driven mate support connector before mutating', () => {
    const { kcad, arm } = makeSupportedArm({ extraSupportAxis: true });
    const before = snapshotAssembly(arm);

    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'base.servo-mount',
      output: 'link',
      axis: 'base.other-axis',
    })).toThrow(/axis 'base\.other-axis' must match support-side connector 'base\.axis'/);

    expect(snapshotAssembly(arm)).toEqual(before);
  });

  it('review_cad accepts a helper-built rig and bad supportMount fails before review mutation', async () => {
    const result = await reviewCadTool({
      includeInterference: false,
      includePhysics: false,
      samplesPerMate: 3,
      code: `
        const arm = assembly('servo rig');
        const clevis = joint.clevis({
          parentBody: box(40, 30, 10, true),
          childBody: box(50, 8, 8, true).translate(25, 0, 0),
          axis: 'Y',
          pivotParent: [0, 0, 5],
          pivotChild: [0, 0, 0],
          limitsDeg: [-45, 45],
          style: { knuckleR: 5 },
        });
        arm.part('base', clevis.parentGeometry)
          .connector('axis', {
            type: 'axis',
            origin: { kind: 'vec3', value: clevis.parentConnector.origin },
            axis: clevis.parentConnector.axis,
            jointClearanceRadius: clevis.parentConnector.clearanceRadius,
          })
          .connector('servo-mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [0, -14, 8] },
          });
        arm.part('link', clevis.childGeometry)
          .connector('axis', {
            type: 'axis',
            origin: { kind: 'vec3', value: clevis.childConnector.origin },
            axis: clevis.childConnector.axis,
            jointClearanceRadius: clevis.childConnector.clearanceRadius,
          })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } });
        arm.mate('curl', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-45, 45] });
        joint.supportedServoRevolute(arm, {
          name: 'curl-drive',
          mate: 'curl',
          support: 'base',
          supportMount: 'base.servo-mount',
          output: 'link',
          axis: 'base.axis',
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(true);

    const { kcad, arm } = makeSupportedArm({ linkServoMount: true });
    const before = snapshotAssembly(arm);
    expect(() => kcad.joint.supportedServoRevolute(arm, {
      name: 'curl-drive',
      mate: 'curl',
      support: 'base',
      supportMount: 'link.servo-mount',
      output: 'link',
      axis: 'base.axis',
    })).toThrow(/supportMount.*must be on support part 'base'/);
    expect(snapshotAssembly(arm)).toEqual(before);
  });
});

function makeSupportedArm(opts: { extraSupportAxis?: boolean; linkServoMount?: boolean } = {}): {
  kcad: ReturnType<typeof createApi>;
  arm: Assembly;
} {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('arm');

  const base = arm
    .part('base', kcad.box(40, 30, 10, true))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 5] },
      axis: [0, 1, 0],
    })
    .connector('servo-mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, -18, 8] },
    });
  if (opts.extraSupportAxis) {
    base.connector('other-axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [5, 0, 5] },
      axis: [0, 1, 0],
    });
  }

  const link = arm
    .part('link', kcad.box(50, 8, 8, true).translate(25, 0, 5))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
  if (opts.linkServoMount) {
    link.connector('servo-mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, -18, 8] },
    });
  }

  arm.mate('curl', 'base.axis', 'link.axis', 'revolute', {
    limitsDeg: [-45, 45],
  });

  return { kcad, arm };
}

function snapshotAssembly(arm: Assembly): {
  parts: string[];
  mates: string[];
  intents: string[];
} {
  return {
    parts: arm.__parts().map((part) => part.name),
    mates: arm.__mates().map((mate) => `${mate.name}:${mate.type}:${mate.a}->${mate.b}`),
    intents: arm.__mechanicalJointIntents().map((intent) => intent.name),
  };
}
