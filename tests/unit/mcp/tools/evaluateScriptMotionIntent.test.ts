// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// evaluate_script reports motion intent on a fastened joint as a broken
// mechanism with a plain, joint-naming statement, and gives a static
// assembly no verdict noise. Drawing-robot regression: an animation turned
// the shoulder link while the shoulder mate was fastened, and the model was
// presented as a working mechanism.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';
import { TOOL_OUTPUT_SCHEMAS } from '../../../../src/agent/mcp/toolOutputSchemas';

function model(joint: 'fastened-geometry' | 'revolute', animate = true): string {
  const pivot = joint === 'revolute'
    ? "{ type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] }"
    : "{ type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } }";
  const link = joint === 'revolute'
    ? 'box(60, 8, 4).translate(0, -4, 10)'
    : 'box(60, 8, 4).translate(0, -4, 10).rotateZ(shoulderDeg)';
  const mate = joint === 'revolute'
    ? "arm.mate('shoulder', 'base.pivot', 'link.pivot', 'revolute', { pose: shoulderDeg, limitsDeg: [-20, 20] });"
    : "arm.mate('shoulder', 'base.pivot', 'link.pivot', 'fastened');";
  return `
const shoulderDeg = param('shoulderDeg', 0, { min: -20, max: 20 });
const arm = assembly('draw-arm');
const base = arm.part('base', box(40, 40, 10).translate(-20, -20, 0));
const link = arm.part('link', ${link});
base.connector('pivot', ${pivot});
link.connector('pivot', ${pivot});
${mate}
${animate ? "animationView({ param: 'shoulderDeg', from: -20, to: 20, durationMs: 1000 });" : ''}
return arm.model();`;
}

describe('evaluate_script motion intent', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('fails an animated param that turns a fastened link, naming the param and the joint', async () => {
    const out = await evaluateScriptTool({ code: model('fastened-geometry') });
    const d = out.diagnostics.find((x) => x.code === 'mechanism.motion-on-fixed-joint');
    expect(d, JSON.stringify(out.diagnostics.map((x) => x.code))).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.message).toMatch(/'shoulderDeg'.*'shoulder'/);
    expect(out.mechanism).toBe('broken');
    expect(out.ok).toBe(false);
    expect(out.mechanismSummary?.verdict).toBe('broken');
    expect(out.mechanismSummary?.statement).toMatch(/^Mechanism broken: .*'shoulderDeg'/);
    expect(out.mechanismSummary?.failures.some((f) => f.joint === 'shoulder')).toBe(true);
  }, 120_000);

  it('passes the same model with a revolute mate driven by the param', async () => {
    const out = await evaluateScriptTool({ code: model('revolute') });
    expect(out.diagnostics.some((x) => x.code === 'mechanism.motion-on-fixed-joint')).toBe(false);
    expect(out.mechanismSummary).toBeDefined();
    expect(out.mechanismSummary!.verdict).not.toBe('broken');
    if (out.mechanismSummary!.verdict === 'real') {
      expect(out.mechanismSummary!.statement).toMatch(/^Motion checked: \d+ poses across 1 joint/);
    } else {
      expect(out.mechanismSummary!.statement).toMatch(/^Motion not checked: /);
    }
  }, 120_000);

  it('gives a static fastened assembly no verdict summary', async () => {
    const out = await evaluateScriptTool({ code: model('fastened-geometry', false).replace('.rotateZ(shoulderDeg)', '') });
    expect(out.diagnostics.some((x) => x.code === 'mechanism.motion-on-fixed-joint')).toBe(false);
    expect(out.mechanismSummary).toBeUndefined();
  }, 120_000);

  it('reads an opted-out probe on a moving model as not checked', async () => {
    const out = await evaluateScriptTool({ code: model('revolute'), skipMechanismCheck: true });
    expect(out.mechanism).toBeUndefined();
    expect(out.mechanismSummary?.verdict).toBe('unverified');
    expect(out.mechanismSummary?.statement).toMatch(/^Motion not checked: skipMechanismCheck/);
  }, 120_000);

  it('declares mechanismSummary in the MCP output schema', () => {
    expect(TOOL_OUTPUT_SCHEMAS.evaluate_script.properties.mechanismSummary).toBeDefined();
    expect(TOOL_OUTPUT_SCHEMAS.review_cad.properties.mechanismSummary).toBeDefined();
  });
});
