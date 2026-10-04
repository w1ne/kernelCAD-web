// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  MISSING_FILLET_CODE,
  STACKED_PRIMITIVE_TOY_CODE,
  appendRevisionAssistPrompt,
  buildRevisionAssist,
  hasRepairableDiagnostic,
  isProductionIntentGoal,
  missingFilletFacts,
  stackedPrimitiveToyFacts,
  type RevisionAssist,
} from './revisionAssist';

describe('revisionAssist heuristics', () => {
  it('detects production-intent goals', () => {
    expect(isProductionIntentGoal('real production bearing housing')).toBe(true);
    expect(isProductionIntentGoal('complex gearbox enclosure')).toBe(true);
    expect(isProductionIntentGoal('robot arm with real proportions')).toBe(true);
    expect(isProductionIntentGoal('simple blockout toy')).toBe(false);
  });

  it('fail-closes stacked-primitive toys for production goals', () => {
    const toy = `
const a = box(30, 30, 10);
const b = box(20, 20, 10).translate(5, 5, 10);
const c = box(10, 10, 10).translate(10, 10, 20);
return a.union(b).union(c);
`;
    const facts = stackedPrimitiveToyFacts(toy, 'production enclosure housing', []);
    expect(facts.map((f) => f.code)).toEqual([STACKED_PRIMITIVE_TOY_CODE]);
  });

  it('allows manufacturing-intent housing (subtract + fillet)', () => {
    const code = `
let body = box(120, 80, 50);
body = body.subtract(box(112, 72, 46).translate(4, 4, 4));
return body.fillet(1.5);
`;
    expect(stackedPrimitiveToyFacts(code, 'complex machined housing', [])).toEqual([]);
  });

  it('skips stacked check for mechanism assemblies', () => {
    const mech = `
const arm = assembly('a');
const p = arm.part('base', box(10,10,10).union(box(5,5,5).translate(0,0,10)).union(box(3,3,3)));
arm.mate('m', 'a', 'b', 'revolute');
return arm.solvedModel();
`;
    expect(stackedPrimitiveToyFacts(mech, 'complex robot arm', [])).toEqual([]);
  });

  it('flags missing fillet on housing cavity scripts', () => {
    const code = `
let body = box(120, 80, 50);
body = body.subtract(box(112, 72, 46).translate(4, 4, 4));
return body;
`;
    const facts = missingFilletFacts(code, 'production bearing housing', []);
    expect(facts.map((f) => f.code)).toEqual([MISSING_FILLET_CODE]);
  });

  it('recognizes repairable diagnostic codes', () => {
    expect(hasRepairableDiagnostic([{ code: 'feature.subtractive-noop' }])).toBe(true);
    expect(hasRepairableDiagnostic([{ code: 'feature.edge-feature.short-edges-skipped' }])).toBe(true);
    expect(hasRepairableDiagnostic([{ code: 'assembly.pose.out-of-limits' }])).toBe(false);
  });

  it('appends revision assist onto nextActionPrompt', () => {
    const assist: RevisionAssist = {
      mode: 'suggested-patches',
      honesty: 'test honesty',
      hints: [{ code: 'feature.subtractive-noop', summary: 'cutter missed' }],
      suggestedPatches: [{
        id: 'c1',
        diagnosticCode: 'feature.subtractive-noop',
        summary: 'translate cutter',
        predictedEffect: 'boolean contacts',
        diff: '@@ -1 +1 @@',
        evidence: {},
      }],
    };
    const out = appendRevisionAssistPrompt('Fix the root cause.', assist);
    expect(out).toContain('Revision assist');
    expect(out).toContain('suggested-patches');
    expect(out).toContain('translate cutter');
  });
});

describe('revisionAssist industry J/K cookbook routing', () => {
  it('routes scissor / closed-loop goals to scissor-lift cookbook', async () => {
    const assist = await buildRevisionAssist({
      source: 'return box(1,1,1);',
      goal: 'production scissor-lift table with pin_slot closed loop',
      reviewFacts: [{ code: 'assembly.solver.did-not-converge', severity: 'error', message: 'loop' }],
      diagnostics: [],
      autoRevise: false,
    });
    expect(assist?.hints.some((h) => h.code === 'cookbook.scissor-lift')).toBe(true);
    expect(assist?.nextTool).toEqual({
      name: 'lookup_cookbook',
      args: { query: 'scissor lift closed loop' },
    });
  });

  it('routes 4-DOF arm goals to multi-dof cookbook and bridges floating yokes', async () => {
    const assist = await buildRevisionAssist({
      source: 'return box(1,1,1);',
      goal: 'production 4-DOF robot arm with yaw shoulder elbow wrist',
      reviewFacts: [{
        code: 'assembly.geometry.floating-body',
        severity: 'warning',
        message: 'yoke floats',
      }],
      diagnostics: [],
      autoRevise: false,
    });
    expect(assist?.hints.some((h) => h.code === 'cookbook.multi-dof-arm')).toBe(true);
    expect(assist?.hints.some((h) => h.code === 'repair.bridge-yoke-load-path')).toBe(true);
    expect(assist?.nextTool).toEqual({
      name: 'lookup_cookbook',
      args: { query: 'multi dof robot arm 4axis' },
    });
  });
});
