import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

function cleanTorqueIntentRig(
  maxTorqueNmm: number,
  opts: { friction?: number; normalForceN?: number } = {},
): string {
  const friction = opts.friction ?? 0.5;
  const normalForce = opts.normalForceN === undefined ? '' : `, normalForceN: ${opts.normalForceN}`;
  return `
    const arm = assembly('clean torque intent rig');
    arm.part('base', box(40, 40, 4, true))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 2] }, axis: [0, 0, 1] })
      .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } })
      .connector('tip-contact', { type: 'frame', origin: { kind: 'vec3', value: [100, 0, 2] } });
    arm.part('link', box(100, 8, 6, true).translate(50, 0, 0))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [100, 0, 0] } });
    arm.part('support', box(12, 12, 8, true))
      .connector('base', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -4] } })
      .connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 6, 0] } })
      .connector('shaft', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('servo', box(16, 10, 12, true))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, -5, 0] } });
    arm.part('shaft', cylinder(8, 2).translate(0, 0, -4))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('support-fix', 'base.support', 'support.base', 'fastened');
    arm.mate('servo-fix', 'support.servo', 'servo.mount', 'fastened');
    arm.mate('shaft-fix', 'support.shaft', 'shaft.mount', 'fastened');
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-10, 10] });
    arm.mechanicalJoint('yaw-drive', {
      mate: 'yaw',
      actuator: 'servo',
      shaft: 'shaft',
      supports: ['support'],
      output: 'link',
    });
    arm.physicalUseCase('hold-tip-load', {
      stableParts: ['base'],
      loads: [{ part: 'link', force: [0, 10, 0] }],
      contacts: [{ a: 'link.tip', b: 'base.tip-contact', normal: [0, 0, 1], friction: ${friction}${normalForce} }],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: ${maxTorqueNmm} }],
      criteria: { maxSlipMm: 1 },
    });
    return arm.model();
  `;
}

function poseBoundStaticRig(maxTorqueNmm: number): string {
  return `
    const arm = assembly('pose bound static rig');
    arm.part('base', box(50, 20, 8))
      .connector('left-axis', { type: 'axis', origin: { kind: 'vec3', value: [-20, 0, 0] }, axis: [0, 1, 0] })
      .connector('right-axis', { type: 'axis', origin: { kind: 'vec3', value: [20, 0, 0] }, axis: [0, 1, 0] });
    arm.part('left-finger', box(10, 4, 4))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [-20, 0, 0] }, axis: [0, 1, 0] })
      .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [-10, 0, 0] } });
    arm.part('right-finger', box(10, 4, 4))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [20, 0, 0] }, axis: [0, 1, 0] })
      .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
    arm.part('held', box(20, 10, 10), { role: 'contact-target' })
      .connector('center', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('left-contact', { type: 'frame', origin: { kind: 'vec3', value: [-10, 0, 0] } })
      .connector('right-contact', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
    arm.mate('left-curl', 'base.left-axis', 'left-finger.axis', 'revolute', { limitsDeg: [0, 1] });
    arm.mate('right-curl', 'base.right-axis', 'right-finger.axis', 'revolute', { limitsDeg: [0, 1] });
    arm.physicalUseCase('hold-object', {
      stableParts: ['base'],
      loads: [{ part: 'held', at: 'held.center', force: [0, 0, -6] }],
      contacts: [
        { a: 'left-finger.tip', b: 'held.left-contact', normal: [-1, 0, 0], friction: 0.5, normalForceN: 8 },
        { a: 'right-finger.tip', b: 'held.right-contact', normal: [1, 0, 0], friction: 0.5, normalForceN: 8 },
      ],
      actuatorLimits: [
        { mate: 'left-curl', maxTorqueNmm: ${maxTorqueNmm} },
        { mate: 'right-curl', maxTorqueNmm: ${maxTorqueNmm} },
      ],
      criteria: { maxSlipMm: 0.01, maxForceResidualN: 0.01, maxTorqueResidualNmm: 0.1 },
    });
    return arm.model();
  `;
}

