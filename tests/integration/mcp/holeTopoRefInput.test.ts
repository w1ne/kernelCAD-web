// tests/integration/mcp/holeTopoRefInput.test.ts
//
// F-surface F3 integration test: `hole()` accepts the `@kc[...]` face-ref
// string form as the face selector. Backward-compat: bare canonical-name
// strings and structured `{ face: <name> }` forms still work.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('Feature inputs accept @kc[...] face refs (F-surface F3)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('hole() accepts @kc[<owner>/face/top] as the face selector', async () => {
    const code = `
      return box(40, 40, 10)
        .hole('@kc[box1/face/top]', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'centerBolt' });
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(true);
  });

  it('hole() rejects a malformed @kc ref with a structured diagnostic', async () => {
    const code = `
      return box(40, 40, 10)
        .hole('@kc[1bad/face/top]', { u: 0, v: 0, diameter: 6, depth: 'through' });
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(false);
    const d = r.diagnostics?.[0];
    expect(d?.code).toMatch(/feature\.invalid-args/);
  });

  it('hole() still accepts the bare canonical-name string form', async () => {
    const code = `
      return box(40, 40, 10)
        .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' });
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(true);
  });
});
