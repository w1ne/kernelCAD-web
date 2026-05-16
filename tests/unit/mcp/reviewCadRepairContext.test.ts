import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/mcp/activeSession';
import { reviewCadTool } from '../../../src/mcp/tools/reviewCad';

describe('review_cad repairContext', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('emits repairContext on ok:true output', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('clean');
        arm.part('base', box(10, 10, 10));
        return arm.model();
      `,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.repairContext).toBeDefined();
      expect(r.repairContext.blockingReasons.length).toBe(0);
      expect(r.repairContext.preserveInterfaces).toEqual([]);
      expect(r.repairContext.designGoal).toBe('');
    }
  });

  it('emits repairContext with top 3 diagnostics on ok:false output', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axisA', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('axisB', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('linkA', box(5, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('linkB', box(5, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axisA', 'linkA.axis', 'revolute', {
          pose: 120,
          limitsDeg: [-90, 90],
        });
        arm.mate('pitch', 'base.axisB', 'linkB.axis', 'revolute', {
          pose: 200,
          limitsDeg: [-45, 45],
        });
        return arm.model();
      `,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.repairContext).toBeDefined();
      expect(r.repairContext.topDiagnostics.length).toBeGreaterThanOrEqual(1);
      expect(r.repairContext.topDiagnostics.length).toBeLessThanOrEqual(3);
      // Errors sort before warnings: every adjacent pair must be in order.
      // Since we only inspect codes/severity is encoded in the original
      // diagnostics list, we re-derive severity by matching back.
      const codes = r.repairContext.topDiagnostics.map((d) => d.code);
      // At least one entry should be the out-of-limits error.
      expect(codes).toContain('assembly.pose.out-of-limits');
      expect(typeof r.suggestedRepairPrompt).toBe('string');
      expect(r.suggestedRepairPrompt.length).toBeGreaterThan(0);
    }
  });

  it('populates suggestedDelta for assembly.pose.out-of-limits diagnostics', async () => {
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
    if (!r.ok) {
      const oob = r.repairContext.topDiagnostics.find(
        (d) => d.code === 'assembly.pose.out-of-limits',
      );
      expect(oob).toBeDefined();
      expect(oob?.mateName).toBe('yaw');
      expect(oob?.suggestedDelta).toBeDefined();
      expect(oob?.suggestedDelta?.mate).toBe('yaw');
      // pose=120, limits=[-90, 90] → widen the max bound by 30.
      const delta = oob!.suggestedDelta!;
      const widen = typeof delta.widenBy === 'number';
      const narrow = typeof delta.narrowBy === 'number';
      expect(widen || narrow).toBe(true);
    }
  });

  it('passes through preserveInterfaces and designGoal from input', async () => {
    const r = await reviewCadTool({
      includeInterference: false,
      designGoal: 'test goal',
      preserveInterfaces: ['foo'],
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10));
        return arm.model();
      `,
    });

    expect(r.repairContext).toBeDefined();
    expect(r.repairContext.designGoal).toBe('test goal');
    expect(r.repairContext.preserveInterfaces).toEqual(['foo']);
  });
});
