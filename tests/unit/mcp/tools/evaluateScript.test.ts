// tests/unit/mcp/tools/evaluateScript.test.ts
import { resolve } from 'node:path';
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
      // This assembly declares no mates (the two parts are disconnected in
      // the mate graph), so the default mechanism gate would correctly flag
      // it as broken (mechanism.orphan-part). This test is about the parts
      // roster, not mechanism validity — opt out so the assertion stays
      // focused.
      skipMechanismCheck: true,
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

  // ── T3: mechanism verify runs BY DEFAULT on the agent path ──────────────
  //
  // An agent calling evaluate_script on an assembly used to get ok:true even
  // when the mechanism self-disconnects/collides. `ok` is now a function of
  // the verified post-state: a broken mechanism makes ok:false and surfaces
  // the mechanism verdict + diagnostics.

  // Canonical fixtures (also used by the CLI/Studio physics-loop parity
  // tests): vec3-spring-broken self-collides / disconnects under motion;
  // clevis-hinge-real is a physically-grounded hinge that holds at every
  // sampled pose.
  const BROKEN_FIXTURE = resolve(__dirname, '../../../fixtures/mechanism/vec3-spring-broken.kcad.ts');
  const CLEAN_FIXTURE = resolve(__dirname, '../../../fixtures/mechanism/clevis-hinge-real.kcad.ts');

  it('runs mechanism verify by default: a broken assembly reports mechanism:broken and ok:false', async () => {
    const result = await evaluateScriptTool({ file: BROKEN_FIXTURE });
    expect(result.mechanism).toBe('broken');
    expect(result.ok).toBe(false);
    // Mechanism failure diagnostics are merged into `diagnostics`.
    expect(result.diagnostics.some(d => d.code?.startsWith('mechanism.'))).toBe(true);
  }, 120_000);

  it('runs mechanism verify by default: a clean assembly reports mechanism:real and ok:true', async () => {
    const result = await evaluateScriptTool({ file: CLEAN_FIXTURE });
    expect(result.mechanism).toBe('real');
    expect(result.ok).toBe(true);
    expect(result.diagnostics.some(d => d.code?.startsWith('mechanism.'))).toBe(false);
  }, 120_000);

  it('skipMechanismCheck:true opts out — no mechanism field, broken assembly is not gated', async () => {
    const result = await evaluateScriptTool({ file: BROKEN_FIXTURE, skipMechanismCheck: true });
    expect(result.mechanism).toBeUndefined();
    // Without the mechanism gate, the broken mechanism is not surfaced and
    // ok reflects only the build/dfm outcome (ok:true here).
    expect(result.ok).toBe(true);
    expect(result.diagnostics.some(d => d.code?.startsWith('mechanism.'))).toBe(false);
  }, 120_000);

  it('non-assembly scripts are unaffected (no mechanism field, no cost)', async () => {
    const result = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(result.ok).toBe(true);
    expect(result.mechanism).toBeUndefined();
  });

  it('dryRun never runs the mechanism gate (no mechanism field even for an assembly)', async () => {
    const result = await evaluateScriptTool({ file: BROKEN_FIXTURE, dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.mechanism).toBeUndefined();
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
