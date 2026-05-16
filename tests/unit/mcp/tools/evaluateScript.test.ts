// tests/unit/mcp/tools/evaluateScript.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('evaluateScriptTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('evaluates inline code and returns success summary', async () => {
    const result = await evaluateScriptTool({
      code: `return box(10, 10, 10);`,
    });
    expect(result.ok).toBe(true);
    expect(result.featureCount).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('returns ok=false on script throw', async () => {
    const result = await evaluateScriptTool({
      code: `throw new Error('boom');`,
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].severity).toBe('error');
  });

  it('rejects when neither file nor code is provided', async () => {
    const result = await evaluateScriptTool({});
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('cli.invalid-args');
  });

  it('handles fillet from v0.2-alpha (round-trip kernel surface)', async () => {
    const result = await evaluateScriptTool({
      code: `return box(20, 20, 20).fillet(2);`,
    });
    expect(result.ok).toBe(true);
    expect(result.featureCount).toBe(2);
  });
});
