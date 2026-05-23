// tests/integration/mcp/addConnectorTopoRef.test.ts
//
// F-surface F3 integration test: `add_connector` accepts a `@kc[<part>/face/
// <name>]` string for its `origin` parameter (and edge/vertex variants).
// Backward-compat: Vec3 tuple + structured ConnectorOrigin still work.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { addConnectorTool } from '../../../src/agent/mcp/tools/addConnector';

describe('add_connector accepts @kc[...] face refs as origin (F-surface F3)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('accepts origin: @kc[<part>/face/top]', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10));
      return arm.model();
    `;
    const ev = await evaluateScriptTool({ code: setup });
    expect(ev.ok).toBe(true);

    const r = await addConnectorTool({
      part: 'base',
      name: 'mount',
      type: 'frame',
      origin: '@kc[base/face/top]' as unknown as never,
      normal: [0, 0, 1],
    });
    expect(r.ok).toBe(true);
  });

  it('still accepts a numeric tuple origin', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(10, 10, 10));
      return arm.model();
    `;
    await evaluateScriptTool({ code: setup });
    const r = await addConnectorTool({
      part: 'base',
      name: 'mount2',
      type: 'frame',
      origin: [0, 0, 5],
    });
    expect(r.ok).toBe(true);
  });

  it('accepts @kc[<part>/face/<name>#normal] modifier as face-normal origin', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10));
      return arm.model();
    `;
    await evaluateScriptTool({ code: setup });
    const r = await addConnectorTool({
      part: 'base',
      name: 'normalRef',
      type: 'frame',
      origin: '@kc[base/face/top#normal]' as unknown as never,
      normal: [0, 0, 1],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a non-@kc string origin with a structured error', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(10, 10, 10));
      return arm.model();
    `;
    await evaluateScriptTool({ code: setup });
    const r = await addConnectorTool({
      part: 'base',
      name: 'bad',
      type: 'frame',
      origin: 'top' as unknown as never,
      normal: [0, 0, 1],
    });
    expect(r.ok).toBe(false);
  });
});
