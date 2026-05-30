// tests/integration/mcp/addFeatureFaceRefHint.test.ts
//
// F-surface F3: when an `add_feature` MCP call introduces a malformed
// @kc[...] face ref into the script, the resulting `evaluate_script` round-
// trip surfaces a structured diagnostic with the parser's hint prose.
//
// Verifies the hint-propagation chain end-to-end through the public surface
// without requiring a new diagnostic code.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('feature.face-ref.* / face-ref hint propagation through evaluate_script (F-surface F3)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('hole() with a malformed @kc[...] ref surfaces a structured diagnostic carrying the hint', async () => {
    const code = `
      return box(40, 40, 10)
        .hole('@kc[1bad/face/top]', { u: 0, v: 0, diameter: 6, depth: 'through' });
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(false);
    const d = r.diagnostics?.[0];
    expect(d).toBeDefined();
    expect(d!.code).toBe('feature.invalid-args');
    // The malformed-ref path threads the parser's specific error into the
    // hint so the agent can self-correct without a follow-up tool call.
    expect(d!.hint).toMatch(/grammar|@kc\[|owner|name/i);
  });

  it('hole() with a kind-mismatched @kc[...] ref hints the required kind', async () => {
    const code = `
      return box(40, 40, 10)
        .hole('@kc[box1/edge/top]', { u: 0, v: 0, diameter: 6, depth: 'through' });
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(false);
    const d = r.diagnostics?.[0];
    expect(d).toBeDefined();
    expect(d!.code).toBe('feature.invalid-args');
    expect(d!.hint).toMatch(/face/);
  });
});
