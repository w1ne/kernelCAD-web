// tests/integration/mcp/solveMates.test.ts
//
// v0.6 Task 11: integration test for `solve_mates` MCP tool. Wraps
// `solveMates(arm)` (T6/T7). Verifies the solver surfaces per-part world
// transforms serialized as { translation, rotateAxis, rotateDeg } via the
// existing `decomposeToTranslateAndRotate()`.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { solveMatesTool } from '../../../src/agent/mcp/tools/solveMates';

describe('solve_mates MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('returns status=solved with serialized per-part transforms on a simple two-part fastened mate', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('a', box(1, 1, 1))
          .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('b', box(1, 1, 1))
          .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('m1', 'a.p', 'b.q', 'fastened');
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await solveMatesTool({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('solved');
      expect(Object.keys(r.poses).sort()).toEqual(['a', 'b']);
      const pa = r.poses.a;
      expect(pa.translation).toHaveLength(3);
      expect(pa.rotateAxis).toHaveLength(3);
      expect(typeof pa.rotateDeg).toBe('number');
    }
  });

  it('honors per-mate pose overrides', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(5, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute');
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await solveMatesTool({ poses: { yaw: 30 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.poses.link.rotateDeg).toBeCloseTo(30);
    }
  });

  it('expands coupled mate poses from one grip actuator', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('hand');
        arm.part('base', box(10, 10, 2))
          .connector('left', { type: 'axis', origin: { kind: 'vec3', value: [-10, 0, 0] }, axis: [0, 0, 1] })
          .connector('right', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] })
          .connector('driver', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', box(2, 2, 2))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('left', box(20, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('right', box(20, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('grip', 'base.driver', 'driver.axis', 'revolute', { limitsDeg: [0, 40] });
        arm.mate('left-curl', 'base.left', 'left.axis', 'revolute');
        arm.mate('right-curl', 'base.right', 'right.axis', 'revolute');
        arm.coupleMates('left-curl', { source: 'grip', ratio: 1 });
        arm.coupleMates('right-curl', { source: 'grip', ratio: -1 });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await solveMatesTool({ poses: { grip: 30 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.poses.left.rotateDeg).toBeCloseTo(30);
      expect(r.poses.right.rotateDeg).toBeCloseTo(30);
      expect(r.poses.left.rotateAxis[2]).toBeGreaterThan(0);
      expect(r.poses.right.rotateAxis[2]).toBeLessThan(0);
    }
  });

  it('expands coupled mate poses from a source ParamRef pose', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const gripDeg = param('gripDeg', 25, { min: 0, max: 40 });
        const arm = assembly('hand');
        arm.part('base', box(10, 10, 2))
          .connector('left', { type: 'axis', origin: { kind: 'vec3', value: [-10, 0, 0] }, axis: [0, 0, 1] })
          .connector('right', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] })
          .connector('driver', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', box(2, 2, 2))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('left', box(20, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('right', box(20, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('grip', 'base.driver', 'driver.axis', 'revolute', { pose: gripDeg, limitsDeg: [0, 40] });
        arm.mate('left-curl', 'base.left', 'left.axis', 'revolute');
        arm.mate('right-curl', 'base.right', 'right.axis', 'revolute');
        arm.coupleMates('left-curl', { source: 'grip', ratio: 1 });
        arm.coupleMates('right-curl', { source: 'grip', ratio: -1 });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await solveMatesTool({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.poses.left.rotateDeg).toBeCloseTo(25);
      expect(r.poses.right.rotateDeg).toBeCloseTo(25);
      expect(r.poses.left.rotateAxis[2]).toBeGreaterThan(0);
      expect(r.poses.right.rotateAxis[2]).toBeLessThan(0);
    }
  });

  it('returns ok:false when a scalar mate receives a triple pose override', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(5, 5, 5))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute');
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await solveMatesTool({ poses: { yaw: [1, 2, 3] } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/mate-pose-shape|triple pose/);
      expect(r.errorCode).toBe('feature.invalid-args');
    }
  });

  it('returns ok:false when no active session is set', async () => {
    const r = await solveMatesTool({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe('feature.invalid-args');
    }
  });
});