function ratedClevisPhysicalRig(): string {
  return `
    const steel = {
      name: 'test steel', model: 'isotropic-ductile',
      yieldStrengthMPa: 250, bearingStrengthMPa: 400,
    };
    const clevis = joint.clevis({
      parentBody: box(30, 30, 10, true),
      childBody: box(50, 6, 6, true).translate(25, 0, 0),
      axis: 'Z', pivotParent: [0, 0, 0], pivotChild: [0, 0, 0], liftPivot: false,
      style: { knuckleR: 10, forkGapY: 6, tongueY: 5, plateT: 4, pinR: 3, holeClearance: 0.2 },
      engineering: { pin: steel, fork: steel, tongue: steel },
    });
    const arm = assembly('rated clevis physical rig');
    arm.part('base', clevis.parentGeometry)
      .connector('axis', {
        type: 'axis', origin: { kind: 'vec3', value: clevis.parentConnector.origin },
        axis: clevis.parentConnector.axis, jointClearanceRadius: clevis.parentConnector.clearanceRadius,
      });
    arm.part('finger', clevis.childGeometry)
      .connector('axis', {
        type: 'axis', origin: { kind: 'vec3', value: clevis.childConnector.origin },
        axis: clevis.childConnector.axis, jointClearanceRadius: clevis.childConnector.clearanceRadius,
      })
      .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } });
    arm.part('held', box(6, 6, 6, true), { role: 'contact-target' })
      .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } })
      .connector('load-point', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } });
    arm.mate('hinge', 'base.axis', 'finger.axis', 'revolute', {
      pose: 0,
      limitsDeg: [-1, 1],
      capacity: {
        envelope: { maxResultantForceN: 100, maxResultantMomentNmm: 1000 },
        structure: clevis.structural,
      },
    });
    arm.mechanicalJoint('hinge-drive', {
      mate: 'hinge', actuator: 'base', shaft: 'base', supports: ['base'], output: 'finger',
    });
    arm.physicalUseCase('hold-load', {
      stableParts: ['base'],
      loads: [{ part: 'held', at: 'held.load-point', force: [0, -10, 0] }],
      contacts: [{
        a: 'finger.tip', b: 'held.contact', normal: [0, -1, 0], normalFrame: 'world',
        friction: 0.5, normalForceN: 20,
      }],
      actuatorLimits: [{ mate: 'hinge', maxTorqueNmm: 1000 }],
      criteria: {
        maxSlipMm: 0.001, maxForceResidualN: 0.01,
        maxTorqueResidualNmm: 0.1, minJointSafetyFactor: 2,
      },
    });
    return arm.model();
  `;
}

