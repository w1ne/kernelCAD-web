import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { designLoopTool } from '../../../src/mcp/tools/designLoop';

describe('design_loop MCP tool', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('reviews attempts, stops on the first passing design, and writes a Studio build record', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kernelcad-design-loop-'));
    tempDirs.push(dir);
    const outputRecordPath = join(dir, 'robot-arm-loop.json');

    const result = await designLoopTool({
      goal: 'Build a compact robot arm with supported yaw, shoulder, elbow, and gripper joints.',
      preserveInterfaces: [
        'base-yaw mate',
        'shoulder-pitch mate',
        'elbow-pitch mate',
        'left-curl mate',
        'right-curl mate',
        'gripper-palm.tool-tip connector',
        'left-finger.tip connector',
        'right-finger.tip connector',
      ],
      trackConnectors: ['gripper-palm.tool-tip', 'left-finger.tip', 'right-finger.tip'],
      gripperAperture: { left: 'left-finger.tip', right: 'right-finger.tip' },
      allowReviewWarnings: ['assembly.quality.box-fragment-clutter'],
      outputRecordPath,
      attempts: [
        {
          id: '01',
          title: 'Rejected colliding joint stack',
          file: 'examples/robot-arm/skill-built-supported-arm-01-colliding.kcad.ts',
        },
        {
          id: '02',
          title: 'Accepted supported clevis arm',
          file: 'examples/robot-arm/skill-built-supported-arm.kcad.ts',
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/accepted-supported-clevis-arm.png',
            findings: ['Screenshot shows a supported clevis arm with continuous links and no obvious floating blocks.'],
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
      repairMode: 'topology-redesign',
    });
    expect(result.attempts[0].nextActionPrompt).toContain('Repair mode: topology-redesign');
    expect(result.attempts[1]).toMatchObject({
      id: '02',
      ok: true,
      repairMode: 'none',
    });

    const record = JSON.parse(await readFile(outputRecordPath, 'utf-8'));
    expect(record).toMatchObject({
      title: 'kernelCAD design loop',
      goal: 'Build a compact robot arm with supported yaw, shoulder, elbow, and gripper joints.',
      steps: [
        {
          id: '01',
          title: 'Rejected colliding joint stack',
          status: 'failed',
          script: 'examples/robot-arm/skill-built-supported-arm-01-colliding.kcad.ts',
        },
        {
          id: '02',
          title: 'Accepted supported clevis arm',
          status: 'passed',
          script: 'examples/robot-arm/skill-built-supported-arm.kcad.ts',
        },
      ],
    });
  });

  it('continues past functional attempts that still have unresolved review facts', async () => {
    const result = await designLoopTool({
      goal: 'Build a clean single-piece bracket without decorative floating solids.',
      includeInterference: false,
      attempts: [
        {
          id: '01',
          title: 'Functional but has unexplained disconnected solid',
          code: `
            const arm = assembly('warning-bracket');
            arm.part('base',
              box(20, 20, 4, true)
                .union(box(10, 10, 10, true).translate(80, 0, 0))
            )
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 2] }, axis: [0, 0, 1] });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
            arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
            return arm.model();
          `,
        },
        {
          id: '02',
          title: 'Clean bracket',
          code: `
            const arm = assembly('clean-bracket');
            arm.part('base', box(30, 20, 6, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 3] }, axis: [0, 0, 1] });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
            arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
            return arm.model();
          `,
          visualReview: {
            accepted: true,
            screenshotPath: '/tmp/clean-bracket.png',
            findings: ['Screenshot shows a simple connected bracket with no unexplained floating solids.'],
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
      functional: true,
      qualityOk: false,
    });
    expect(result.attempts[0].reviewFacts.some((fact) => fact.code === 'assembly.mechanical.part-disconnected')).toBe(true);
    expect(result.attempts[0].nextActionPrompt).toContain('Functional CAD is not enough');
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
          .union(box(16, 8, 16, true).translate(0, 18, 32))
          .union(box(16, 8, 16, true).translate(0, -18, 32))
      ).connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 24] }, axis: [0, 0, 1] });
      const link = arm.part('link',
        box(60, 10, 8, true).translate(30, 0, 0)
          .union(box(8, 8, 12, true).translate(0, 0, 0))
          .union(box(8, 4, 12, true).translate(60, 10, 0))
          .union(box(8, 4, 12, true).translate(60, -10, 0))
          .union(box(20, 4, 4, true).translate(30, 0, 8))
          .union(box(8, 8, 8, true).translate(70, 0, 0))
      ).connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
      return arm.model();
    `;

    const clean = `
      const arm = assembly('clean-cylinder-arm');
      const base = arm.part('base',
        cylinder(18, 22, 32).translate(0, 0, 9)
          .union(cylinder(8, 10, 32).translate(0, 0, 22))
      ).connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 24] }, axis: [0, 0, 1] });
      const link = arm.part('link',
        cylinder(60, 5, 24).alongAxis([1, 0, 0]).translate(30, 0, 0)
      ).connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [30, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
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

  it('requires explicit screenshot review before accepting visual-sensitive mechanism attempts', async () => {
    const clean = `
      const arm = assembly('clean-cylinder-arm');
      const base = arm.part('base',
        cylinder(18, 22, 32).translate(0, 0, 9)
          .union(cylinder(8, 10, 32).translate(0, 0, 22))
      ).connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 24] }, axis: [0, 0, 1] });
      const link = arm.part('link',
        cylinder(60, 5, 24).alongAxis([1, 0, 0]).translate(30, 0, 0)
      ).connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [30, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
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
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 3] }, axis: [0, 0, 1] });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
            arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
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
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 3] }, axis: [0, 0, 1] });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
            arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
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
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 3] }, axis: [0, 0, 1] });
            arm.part('link', box(30, 8, 6, true))
              .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
            arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
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
