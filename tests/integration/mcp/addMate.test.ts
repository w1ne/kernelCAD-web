// tests/integration/mcp/addMate.test.ts
//
// v0.6 Task 11: integration test for the `add_mate` MCP tool. Wraps
// `arm.mate(name, aRef, bRef, type)` (T5). Covers happy-path plus the
// connector-not-found error path.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { addMateTool } from '../../../src/agent/mcp/tools/addMate';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { listMatesTool } from '../../../src/agent/mcp/tools/listMates';

describe('add_mate MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('declares a fastened mate between two connectors on the active assembly', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('a', box(1, 1, 1))
          .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('b', box(1, 1, 1))
          .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await addMateTool({ name: 'm1', a: 'a.p', b: 'b.q', type: 'fastened' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mate).toEqual({ name: 'm1', a: 'a.p', b: 'b.q', type: 'fastened' });
    }

    const after = await listMatesTool({});
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.mates).toHaveLength(1);
      expect(after.mates[0]).toMatchObject({ name: 'm1', type: 'fastened' });
    }
  });

  it('passes articulated pose and limit metadata through to the assembly', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(1, 1, 1))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(1, 1, 1))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await addMateTool({
      name: 'yaw',
      a: 'base.axis',
      b: 'link.axis',
      type: 'revolute',
      pose: 15,
      limitsDeg: [-90, 90],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mate).toMatchObject({
        name: 'yaw',
        type: 'revolute',
        pose: 15,
        limitsDeg: [-90, 90],
      });
    }

    const after = await listMatesTool({});
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.mates[0]).toMatchObject({ name: 'yaw', pose: 15, limitsDeg: [-90, 90] });
    }
  });

  it('returns a structured error when a connector ref is unknown', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('a', box(1, 1, 1))
          .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('b', box(1, 1, 1));
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await addMateTool({ name: 'm1', a: 'a.p', b: 'b.nosuch', type: 'fastened' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/connector-not-found/);
      expect(r.errorCode).toBe('feature.invalid-args');
    }
  });
});