describe('generic physical use-case gate', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('surfaces pose-bound static actuator failure through review_cad', async () => {
    const result = await reviewCadTool({
      code: poseBoundStaticRig(25),
      includePoseEnvelope: false,
      includeInterference: false,
      includePhysicalUseCaseStatics: true,
      physicalUseCaseReachabilitySamplesPerMate: 1,
    });

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.physical-use-case.static-actuator-torque-insufficient',
        useCaseName: 'hold-object',
      }),
    ]));
    expect(result.physicalUseCaseStaticCertificates).toEqual([]);
  });

  it('returns pose-bound static certificate evidence through review_cad', async () => {
    const result = await reviewCadTool({
      code: poseBoundStaticRig(35),
      includePoseEnvelope: false,
      includeInterference: false,
      includePhysicalUseCaseStatics: true,
      physicalUseCaseReachabilitySamplesPerMate: 1,
    });

    expect(result.diagnostics.some((diagnostic) =>
      diagnostic.code === 'assembly.physical-use-case.static-actuator-torque-insufficient')).toBe(false);
    expect(result.physicalUseCaseStaticCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'hold-object',
        heldPart: 'held',
        actuatorTorques: expect.arrayContaining([
          expect.objectContaining({ mateName: 'left-curl' }),
          expect.objectContaining({ mateName: 'right-curl' }),
        ]),
      }),
    ]);
  });

  it('returns reaction and geometry-derived clevis certificates through review_cad', async () => {
    const result = await reviewCadTool({
      code: ratedClevisPhysicalRig(),
      includePoseEnvelope: false,
      includeInterference: false,
      includePhysicalUseCaseJointReactions: true,
      includePhysicalUseCaseJointStructure: true,
      physicalUseCaseReachabilitySamplesPerMate: 3,
    });

    expect(result.physicalUseCaseJointReactionCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'hold-load',
        reactions: [expect.objectContaining({
          mateName: 'hinge',
          resultantForceN: expect.any(Number),
          resultantMomentNmm: expect.any(Number),
        })],
      }),
    ]);
    expect(result.physicalUseCaseJointStructuralCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'hold-load',
        joints: [expect.objectContaining({
          mateName: 'hinge',
          envelope: expect.objectContaining({ status: 'pass' }),
          structure: expect.objectContaining({ status: 'pass' }),
        })],
      }),
    ]);
  });

  it('fails an articulated mechanism when physical evidence is required but absent', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalUseCase: true,
      code: `
        const arm = assembly('bare hinge');
        arm.part('base', box(20, 20, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.physical-use-case.missing')).toBe(true);
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.physical-use-case\.missing/);
    }
  });

  it('fails malformed use-case evidence with actionable diagnostics', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalUseCase: true,
      code: `
        const arm = assembly('bad use case');
        arm.part('base', box(20, 20, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        arm.physicalUseCase('hold-load', {
          stableParts: ['missing-target'],
          loads: [{ part: 'missing-target', force: [0, 0, 0] }],
          contacts: [{ a: 'link.tip', b: 'missing-target.contact', normal: [0, 0, 0], friction: 0 }],
          actuatorLimits: [{ mate: 'missing-mate', maxTorqueNmm: 0 }],
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.fitness?.blockingReasons.map((reason) => reason.code) ?? [];
      expect(codes).toContain('assembly.physical-use-case.part-missing');
      expect(codes).toContain('assembly.physical-use-case.zero-load');
      expect(codes).toContain('assembly.physical-use-case.contact-invalid');
      expect(codes).toContain('assembly.physical-use-case.actuator-limit-invalid');
    }
  });

  it('accepts a minimal generic physical use case as evidence', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalUseCase: true,
      code: cleanTorqueIntentRig(5000),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fitness.passedChecks).toContain('physical-use-case-declared');
      expect(result.fitness.mechanismSummary.physicalUseCaseCount).toBe(1);
    }
  });

  it('blocks actuator limits on bare revolute mates with no mechanical joint support contract', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalUseCase: true,
      code: `
        const arm = assembly('bare actuator limit');
        arm.part('base', box(20, 20, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
        arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        arm.physicalUseCase('hold-load', {
          stableParts: ['base'],
          loads: [{ part: 'link', force: [0, 0, -5] }],
          contacts: [{ a: 'link.tip', b: 'base.contact', normal: [0, 0, 1], friction: 0.5 }],
          actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 120 }],
          criteria: { maxSlipMm: 2, settleTimeMs: 500 },
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const reasons = result.fitness?.blockingReasons ?? [];
      expect(reasons.some((reason) => reason.code === 'assembly.physical-use-case.actuator-support-missing')).toBe(true);
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.physical-use-case\.actuator-support-missing/);
    }
  });

  it('reports unsupported revolute topology for finite bare hinges', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      code: `
        const arm = assembly('bare finite hinge');
        arm.part('base', box(20, 20, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.joint-topology.unsupported-axis',
        severity: 'error',
        mateName: 'yaw',
      }),
    ]));
    if (!result.ok) {
      expect(result.fitness?.blockingReasons).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'assembly.joint-topology.unsupported-axis' }),
      ]));
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.joint-topology\.unsupported-axis/);
    }
  });

  it('reports floating articulated load parts with no stable-root path', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalUseCase: true,
      code: `
        const arm = assembly('isolated articulated load');
        arm.part('base', box(20, 20, 10, true))
          .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
        arm.part('finger-proximal', box(30, 6, 6, true).translate(50, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
        arm.part('finger-distal', box(24, 6, 6, true).translate(80, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [24, 0, 0] } });
        arm.mate('knuckle', 'finger-proximal.axis', 'finger-distal.axis', 'revolute', { limitsDeg: [-20, 70] });
        arm.mechanicalJoint('knuckle-support', {
          mate: 'knuckle',
          actuator: 'finger-proximal',
          shaft: 'finger-proximal',
          supports: ['finger-proximal'],
          output: 'finger-distal',
        });
        arm.physicalUseCase('hold-distal-load', {
          stableParts: ['base'],
          loads: [{ part: 'finger-distal', force: [0, 0, -5] }],
          contacts: [{ a: 'finger-proximal.tip', b: 'base.contact', normal: [0, 0, 1], friction: 0.5 }],
          actuatorLimits: [{ mate: 'knuckle', maxTorqueNmm: 120 }],
          criteria: { maxSlipMm: 2 },
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.connectivity.floating-moving-part',
        severity: 'error',
        partName: 'finger-distal',
      }),
    ]));
    if (!result.ok) {
      expect(result.fitness?.blockingReasons).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'assembly.connectivity.floating-moving-part' }),
      ]));
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.connectivity\.floating-moving-part/);
    }
  });

  it('blocks declared contacts that never come within the allowed slip distance', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: true,
      includeInterference: false,
      includePhysics: false,
      requirePhysicalUseCase: true,
      samplesPerMate: 3,
      code: `
        const arm = assembly('unreachable contact');
        arm.part('base', box(20, 20, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('target-contact', { type: 'frame', origin: { kind: 'vec3', value: [80, 0, 0] } });
        arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        arm.physicalUseCase('touch-target', {
          stableParts: ['base'],
          loads: [{ part: 'link', force: [0, 0, -2] }],
          contacts: [{ a: 'link.tip', b: 'base.target-contact', normal: [1, 0, 0], friction: 0.5 }],
          actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 120 }],
          criteria: { maxSlipMm: 2 },
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const reasons = result.fitness?.blockingReasons ?? [];
      expect(reasons.some((reason) => reason.code === 'assembly.physical-use-case.contact-unreachable')).toBe(true);
      const unreachableDiagnostics = result.diagnostics.filter((diagnostic) =>
        diagnostic.code === 'assembly.physical-use-case.contact-unreachable' &&
        'contactA' in diagnostic &&
        diagnostic.contactA === 'link.tip' &&
        diagnostic.contactB === 'base.target-contact'
      );
      expect(unreachableDiagnostics).toHaveLength(1);
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.physical-use-case\.contact-unreachable/);
    }
  });

  it('blocks declared physical-use-case contacts that targeted actuator sampling cannot reach', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      includePhysicalUseCaseReachability: true,
      requirePhysicalUseCase: true,
      code: `
        const arm = assembly('targeted reachability rig');
        arm.part('base', box(40, 40, 4, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 2] }, axis: [0, 0, 1] })
          .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } })
          .connector('target', { type: 'frame', origin: { kind: 'vec3', value: [120, 0, 2] } });
        arm.part('finger', box(40, 8, 6, true).translate(20, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [40, 0, 0] } });
        arm.part('support', box(12, 12, 8, true))
          .connector('base', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -4] } })
          .connector('servo', { type: 'frame', origin: { kind: 'vec3', value: [0, 6, 0] } })
          .connector('shaft', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('servo', box(16, 10, 12, true))
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, -5, 0] } });
        arm.part('shaft', cylinder(8, 2).translate(0, 0, -4))
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('support-fix', 'base.support', 'support.base', 'fastened');
        arm.mate('servo-fix', 'support.servo', 'servo.mount', 'fastened');
        arm.mate('shaft-fix', 'support.shaft', 'shaft.mount', 'fastened');
        arm.mate('yaw', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 30] });
        arm.mechanicalJoint('yaw-drive', {
          mate: 'yaw',
          actuator: 'servo',
          shaft: 'shaft',
          supports: ['support'],
          output: 'finger',
        });
        arm.physicalUseCase('touch-target', {
          stableParts: ['base'],
          loads: [{ part: 'finger', force: [0, 0, -2] }],
          contacts: [{ a: 'finger.tip', b: 'base.target', normal: [1, 0, 0], friction: 0.5 }],
          actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 120 }],
          criteria: { maxSlipMm: 2 },
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const diagnostic = result.diagnostics.find((reason) => reason.code === 'assembly.physical-use-case.contact-unreachable');
      expect(diagnostic).toMatchObject({
        code: 'assembly.physical-use-case.contact-unreachable',
        contactA: 'finger.tip',
        contactB: 'base.target',
        toleranceMm: 2,
      });
      expect(result.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.physical-use-case.contact-unreachable')).toBe(true);
    }
  });

  it('blocks loads that have no declared path to a stable part', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalUseCase: true,
      code: `
        const arm = assembly('unsupported payload');
        arm.part('base', box(20, 20, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
        arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
        arm.part('payload', box(10, 10, 10, true).translate(70, 0, 0))
          .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [70, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        arm.physicalUseCase('hold-payload', {
          stableParts: ['base'],
          loads: [{ part: 'payload', force: [0, 0, -5] }],
          contacts: [{ a: 'link.tip', b: 'base.contact', normal: [0, 0, 1], friction: 0.5 }],
          actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 120 }],
          criteria: { maxSlipMm: 2 },
        });
        return arm.model();
      `,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const reasons = result.fitness?.blockingReasons ?? [];
      expect(reasons.some((reason) => reason.code === 'assembly.physical-use-case.load-path-missing')).toBe(true);
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.physical-use-case\.load-path-missing/);
    }
  });

  it('blocks actuator limits that are below the declared load moment', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: true,
      includeInterference: false,
      includePhysics: false,
      requirePhysicalUseCase: true,
      samplesPerMate: 3,
      code: cleanTorqueIntentRig(100),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const reasons = result.fitness?.blockingReasons ?? [];
      expect(reasons.some((reason) => reason.code === 'assembly.physical-use-case.torque-insufficient')).toBe(true);
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.physical-use-case\.torque-insufficient/);
    }
  });

  it('accepts actuator limits that exceed the declared load moment', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: true,
      includeInterference: false,
      includePhysics: false,
      requirePhysicalUseCase: true,
      samplesPerMate: 3,
      code: cleanTorqueIntentRig(2000),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fitness.passedChecks).toContain('physical-use-case-declared');
      expect(result.fitness.mechanismSummary.physicalUseCaseIssueCount).toBeUndefined();
    }
  });

  it('blocks declared contact force capacity below the applied load', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: true,
      includeInterference: false,
      includePhysics: false,
      requirePhysicalUseCase: true,
      samplesPerMate: 3,
      code: cleanTorqueIntentRig(5000, { friction: 0.1, normalForceN: 20 }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const reasons = result.fitness?.blockingReasons ?? [];
      expect(reasons.some((reason) => reason.code === 'assembly.physical-use-case.contact-force-insufficient')).toBe(true);
      expect(result.suggestedRepairPrompt).toMatch(/assembly\.physical-use-case\.contact-force-insufficient/);
    }
  });

  it('accepts declared contact force capacity above the applied load', async () => {
    const result = await reviewCadTool({
      includePoseEnvelope: true,
      includeInterference: false,
      includePhysics: false,
      requirePhysicalUseCase: true,
      samplesPerMate: 3,
      code: cleanTorqueIntentRig(5000, { friction: 0.1, normalForceN: 200 }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fitness.passedChecks).toContain('physical-use-case-declared');
      expect(result.fitness.mechanismSummary.physicalUseCaseIssueCount).toBeUndefined();
    }
  });
});
