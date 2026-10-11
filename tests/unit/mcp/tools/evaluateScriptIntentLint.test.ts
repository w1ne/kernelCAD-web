// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// evaluate_script carries the authoring intent lint (usage triage 2026-10-03):
// an M4 bracket whose holes are subtracted cylinders still evaluates ok and
// builds its geometry, and the result names holes() as an info diagnostic.
//
// Comments never drive a hint (intentLint.ts strips them): the bracket's
// "4x M4 screws" lives only in a comment and its cuts are Ø4.5 — M4
// CLEARANCE holes — so a "tap a thread" hint would be wrong advice; the
// hole-by-cylinder hint comes from the code's structure (four subtracted
// cylinders) and is right. When the CODE carries thread intent (a string
// such as 'M4 tapped'), the thread hint fires.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';
import { evaluateWithEnvelope } from '../../../../src/agent/cli/commands/evaluate';
import { clearActiveMcpSession, getActiveMcpSession } from '../../../../src/agent/mcp/activeSession';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

const M4_BRACKET = `
// Wall bracket for 4x M4 screws
const t = 5;
let body = box(60, 40, t);
body = body.subtract(cylinder(t + 2, 2.25).translate(10, 10, -1));
body = body.subtract(cylinder(t + 2, 2.25).translate(50, 10, -1));
body = body.subtract(cylinder(t + 2, 2.25).translate(10, 30, -1));
body = body.subtract(cylinder(t + 2, 2.25).translate(50, 30, -1));
return body;
`;

const LINT_CODES = ['authoring.prefer-api.hole-by-cylinder'];

// The same cuts, with the thread intent in the code: a tap-drill named as such.
const M4_TAPPED_IN_CODE = `
const t = 5;
const holeSpec = 'M4 tapped';
let body = box(60, 40, t);
body = body.subtract(cylinder(t + 2, 1.65).translate(10, 10, -1));
body = body.subtract(cylinder(t + 2, 1.65).translate(50, 10, -1));
body = body.subtract(cylinder(t + 2, 1.65).translate(10, 30, -1));
body = body.subtract(cylinder(t + 2, 1.65).translate(50, 30, -1));
return body;
`;

describe('evaluate_script — authoring intent lint', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { clearActiveMcpSession(); });

  it('returns the info hints and still evaluates ok with geometry', async () => {
    const result = await evaluateScriptTool({ code: M4_BRACKET });
    expect(result.ok).toBe(true);
    expect(result.featureCount).toBeGreaterThan(1);
    expect(getActiveMcpSession()?.tailShape).toBeDefined();
    expect(result.diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
    const lint = result.diagnostics.filter((d) => d.code.startsWith('authoring.'));
    expect(lint.map((d) => d.code)).toEqual(LINT_CODES);
    for (const d of lint) {
      expect(d.severity).toBe('info');
      expect(d.hint.length).toBeGreaterThan(0);
      expect(d.nextAction).toBeDefined();
    }
  });

  it('dryRun carries the same hints', async () => {
    const result = await evaluateScriptTool({ code: M4_BRACKET, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.diagnostics.map((d) => d.code)).toEqual(LINT_CODES);
  });

  it('CLI evaluate carries the hints and keeps exit code 0', async () => {
    const result = await evaluateWithEnvelope({ code: M4_BRACKET });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics.map((d) => d.code)).toEqual(LINT_CODES);
  });

  it('thread intent in a comment alone does not fire the thread hint (Ø4.5 cuts are clearance holes)', async () => {
    const result = await evaluateScriptTool({ code: M4_BRACKET });
    expect(result.diagnostics.map((d) => d.code)).not.toContain('authoring.prefer-api.thread');
  });

  it('thread intent in the code fires the thread hint alongside hole-by-cylinder', async () => {
    const result = await evaluateScriptTool({ code: M4_TAPPED_IN_CODE, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.diagnostics.map((d) => d.code)).toEqual([
      'authoring.prefer-api.thread',
      'authoring.prefer-api.hole-by-cylinder',
    ]);
  });

  it('the same bracket built with holes({ thread }) gets no hints', async () => {
    const result = await evaluateScriptTool({
      code: `
// Wall bracket for 4x M4 screws
return box(60, 40, 5).holes('top', {
  positions: [{ u: -20, v: -10 }, { u: 20, v: -10 }, { u: -20, v: 10 }, { u: 20, v: 10 }],
  diameter: 4, depth: 'through', thread: { pitch: 0.7 },
});`,
    });
    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter((d) => d.code.startsWith('authoring.'))).toEqual([]);
  });
});
