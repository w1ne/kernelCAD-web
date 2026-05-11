// tests/integration/mcp/addConnector.test.ts
//
// v0.6 Task 11: integration test for the `add_connector` MCP tool. Covers
// the happy-path (registers a connector on the active assembly) and the
// duplicate-name error path (surfaced via the standard MCP error envelope).

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/mcp/activeSession';
import { addConnectorTool } from '../../../src/mcp/tools/addConnector';
import { evaluateScriptTool } from '../../../src/mcp/tools/evaluateScript';

describe('add_connector MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('registers a mate-style connector on a named part of the active assembly', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 2));
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await addConnectorTool({
      part: 'base',
      name: 'top',
      type: 'frame',
      origin: [0, 0, 2],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.connector).toEqual({ partName: 'base', name: 'top', type: 'frame' });
    }
  });

  it('returns a structured error on duplicate connector name (capture-time KernelError)', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 2))
          .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await addConnectorTool({
      part: 'base',
      name: 'top',
      type: 'frame',
      origin: [0, 0, 2],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/duplicate-name/);
      expect(r.errorCode).toBe('feature.invalid-args');
    }
  });

  it('returns a structured error when part name is unknown', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 2));
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await addConnectorTool({
      part: 'no-such-part',
      name: 'top',
      type: 'frame',
      origin: [0, 0, 0],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/not found/);
    }
  });
});
