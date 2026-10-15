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

  it('fails an animation that drives a joint past its limits, and states what a real run checked', async () => {
    const past = await evaluateScriptTool({ code: model('revolute').replace('from: -20, to: 20', 'from: -20, to: 30').replace('min: -20, max: 20', 'min: -40, max: 40') });
    const d = past.diagnostics.find((x) => x.code === 'kinematic.pose.out-of-limits' && x.severity === 'error');
    expect(d?.message).toMatch(/param 'shoulderDeg' to 30 .* joint 'shoulder' at 30°, outside its limits \[-20, 20\]°/);
    expect(past.mechanismSummary).toMatchObject({ verdict: 'broken', maxLevel: 'error' });

    const inside = await evaluateScriptTool({ code: model('revolute') });
    expect(inside.mechanismSummary).toMatchObject({ verdict: 'real', maxLevel: 'ok' });
    expect(inside.mechanismSummary!.statement).toMatch(/animation within limits on 1 joint, all mates satisfied, no collisions/);
  }, 120_000);

  it('names the mate of an over-constrained loop on a model that animates', async () => {
    const code = `
const h = param('heightMm', 10, { min: 5, max: 20 });
const arm = assembly('tri');
const a = arm.part('a', box(10, 10, h));
const b = arm.part('b', box(10, 10, 10).translate(10, 0, 0));
const c = arm.part('c', box(10, 10, 10).translate(0, 10, 0));
a.connector('ab', { type: 'frame', origin: { kind: 'vec3', value: [10, 5, 5] } }); b.connector('ab', { type: 'frame', origin: { kind: 'vec3', value: [10, 5, 5] } });
b.connector('bc', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 5] } }); c.connector('bc', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 5] } });
c.connector('ca', { type: 'frame', origin: { kind: 'vec3', value: [5, 10, 5] } }); a.connector('ca', { type: 'frame', origin: { kind: 'vec3', value: [7, 10, 5] } });
arm.mate('ab', 'a.ab', 'b.ab', 'fastened');
arm.mate('bc', 'b.bc', 'c.bc', 'fastened');
arm.mate('ca', 'c.ca', 'a.ca', 'fastened');
animationView({ param: 'heightMm', from: 5, to: 20, durationMs: 1000 });
return arm.model();`;
    const out = await evaluateScriptTool({ code });
    expect(out.mechanism).toBe('broken');
    const f = out.mechanismSummary?.failures.find((x) => x.code === 'assembly.mate.over-constrained');
    expect(f?.joint).toBeDefined();
    expect(f?.reason).toMatch(/^Mate '\w+' contradicts the other mates in its closed loop/);
  }, 120_000);

  it('declares mechanismSummary in the MCP output schema', () => {
    expect(TOOL_OUTPUT_SCHEMAS.evaluate_script.properties.mechanismSummary).toBeDefined();
    expect(TOOL_OUTPUT_SCHEMAS.review_cad.properties.mechanismSummary).toBeDefined();
  });
});
