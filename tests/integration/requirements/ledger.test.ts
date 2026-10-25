// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

describe('requirements ledger (S2)', () => {
  it('measures every kernel-computed predicate and reports status / measured / limit / margin', async () => {
    const code = `
const body = box(40, 30, 10);
const plate = body.subtract(cylinder(12, 4).translate(20, 15, -1));
const boss = cylinder(8, 6).translate(8, 8, 10);
const other = box(10, 10, 10).translate(50, 0, 0);

require('volume-band', volume(body).between(11_000, 13_000));
require('mass-band', mass(body).atDensity(2700).between(0.02, 0.04));
require('bbox-band', bbox(body).within({ x: [39, 41], y: [29, 31], z: [9, 11] }));
require('com-band', centerOfMass(body).within({ x: [19, 21], y: [14, 16], z: [4, 6] }));
require('face-count', count(faces(body)).eq(6));
require('top-inner-loop', innerLoops(faces(plate, { byNormal: 'Z' })).gte(1));
require('gap', clearance(body, other).gte(1));
require('distance-band', distance(body, other).in([9, 11]));
require('top-angle', angle(faces(body, { byNormal: 'Z' }), faces(body, { byNormal: 'Z' })).lte(1));
require('boss-concentric', concentric(faces(boss, { ofSurfaceType: 'CYLINDER' }), faces(boss, { ofSurfaceType: 'CYLINDER' })).within(0.05));
require('top-coplanar', coplanar(faces(body, { byNormal: 'Z' }), faces(body, { byNormal: 'Z' })).within(0.05));

return body;
`;
    const built = await evaluateAndBuildScript({ code });
    expect(built.evaluation.exitCode).toBe(0);
    const ledger = built.evaluation.requirements;
    expect(ledger).toBeDefined();
    expect(ledger!.entries).toHaveLength(11);
    expect(ledger!.summary).toEqual({ pass: 11, fail: 0, notEvaluated: 0 });
    expect(ledger!.ok).toBe(true);
    for (const entry of ledger!.entries) {
      expect(entry.status).toBe('pass');
      expect(entry.measured).not.toBeNull();
      expect(entry.limit).not.toBeNull();
      expect(typeof entry.margin).toBe('number');
    }
  });


  it('ships a passing example under examples/requirements-ledger.kcad.ts', async () => {
    const built = await evaluateAndBuildScript({ file: 'examples/requirements-ledger.kcad.ts' });
    expect(built.evaluation.exitCode).toBe(0);
    expect(built.evaluation.requirements?.ok).toBe(true);
    expect(built.evaluation.requirements?.entries.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps a failing clearance and a passing control in one ledger', async () => {
    const code = `
const bracket = box(10, 10, 10);
const housing = box(10, 10, 10).translate(10.5, 0, 0);
require('bolt-clearance', clearance(bracket, housing).gte(1.0));
require('control-gap', clearance(bracket, housing).gte(0.25));
return bracket;
`;
    const built = await evaluateAndBuildScript({ code });
    const entries = built.evaluation.requirements!.entries;
    const failing = entries.find(e => e.name === 'bolt-clearance')!;
    const passing = entries.find(e => e.name === 'control-gap')!;
    expect(failing).toMatchObject({ status: 'fail', measured: expect.closeTo(0.5), limit: 1, margin: expect.closeTo(-0.5) });
    expect(passing).toMatchObject({ status: 'pass', measured: expect.closeTo(0.5), limit: 0.25, margin: expect.closeTo(0.25) });
    expect(failing.message).toMatch(/measured 0\.500, limit 1/);
    expect(built.evaluation.requirements!.ok).toBe(false);
  });

  it('grades a build from call-time requirements alone (no require() and no expert geometry)', async () => {
    const code = 'const body = box(20, 20, 5); return body;';
    const result = await verifyTool({
      check: 'requirements',
      code,
      requirements: [
        { name: 'envelope', predicate: { metric: 'bbox', a: { kind: 'body', ref: 'box_1' }, op: 'within', limit: { x: [19, 21], y: [19, 21], z: [4, 6] } } },
        { name: 'volume-floor', predicate: { metric: 'volume', a: { kind: 'body', ref: 'box_1' }, op: 'gte', limit: 1500 } },
        { name: 'must-fail', predicate: { metric: 'count', a: { kind: 'faces', ref: 'box_1' }, op: 'eq', limit: 5 } },
      ],
    }) as { ok: boolean; requirements: { ok: boolean; summary: { pass: number; fail: number; notEvaluated: number }; entries: Array<{ name: string; source: string; status: string }> } };

    expect(result.requirements.summary).toEqual({ pass: 2, fail: 1, notEvaluated: 0 });
    expect(result.requirements.ok).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.requirements.entries.filter(e => e.source === 'external')).toHaveLength(3);
    expect(result.requirements.entries.find(e => e.name === 'must-fail')).toMatchObject({ status: 'fail' });
  });

  it('design_loop blocks an attempt whose external requirement fails', async () => {
    const code = 'const body = box(10, 10, 10); return body;';
    const result = await designLoopTool({
      goal: 'a ten millimetre cube',
      attempts: [{ id: 'a', code }],
      requireVisualReview: false,
      stopOnPass: true,
      autoRevise: false,
      requirements: [
        { name: 'height-20', predicate: { metric: 'bbox', a: { kind: 'body', ref: 'box_1' }, op: 'within', limit: { z: [19, 21] } } },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.attempts[0].requirements?.ok).toBe(false);
    expect(result.attempts[0].requirements?.entries.find(e => e.name === 'height-20')?.status).toBe('fail');
    expect(result.attempts[0].reviewFacts.some(f => f.code === 'requirement.failed')).toBe(true);
  });

  it('carries S1 binding fingerprints on requirement selections and keeps drift quiet on re-evaluation', async () => {
    const code = `
const plate = box(30, 20, 5).subtract(cylinder(6, 3).translate(15, 10, -1));
require('one-hole', innerLoops(faces(plate, { byNormal: 'Z' })).gte(1));
return plate;
`;
    const first = await evaluateAndBuildScript({ code });
    const entry = first.evaluation.requirements!.entries[0];
    expect(entry.selections).toHaveLength(1);
    expect(entry.selections[0].selectorText).toContain('faces(');
    expect(entry.selections[0].fingerprints.length).toBeGreaterThan(0);
    expect(entry.selections[0].fingerprints[0]).toMatchObject({ entityKind: 'face', producer: 'box_1' });
    expect(first.model!.selections.some(s => s.consumerFeatureId === entry.featureId)).toBe(true);

    const second = await evaluateAndBuildScript({ code, baseline: first.model!.selections });
    expect(second.evaluation.diagnostics.filter(d => d.code.startsWith('selector.binding-'))).toEqual([]);
    expect(second.evaluation.requirements!.entries[0].status).toBe('pass');
  });
});
