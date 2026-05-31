import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

describe('review_cad MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('returns deterministic repair facts for a mate pose outside declared travel', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      designGoal: 'Build a compact desktop robot arm with physically supported joints.',
      preserveInterfaces: ['yaw mate', 'tool-tip connector'],
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(5, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
          pose: 120,
          limitsDeg: [-90, 90],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    expect(r.diagnostics.some((d) => d.code === 'assembly.pose.out-of-limits')).toBe(true);
    if (!r.ok) {
      expect(r.fitness?.functional).toBe(false);
      expect(r.fitness?.repairMode).toBe('parameter-tune');
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.pose.out-of-limits')).toBe(true);
      expect(r.poseEnvelope?.samples.map((s) => s.name)).toEqual(['current', 'yaw:min', 'yaw:max']);
      expect(r.suggestedRepairPrompt).toMatch(/Repair mode: parameter-tune/);
      expect(r.suggestedRepairPrompt).toMatch(/Design goal: Build a compact desktop robot arm/);
      expect(r.suggestedRepairPrompt).toMatch(/Preserve interfaces: yaw mate, tool-tip connector/);
      expect(r.suggestedRepairPrompt).toMatch(/Tune numeric poses, limits, or ranges/);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.pose\.out-of-limits/);
    }
  });

  it('reports workspace for tracked connectors', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      trackConnectors: ['link.tool'],
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(20, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tool', { type: 'frame', origin: { kind: 'vec3', value: [20, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
          limitsDeg: [0, 90],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fitness.functional).toBe(true);
      expect(r.fitness.passedChecks).toContain('tracked-connectors-move');
      expect(r.fitness.mechanismSummary.maxTrackedTravelMm).toBeGreaterThan(20);
      expect(r.connectorWorkspace).toHaveLength(1);
      expect(r.connectorWorkspace?.[0].ref).toBe('link.tool');
      expect(r.connectorWorkspace?.[0].travelMm).toBeGreaterThan(20);
    }
  });

  it('blocks mechanically implausible mates whose connector is not on modeled material', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('floating-hinge');
        arm.part('base', box(20, 20, 8, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(30, 4, 4, true).translate(60, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
          limitsDeg: [0, 90],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fitness?.functional).toBe(false);
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.connector-not-in-solid')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.connector-not-in-solid/);
    }
  });

  it('blocks revolute mates whose parent side does not physically reach the hinge axis', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('unsupported-hinge');
        arm.part('palm',
          box(6, 28, 28, true).translate(123, 0, 0)
            .union(box(8, 8, 8, true).translate(131, 28, 0))
        )
          .connector('left-hinge', { type: 'axis', origin: { kind: 'vec3', value: [139, 28, 0] }, axis: [0, 0, 1] });
        arm.part('finger', box(34, 6, 6, true).translate(17, 0, 0))
          .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [34, 0, 0] } });
        arm.mate('left-curl', 'palm.left-hinge', 'finger.hinge', 'revolute', { limitsDeg: [0, 42] });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.revolute-unsupported')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.revolute-unsupported/);
    }
  });

  it('blocks revolute mates whose bodies have no bearing contact patch', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('air-gap-hinge');
        arm.part('base',
          box(8, 4, 16, true).translate(0, 16, 0)
            .union(box(8, 4, 16, true).translate(0, -16, 0))
        )
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
        arm.part('link', box(30, 8, 8, true).translate(15, 0, 0))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
        arm.mate('pitch', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-20, 20] });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.revolute-contact-missing')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.revolute-contact-missing/);
    }
  });

  it('blocks fastened mates that only touch at a point without a support face', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('point-supported-servo');
        arm.part('plate', box(40, 40, 4, true))
          .connector('corner', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 2] } });
        arm.part('servo', box(20, 12, 10, true))
          .connector('corner', { type: 'frame', origin: { kind: 'vec3', value: [-10, -6, -5] } });
        arm.mate('servo-mount', 'plate.corner', 'servo.corner', 'fastened');
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fitness?.functional).toBe(false);
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.mate-contact-missing')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.mate-contact-missing/);
    }
  });

  // G0 (2026-05-31): the `assembly.mechanical.fixed-contact-missing`
  // diagnostic fires only on v0.5 `arm.fixed(...)` records (mate-aware
  // 'fastened' mates use the separate `assembly.mechanical.mate-contact-
  // missing` path, exercised by the test above). With `arm.fixed(...)`
  // removed in G0, this codepath is unreachable from the public API; its
  // coverage moves with the mate-aware variant.

  it('blocks disconnected solids instead of accepting floating decorative geometry', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('disconnected-part');
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
    });

    expect(r.ok).toBe(false);
    expect(r.diagnostics.some((diagnostic) =>
      diagnostic.code === 'assembly.mechanical.part-disconnected' &&
      diagnostic.severity === 'warning' &&
      diagnostic.message.includes('65.0 mm')
    )).toBe(true);
    if (!r.ok) {
      expect(r.fitness?.functional).toBe(false);
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.part-disconnected')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.part-disconnected/);
    }
  });

  it('passes a declared mechanical joint intent when actuator, shaft, support, and output are realized', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('intent-rig');
        arm.part('base', box(40, 40, 4, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 2] }, axis: [0, 0, 1] })
          .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
        arm.part('link', box(30, 8, 6, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
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
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-45, 45] });
        arm.mechanicalJoint('yaw-drive', {
          mate: 'yaw',
          actuator: 'servo',
          shaft: 'shaft',
          supports: ['support'],
          output: 'link',
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fitness.mechanismSummary.mechanicalIntentIssueCount).toBeUndefined();
    }
  });

  it('blocks declared mechanical joint support contracts when the named bracket does not reach the hinge', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('declared-unsupported-hinge');
        arm.part('base', box(40, 40, 4, true))
          .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
        arm.part('palm',
          box(6, 28, 28, true).translate(123, 0, 0)
            .union(box(8, 8, 8, true).translate(131, 28, 0))
        )
          .connector('base', { type: 'frame', origin: { kind: 'vec3', value: [120, 0, 0] } })
          .connector('left-hinge', { type: 'axis', origin: { kind: 'vec3', value: [139, 28, 0] }, axis: [0, 0, 1] });
        arm.part('finger', box(34, 6, 6, true).translate(17, 0, 0))
          .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('servo', box(10, 10, 10, true))
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('shaft', cylinder(8, 2).alongAxis([0, 0, 1]))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('palm-fix', 'base.support', 'palm.base', 'fastened');
        arm.mate('left-curl', 'palm.left-hinge', 'finger.hinge', 'revolute', { limitsDeg: [0, 42] });
        arm.mechanicalJoint('left-finger-drive', {
          mate: 'left-curl',
          actuator: 'servo',
          shaft: 'shaft',
          supports: ['palm'],
          output: 'finger',
          requiredSupport: {
            kind: 'hinge-bracket',
            around: 'palm.left-hinge',
            supports: ['palm'],
            minBearingLengthMm: 8,
          },
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.intent.required-support-missing')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.intent\.required-support-missing/);
    }
  });

  it('blocks declared mechanical joint intents whose actuator is not mounted', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('floating-actuator-rig');
        arm.part('base', box(40, 40, 4, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 2] }, axis: [0, 0, 1] })
          .connector('support', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
        arm.part('link', box(30, 8, 6, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('support', box(12, 12, 8, true))
          .connector('base', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -4] } })
          .connector('shaft', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('servo', box(16, 10, 12, true));
        arm.part('shaft', cylinder(8, 2).translate(0, 0, -4))
          .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('support-fix', 'base.support', 'support.base', 'fastened');
        arm.mate('shaft-fix', 'support.shaft', 'shaft.mount', 'fastened');
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-45, 45] });
        arm.mechanicalJoint('yaw-drive', {
          mate: 'yaw',
          actuator: 'servo',
          shaft: 'shaft',
          supports: ['support'],
          output: 'link',
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanical.intent.actuator-not-mounted')).toBe(true);
      expect(r.fitness?.mechanismSummary.mechanicalIntentIssueCount).toBe(1);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanical\.intent\.actuator-not-mounted/);
    }
  });

  it('reports gripper aperture travel for coupled fingertip connectors', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      trackConnectors: ['left.tip', 'right.tip'],
      gripperAperture: { left: 'left.tip', right: 'right.tip' },
      code: `
        const arm = assembly('hand');
        arm.part('base', box(30, 30, 4, true))
          .connector('driver', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('left', { type: 'axis', origin: { kind: 'vec3', value: [-10, 0, 0] }, axis: [0, 0, 1] })
          .connector('right', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', box(2, 2, 2))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('left', box(30, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [40, 0, 0] } });
        arm.part('right', box(30, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [-40, 0, 0] } });
        arm.mate('grip', 'base.driver', 'driver.axis', 'revolute', { pose: 0, limitsDeg: [0, 40] });
        arm.mate('left-curl', 'base.left', 'left.axis', 'revolute');
        arm.mate('right-curl', 'base.right', 'right.axis', 'revolute');
        arm.coupleMates('left-curl', { source: 'grip', ratio: 1 });
        arm.coupleMates('right-curl', { source: 'grip', ratio: -1 });
        arm.transmission('left-drive', {
          kind: 'link-rod',
          sourceMate: 'grip',
          drivenMates: ['left-curl'],
          input: 'driver',
          output: 'left',
          path: ['driver', 'base', 'left'],
          ratio: 1,
        });
        arm.transmission('right-drive', {
          kind: 'link-rod',
          sourceMate: 'grip',
          drivenMates: ['right-curl'],
          input: 'driver',
          output: 'right',
          path: ['driver', 'base', 'right'],
          ratio: -1,
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gripperAperture?.left).toBe('left.tip');
      expect(r.gripperAperture?.right).toBe('right.tip');
      expect(r.gripperAperture?.travelMm).toBeGreaterThan(10);
      expect(r.fitness.mechanismSummary.gripperApertureTravelMm).toBeGreaterThan(10);
    }
  });

  it('returns actionable fitness repair facts when tracked connector workspace is missing', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      trackConnectors: ['link.missing'],
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(20, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tool', { type: 'frame', origin: { kind: 'vec3', value: [20, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
          limitsDeg: [0, 90],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Filter out info-level advisories (assembly.mates-ignored-by-model-call
      // fires here because the fixture intentionally returns arm.model() on a
      // mate-bearing assembly to test the fitness-repair flow). The fitness
      // failure is what's being asserted, not the absence of info diags.
      expect(r.diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
      expect(r.fitness?.blockingReasons.map((reason) => reason.code)).toEqual([
        'assembly.mechanism.no-tracked-workspace',
        'assembly.mechanism.no-tracked-travel',
      ]);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanism\.no-tracked-workspace/);
    }
  });

  it('returns structured repair facts when requested gripper aperture refs are missing', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      gripperAperture: { left: 'left.tip', right: 'right.missing' },
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('left', box(20, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [20, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'left.axis', 'revolute', {
          limitsDeg: [0, 90],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.diagnostics.some((d) => d.code === 'assembly.gripper-aperture.connector-missing')).toBe(true);
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.mechanism.gripper-aperture-missing')).toBe(true);
      expect(r.suggestedRepairPrompt).toMatch(/assembly\.mechanism\.gripper-aperture-missing/);
    }
  });

  it('does not require tracked connector workspace when pose-envelope sampling is disabled', async () => {
    const r = await reviewCadTool({
      includePoseEnvelope: false,
      trackConnectors: ['link.tool'],
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(20, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('tool', { type: 'frame', origin: { kind: 'vec3', value: [20, 0, 0] } });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
          limitsDeg: [0, 90],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.poseEnvelope).toBeUndefined();
      expect(r.fitness.functional).toBe(true);
      expect(r.fitness.mechanismSummary.trackedConnectorCount).toBe(0);
    }
  });
});
