// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { summarizeMechanism } from './mechanismVerdict';

const coverage = { poses: 7, joints: 3, fastened: 2, sweep: true, physics: false };

describe('summarizeMechanism', () => {
  it('states what a real verdict checked and what it did not', () => {
    const s = summarizeMechanism({ mechanism: 'real', failures: [], coverage });
    expect(s.statement).toBe(
      'Motion checked: 7 poses across 3 joints (each joint at its limits), no collisions, fastened parts stay rigid. Gravity not checked.',
    );
  });

  it('never reads unverified as a pass and says why', () => {
    const budget = {
      target: 'export-occt', code: 'mechanism.unverified-budget-exceeded', severity: 'warn',
      message: 'The articulated BREP pose-sweep ... was SKIPPED: estimated work 600 exceeds the budget 300 (24 parts ...)', hint: 'h',
    } as CompilerDiagnostic;
    const s = summarizeMechanism({ mechanism: 'unverified', failures: [budget], coverage: { ...coverage, sweep: false } });
    expect(s.verdict).toBe('unverified');
    expect(s.statement).toMatch(/^Motion not checked: collision sweep .* work 600 is over the budget 300\. Do not call this mechanism working\.$/);
    expect(s.checked).toEqual([]);
  });

  it('names the joint of a broken verdict', () => {
    const d = {
      target: 'export-occt', code: 'mechanism.motion-on-fixed-joint', severity: 'error',
      message: "Joint drive 'shoulder-drive' turns joint 'shoulder', but 'shoulder' is fastened.", hint: 'h', mateName: 'shoulder',
    } as CompilerDiagnostic;
    const s = summarizeMechanism({ mechanism: 'broken', failures: [d] });
    expect(s.statement).toBe("Mechanism broken: Joint drive 'shoulder-drive' turns joint 'shoulder', but 'shoulder' is fastened.");
    expect(s.failures).toEqual([{ code: d.code, reason: d.message, joint: 'shoulder' }]);
  });
});
