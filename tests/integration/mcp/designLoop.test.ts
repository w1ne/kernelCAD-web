import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

describe('design_loop MCP tool', () => {
  const tempDirs: string[] = [];
  const passingVisualChecks = [
    { code: 'main-object-count', passed: true, finding: 'The screenshot shows one primary object, not duplicate assemblies.' },
    { code: 'proportions-match-reference', passed: true, finding: 'The major proportions match the requested object closely enough for this pass.' },
    { code: 'required-visible-features', passed: true, finding: 'The required visible features and labels are present, legible, and not covered by surrounding geometry.' },
    { code: 'no-stray-or-floating-geometry', passed: true, finding: 'No stray, floating, or unexplained extra geometry is visible; each secondary component is visibly supported by contact or near-contact, fasteners, brackets, or a continuous path into the parent body, with no visible air gap.' },
    { code: 'attachment-plausibility', passed: true, finding: 'Visible brackets and interfaces connect through plausible load-bearing geometry anchored into the parent body.' },
    { code: 'semantic-orientation-alignment', passed: true, finding: 'Hands, arrows, labels, and repeated indicators point in deliberate, reference-consistent directions.' },
    { code: 'canonical-views-physically-coherent', passed: true, finding: 'Canonical views still read as one physically coherent object.' },
  ];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('continues past functional attempts that still have unresolved review facts', async () => {
    const result = await designLoopTool({
      goal: 'Build a clean single-piece bracket without decorative floating solids.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
      title: 'Blocked because it has unexplained disconnected solid',
          code: `
            const arm = assembly('warning-bracket');
            arm.part('base',
              box(20, 20, 4, true)
                .union(box(10, 10, 10, true).translate(80, 0, 0))
            )
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 2))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
        },
        {
          id: '02',
          title: 'Clean bracket',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 3))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/clean-bracket.png',
            findings: ['Screenshot shows a simple connected bracket with no unexplained floating solids.'],
            checks: passingVisualChecks,
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.finalAttemptId).toBe('02');
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]).toMatchObject({
      id: '01',
      ok: false,
      functional: false,
      qualityOk: false,
    });
    expect(result.attempts[0].reviewFacts.some((fact) => fact.code === 'assembly.mechanical.part-disconnected')).toBe(true);
    expect(result.attempts[0].nextActionPrompt).toContain('assembly.mechanical.part-disconnected');
    expect(result.attempts[1]).toMatchObject({
      id: '02',
      ok: true,
      functional: true,
      qualityOk: true,
    });
  });

  it('rejects functional attempts that are visually dominated by cuboid fragments', async () => {
    const cluttered = `
      const arm = assembly('box-fragment-arm');
      const base = arm.part('base',
        box(80, 50, 6, true)
          .union(box(20, 20, 20, true).translate(0, 0, 13))
          .union(box(16, 8, 16, true).translate(0, 10, 30.5))
          .union(box(16, 8, 16, true).translate(0, -10, 30.5))
      ).connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } })
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
      const link = arm.part('link',
        box(60, 10, 8, true).translate(30, 0, 0)
          .union(box(8, 8, 12, true).translate(0, 0, 0))
          .union(box(8, 4, 12, true).translate(60, 6, 0))
          .union(box(8, 4, 12, true).translate(60, -6, 0))
          .union(box(20, 4, 4, true).translate(30, 0, 5.5))
          .union(box(8, 8, 8, true).translate(63, 0, 0))
      ).connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      arm.part('root', box(8, 8, 8, true).translate(0, 0, 24))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
      arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
      arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
      return arm.model();
    `;

    const clean = `
      const arm = assembly('clean-cylinder-arm');
      const base = arm.part('base',
        cylinder(18, 22, 32).translate(0, 0, 9)
          .union(cylinder(8, 10, 32).translate(0, 0, 22))
      ).connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } })
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
      const link = arm.part('link',
        cylinder(60, 5, 24).alongAxis([1, 0, 0]).translate(30, 0, 0)
      ).connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
      arm.part('root', box(8, 8, 8, true).translate(0, 0, 24))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
      arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
      arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
      return arm.model();
    `;

    const result = await designLoopTool({
      goal: 'Build a clean robot arm, not a stack of random boxes.',
      includeInterference: false,
      attempts: [
        { id: '01', title: 'Box fragment arm', code: cluttered },
        {
          id: '02',
          title: 'Cleaner cylindrical arm',
          code: clean,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/clean-cylinder-arm.png',
            findings: ['Screenshot shows a compact cylindrical base and link without cuboid clutter.'],
            checks: passingVisualChecks,
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.finalAttemptId).toBe('02');
    expect(result.attempts[0]).toMatchObject({
      id: '01',
      functional: true,
      qualityOk: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts.some((fact) => fact.code === 'assembly.quality.box-fragment-clutter')).toBe(true);
  });

  it('rejects visual acceptance when physical use case contacts are physically unreachable', async () => {
    const result = await designLoopTool({
      goal: 'Build a servo-driven finger that can touch the declared base target.',
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalAcceptance: true,
      attempts: [
        {
          id: '01',
          title: 'Visually accepted unreachable finger',
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
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/visually-accepted-unreachable-finger.png',
            findings: ['Screenshot shows one coherent base-mounted finger, servo, shaft, and support with no visible floating pieces.'],
            checks: passingVisualChecks,
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0]).toMatchObject({
      functional: false,
      qualityOk: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.physical-use-case.contact-unreachable' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('assembly.physical-use-case.contact-unreachable');
  });

  it('carries simultaneous-contact reachability failures into the repair prompt', async () => {
    const result = await designLoopTool({
      goal: 'Build a one-axis gripper whose declared contacts close on both targets at the same pose.',
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalAcceptance: true,
      requireVisualReview: false,
      attempts: [
        {
          id: '01',
          title: 'Contacts split across open and closed poses',
          code: `
            const arm = assembly('split-pose grasp');
            arm.part('base', box(10, 10, 10, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
              .connector('target-a', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } })
              .connector('target-b', { type: 'frame', origin: { kind: 'vec3', value: [0, 10, 0] } });
            arm.part('finger', box(10, 2, 2, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
              .connector('a', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } })
              .connector('b', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
            arm.mate('yaw', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 90] });
            arm.mechanicalJoint('yaw-drive', {
              mate: 'yaw',
              actuator: 'base',
              shaft: 'base',
              supports: ['base'],
              output: 'finger',
            });
            arm.physicalUseCase('split-pose-grasp', {
              stableParts: ['base'],
              loads: [{ part: 'finger', force: [0, 0, -1] }],
              contacts: [
                { a: 'finger.a', b: 'base.target-a', normal: [1, 0, 0], friction: 0.5 },
                { a: 'finger.b', b: 'base.target-b', normal: [0, 1, 0], friction: 0.5 },
              ],
              actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
              criteria: { maxSlipMm: 0.1 },
            });
            return arm.model();
          `,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.physical-use-case.simultaneous-contacts-unreachable',
        severity: 'error',
      }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain(
      'assembly.physical-use-case.simultaneous-contacts-unreachable',
    );
    expect(result.attempts[0].nextActionPrompt).toContain('independent per-contact poses do not form a grasp');
  });

  it('enables and preserves pose-bound statics failures for physical attempts', async () => {
    const result = await designLoopTool({
      goal: 'Build a finger that can statically hold a loaded target.',
      includePoseEnvelope: false,
      includeInterference: false,
      requirePhysicalAcceptance: true,
      requireVisualReview: false,
      attempts: [{
        id: '01',
        title: 'Missing load application point',
        code: `
          const arm = assembly('static input incomplete');
          arm.part('base', box(20, 20, 8))
            .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
          arm.part('finger', box(10, 4, 4))
            .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
            .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
          arm.part('held', box(4, 4, 4), { role: 'contact-target' })
            .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
          arm.mate('curl', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 1] });
          arm.mechanicalJoint('curl-drive', {
            mate: 'curl', actuator: 'base', shaft: 'base', supports: ['base'], output: 'finger',
          });
          arm.physicalUseCase('hold-target', {
            stableParts: ['base'],
            loads: [{ part: 'held', force: [-1, 0, 0] }],
            contacts: [{
              a: 'finger.tip', b: 'held.contact', normal: [-1, 0, 0], friction: 0.5, normalForceN: 2,
            }],
            actuatorLimits: [{ mate: 'curl', maxTorqueNmm: 20 }],
            criteria: { maxSlipMm: 0.01 },
          });
          return arm.model();
        `,
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.physical-use-case.static-input-incomplete',
        severity: 'error',
      }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain(
      'assembly.physical-use-case.static-input-incomplete',
    );
  });

  it('automatically requires joint ratings and structural evidence for physical attempts', async () => {
    const result = await designLoopTool({
      goal: 'Build a rated finger that statically holds a loaded target.',
      includePoseEnvelope: false,
      includeInterference: false,
      requireVisualReview: false,
      attempts: [{
        id: '01',
        title: 'Static grasp with an unrated hand-built hinge',
        code: `
          const arm = assembly('unrated physical hinge');
          arm.part('base', box(20, 20, 8))
            .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
          arm.part('finger', box(50, 6, 6, true).translate(25, 0, 0))
            .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
            .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } });
          arm.part('held', box(6, 6, 6, true), { role: 'contact-target' })
            .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } })
            .connector('load-point', { type: 'frame', origin: { kind: 'vec3', value: [50, 0, 0] } });
          arm.mate('hinge', 'base.axis', 'finger.axis', 'revolute', { pose: 0, limitsDeg: [-1, 1] });
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
            criteria: { maxSlipMm: 0.001, maxForceResidualN: 0.01, maxTorqueResidualNmm: 0.1 },
          });
          return arm.model();
        `,
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.physical-use-case.joint-capacity-undeclared' }),
      expect.objectContaining({ code: 'assembly.physical-use-case.joint-structure-input-incomplete' }),
    ]));
  });

  it('carries joint topology diagnostics into review facts and repair prompts', async () => {
    const result = await designLoopTool({
      goal: 'Build a finger hinge with declared bearing support before visual review.',
      includePoseEnvelope: false,
      includeInterference: false,
      requireVisualReview: false,
      attempts: [
        {
          id: '01',
          title: 'Hinge with misaligned connector axes',
          code: `
            const arm = assembly('bare finite hinge');
            arm.part('base', box(20, 20, 10, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
            arm.part('link', box(30, 6, 6, true).translate(15, 0, 0))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
            arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
            return arm.model();
          `,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0]).toMatchObject({
      functional: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.joint-topology.axis-invalid', severity: 'error' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('assembly.joint-topology.axis-invalid');
    expect(result.attempts[0].nextActionPrompt).toContain('[error] assembly.joint-topology.axis-invalid');
    expect(result.attempts[0].nextActionPrompt).toContain('align');
  });

  it('requires explicit screenshot review before accepting visual-sensitive mechanism attempts', async () => {
    const clean = `
      const arm = assembly('clean-cylinder-arm');
      const base = arm.part('base',
        cylinder(18, 22, 32).translate(0, 0, 9)
          .union(cylinder(8, 10, 32).translate(0, 0, 22))
      ).connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } })
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
      const link = arm.part('link',
        cylinder(60, 5, 24).alongAxis([1, 0, 0]).translate(30, 0, 0)
      ).connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [30, 0, 0] } });
      arm.part('root', box(8, 8, 8, true).translate(0, 0, 24))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
      arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
      arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
      return arm.model();
    `;

    const result = await designLoopTool({
      goal: 'Build a robot arm that must be visually inspected from screenshots before acceptance.',
      includeInterference: false,
      attempts: [
        { id: '01', title: 'No screenshot review', code: clean },
        {
          id: '02',
          title: 'Screenshot reviewed',
          code: clean,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/robot-arm-reviewed.png',
            findings: ['Screenshot shows continuous base and link with no floating blocks.'],
            checks: passingVisualChecks,
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.finalAttemptId).toBe('02');
    expect(result.attempts[0]).toMatchObject({
      id: '01',
      functional: true,
      qualityOk: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-required' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('Render screenshots');
    expect(result.attempts[1]).toMatchObject({
      id: '02',
      ok: true,
      qualityOk: true,
      visualReview: {
        accepted: true,
        screenshotPath: '/tmp/robot-arm-reviewed.png',
      },
    });
  });

  it('rejects accepted visual reviews that do not include a screenshot artifact', async () => {
    const result = await designLoopTool({
      goal: 'Build a robot arm that a vision-capable agent must inspect before accepting.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
          title: 'Accepted without screenshot path',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 3))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            findings: ['Looks connected.'],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0]).toMatchObject({
      functional: true,
      qualityOk: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-incomplete' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('screenshotPath');
  });

  it('rejects accepted visual reviews that do not record concrete findings', async () => {
    const result = await designLoopTool({
      goal: 'Build a robot arm that a vision-capable agent must inspect before accepting.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
          title: 'Accepted without findings',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 3))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/no-findings.png',
            findings: [],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-incomplete' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('findings');
  });

  it('rejects accepted visual reviews that do not include structured reviewer checks', async () => {
    const result = await designLoopTool({
      goal: 'Build a watch from a screenshot and require the agent to review it against the rendered evidence.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
          title: 'Accepted with only vague screenshot findings',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 3))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/vague-review.png',
            findings: ['Looks okay.'],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0]).toMatchObject({
      functional: true,
      qualityOk: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-incomplete' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('visualReview.checks');
  });

  it('rejects accepted visual reviews when any required reviewer check fails', async () => {
    const result = await designLoopTool({
      goal: 'Build a watch from a screenshot and require the agent to reject duplicate visible bodies.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
          title: 'Accepted despite duplicate object',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 3))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/duplicate-watch.png',
            findings: ['The model still appears to contain two watch bodies.'],
            checks: [
              ...passingVisualChecks.filter((check) => check.code !== 'main-object-count'),
              { code: 'main-object-count', passed: false, finding: 'The screenshot appears to show two overlapping main objects.' },
            ],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-check-failed' }),
    ]));
    expect(result.attempts[0].nextActionPrompt).toContain('main-object-count');
  });

  it('rejects accepted visual reviews whose passed check has a placeholder finding', async () => {
    const result = await designLoopTool({
      goal: 'Build a clean bracket.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
          title: 'Accepted with a one-word finding',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('plate', box(30, 8, 6, true))
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.mate('bolt', 'base.mount', 'plate.mount', 'fastened');
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/bracket.png',
            findings: ['The bracket is visible.'],
            checks: passingVisualChecks.map((check) =>
              check.code === 'required-visible-features' ? { ...check, finding: 'ok' } : check,
            ),
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-weak-evidence'.replace('weak-evidence','evidence-weak') }),
    ]));
  });

  it('allows explicit opt-out for non-visual batch checks', async () => {
    const result = await designLoopTool({
      goal: 'Run a non-visual regression check for a simple bracket.',
      includeInterference: false,
      requireVisualReview: false,
      attempts: [
        {
          id: '01',
          title: 'Clean bracket without screenshot',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
              .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            arm.part('root', box(8, 8, 8, true).translate(0, 0, 3))
            .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } })
            .connector('axis', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
            arm.mate('base-root', 'root.mount', 'base.mount', 'fastened');
            arm.mate('yaw', 'base.axis', 'link.axis', 'fastened');
            return arm.model();
          `,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.finalAttemptId).toBe('01');
    expect(result.attempts[0].reviewFacts.some((fact) => fact.code === 'assembly.visual.review-required')).toBe(false);
  });
});
