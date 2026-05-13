import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/mcp/activeSession';
import { reviewCadTool } from '../../../src/mcp/tools/reviewCad';

describe('review_cad MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('returns deterministic repair facts for a mate pose outside declared travel', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
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
      expect(r.fitness?.blockingReasons.some((reason) => reason.code === 'assembly.pose.out-of-limits')).toBe(true);
      expect(r.poseEnvelope?.samples.map((s) => s.name)).toEqual(['current', 'yaw:min', 'yaw:max']);
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

  it('reports gripper aperture travel for coupled fingertip connectors', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      trackConnectors: ['left.tip', 'right.tip'],
      gripperAperture: { left: 'left.tip', right: 'right.tip' },
      code: `
        const arm = assembly('hand');
        arm.part('base', box(10, 10, 2))
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
      expect(r.diagnostics).toEqual([]);
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
