// tests/unit/mcp/tools/evaluateScript.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';
import { paramsListTool } from '../../../../src/agent/mcp/tools/paramsList';
import { clearActiveMcpSession, getActiveMcpSession } from '../../../../src/agent/mcp/activeSession';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('evaluateScriptTool', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { clearActiveMcpSession(); });

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

  it('dfm-only failure keeps the evaluate session alive for session-dependent tools', async () => {
    // Build succeeds (the model exists); the only error-severity
    // diagnostics come from the dfm gate hook. The agent iterating on
    // a dfm fix must keep access to the 9 session-dependent tools.
    const result = await evaluateScriptTool({
      code: `
        const t = param('wallT', 1, { min: 0.4, max: 5, description: 'wall thickness' });
        dfmSpec({ minWall: 1.5 });
        return box(20, 20, t);
      `,
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.code === 'dfm.wall.too-thin')).toBe(true);

    // Session retained: a session-dependent tool still works.
    expect(getActiveMcpSession()).toBeDefined();
    const params = await paramsListTool({});
    expect(params.params.map(p => p.name)).toEqual(['wallT']);
  }, 120_000);

  it('includes a parts summary for an assembly-built scene', async () => {
    const result = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10));
        arm.part('lid', box(10, 10, 2).translate(0, 0, 12));
        return arm.model();
      `,
    });
    expect(result.ok).toBe(true);
    expect(result.parts).toBeDefined();
    expect(result.parts!.count).toBe(2);
    expect(result.parts!.names).toEqual(['base', 'lid']);
  });

  it('omits the parts summary for a plain single-shape script', async () => {
    const result = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(result.ok).toBe(true);
    expect(result.parts).toBeUndefined();
  });

  it('non-dfm build failure still clears the session', async () => {
    // Establish a good session first ...
    const good = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(good.ok).toBe(true);
    expect(getActiveMcpSession()).toBeDefined();

    // ... then a genuinely broken script must clear it.
    const broken = await evaluateScriptTool({ code: `throw new Error('boom');` });
    expect(broken.ok).toBe(false);
    expect(getActiveMcpSession()).toBeUndefined();
  });
});
