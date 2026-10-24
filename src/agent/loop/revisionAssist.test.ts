// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  appendRevisionAssistPrompt,
  buildRevisionAssist,
  hasRepairableDiagnostic,
  type RevisionAssist,
} from './revisionAssist';

describe('revisionAssist heuristics', () => {
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

describe('revisionAssist diagnostic-keyed hints', () => {
  it('emits grounded-root hint naming explicit stableParts, not part names', async () => {
    const assist = await buildRevisionAssist({
      source: 'return box(1,1,1);',
      goal: 'anything',
      reviewFacts: [{ code: 'assembly.connectivity.floating-moving-part', severity: 'warning', message: 'floats' }],
      diagnostics: [],
      autoRevise: false,
    });
    const hint = assist?.hints.find((h) => h.code === 'repair.grounded-root');
    expect(hint?.suggestedChange).toContain('stableParts');
    expect(hint?.suggestedChange).not.toMatch(/base-frame|ground \/ root/);
    expect(assist?.nextTool).toBeUndefined();
  });

  it('emits no hints for an unrelated goal without review facts', async () => {
    const assist = await buildRevisionAssist({
      source: 'return box(1,1,1);',
      goal: 'production 4-DOF robot arm scissor lift housing',
      reviewFacts: [],
      diagnostics: [],
      autoRevise: false,
    });
    expect(assist).toBeUndefined();
  });
});
