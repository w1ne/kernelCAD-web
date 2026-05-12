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
      expect(r.connectorWorkspace).toHaveLength(1);
      expect(r.connectorWorkspace?.[0].ref).toBe('link.tool');
      expect(r.connectorWorkspace?.[0].travelMm).toBeGreaterThan(20);
    }
  });
});
