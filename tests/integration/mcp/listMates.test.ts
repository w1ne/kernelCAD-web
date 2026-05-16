// tests/integration/mcp/listMates.test.ts
//
// v0.6 Task 11: integration test for the `list_mates` MCP tool. Read-only
// surface over the active assembly's `__mates()` accessor.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { listMatesTool } from '../../../src/agent/mcp/tools/listMates';

describe('list_mates MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('returns the mate records declared on the active assembly', async () => {
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

    const r = await listMatesTool({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mates).toEqual([
        { name: 'm1', a: 'a.p', b: 'b.q', type: 'fastened' },
      ]);
    }
  });

  it('returns an empty mates array when the active assembly has no mates', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('a', box(1, 1, 1));
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await listMatesTool({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mates).toEqual([]);
    }
  });
});
