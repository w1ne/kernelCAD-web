// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// An animation that drives a coupleMates source also drives the coupled mate.
// The animation-limits check must evaluate the coupled mate at
// source * ratio + offset and fail when that pose is past its own limits.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';

function model(ratio: number, offset = 0, extra = ''): string {
  const axis = (z: number) => `{ type: 'axis', origin: { kind: 'vec3', value: [0, 0, ${z}] }, axis: [0, 0, 1] }`;
  return `
const inputDeg = param('inputDeg', 0, { min: -20, max: 20 });
const arm = assembly('gear-pair');
const base = arm.part('base', box(80, 40, 10).translate(-20, -20, 0));
const pinion = arm.part('pinion', box(30, 6, 4).translate(0, -3, 10));
const wheel = arm.part('wheel', box(30, 6, 4).translate(40, -3, 10));
base.connector('in', ${axis(10)});
pinion.connector('in', ${axis(10)});
base.connector('out', { type: 'axis', origin: { kind: 'vec3', value: [40, 0, 10] }, axis: [0, 0, 1] });
wheel.connector('out', { type: 'axis', origin: { kind: 'vec3', value: [40, 0, 10] }, axis: [0, 0, 1] });
arm.mate('input', 'base.in', 'pinion.in', 'revolute', { pose: inputDeg, limitsDeg: [-20, 20] });
arm.mate('output', 'base.out', 'wheel.out', 'revolute', { limitsDeg: [-30, 30] });
arm.coupleMates('output', { source: 'input', ratio: ${ratio}, offset: ${offset} });
${extra}
animationView({ param: 'inputDeg', from: -20, to: 20, durationMs: 1000 });
return arm.model();`;
}

describe('evaluate_script animation limits on a coupled mate', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('fails when the source animation drives the coupled mate past its limits', async () => {
    const out = await evaluateScriptTool({ code: model(2) });
    const d = out.diagnostics.find((x) => x.code === 'kinematic.pose.out-of-limits' && x.severity === 'error');
    expect(d?.message).toMatch(/param 'inputDeg' to -20 .* joint 'output' at -40° through its coupling to 'input', outside its limits \[-30, 30\]°/);
    expect(out.mechanismSummary).toMatchObject({ verdict: 'broken', maxLevel: 'error' });
  }, 120_000);

  it('applies the coupling offset', async () => {
    const out = await evaluateScriptTool({ code: model(1, 15) });
    const d = out.diagnostics.find((x) => x.code === 'kinematic.pose.out-of-limits' && x.severity === 'error');
    expect(d?.message).toMatch(/param 'inputDeg' to 20 .* joint 'output' at 35°/);
  }, 120_000);

  it('follows a chain of couplings', async () => {
    const chain = `
const idler = arm.part('idler', box(20, 6, 4).translate(60, -3, 10));
base.connector('idle', { type: 'axis', origin: { kind: 'vec3', value: [60, 0, 10] }, axis: [0, 0, 1] });
idler.connector('idle', { type: 'axis', origin: { kind: 'vec3', value: [60, 0, 10] }, axis: [0, 0, 1] });
arm.mate('idle', 'base.idle', 'idler.idle', 'revolute', { limitsDeg: [-10, 10] });
arm.coupleMates('idle', { source: 'output', ratio: 1 });`;
    const out = await evaluateScriptTool({ code: model(1, 0, chain) });
    const d = out.diagnostics.filter((x) => x.code === 'kinematic.pose.out-of-limits' && x.severity === 'error');
    expect(d.map((x) => x.message)).toEqual([
      expect.stringMatching(/joint 'idle' at -20° through its coupling to 'output', outside its limits \[-10, 10\]°/),
    ]);
  }, 120_000);

  it('passes when the coupled mate stays inside its limits', async () => {
    const out = await evaluateScriptTool({ code: model(-1.5) });
    expect(out.diagnostics.some((x) => x.code === 'kinematic.pose.out-of-limits')).toBe(false);
  }, 120_000);
});
