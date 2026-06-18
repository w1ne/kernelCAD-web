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

  it('dryRun validates a clean script without lowering and without touching the session', async () => {
    const result = await evaluateScriptTool({
      code: `return box(10, 10, 10);`,
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.featureCount).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
    // Dry runs lower no geometry, so they must not establish a session.
    expect(getActiveMcpSession()).toBeUndefined();
  });

  it('dryRun surfaces script throws as error diagnostics', async () => {
    const result = await evaluateScriptTool({
      code: `throw new Error('boom');`,
      dryRun: true,
    });
    expect(result.ok).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].severity).toBe('error');
    // Mandatory diagnostic vocabulary: every diagnostic carries a hint.
    expect(typeof result.diagnostics[0].hint).toBe('string');
  });

  it('dryRun includes the parts summary for an assembly-built scene', async () => {
    const result = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10));
        arm.part('lid', box(10, 10, 2).translate(0, 0, 12));
        return arm.model();
      `,
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(result.parts).toEqual({ count: 2, names: ['base', 'lid'] });
  });

  it('dryRun emits the unstructured-bodies discipline diagnostic', async () => {
    const result = await evaluateScriptTool({
      code: `return [box(10, 10, 10), box(5, 5, 5).translate(20, 0, 0)];`,
      dryRun: true,
    });
    expect(result.ok).toBe(true); // info severity — not fatal
    expect(result.diagnostics.some(d => d.code === 'assembly.structure.unstructured-bodies')).toBe(true);
  });

  it('dryRun passes a script that only fails at lowering (documented contract)', async () => {
    // Oversized fillet: captures fine, fails in the OCCT lowering pass.
    const code = `return box(10, 10, 10).fillet(20);`;
    const dry = await evaluateScriptTool({ code, dryRun: true });
    expect(dry.ok).toBe(true);
    const full = await evaluateScriptTool({ code });
    expect(full.ok).toBe(false);
  });

  it('dryRun on a broken script leaves an existing session intact', async () => {
    const good = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(good.ok).toBe(true);
    expect(getActiveMcpSession()).toBeDefined();

    const dry = await evaluateScriptTool({ code: `throw new Error('boom');`, dryRun: true });
    expect(dry.ok).toBe(false);
    // Unlike a full failing evaluation, a dry run never clears the session.
    expect(getActiveMcpSession()).toBeDefined();
  });

  it('dryRun rejects when neither file nor code is provided', async () => {
    const result = await evaluateScriptTool({ dryRun: true });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('cli.invalid-args');
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
