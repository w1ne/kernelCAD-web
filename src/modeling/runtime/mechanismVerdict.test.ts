// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { summarizeMechanism } from './mechanismVerdict';

const coverage = { poses: 7, joints: 3, fastened: 2, sweep: true, physics: false, limitsChecked: 2, matesChecked: true, skipped: [] as string[] };

describe('summarizeMechanism', () => {
  it('states what a real verdict checked and what it did not', () => {
    const s = summarizeMechanism({ mechanism: 'real', failures: [], coverage });
    expect(s.statement).toBe(
      'Motion checked: 7 poses across 3 joints (each joint at its limits), animation within limits on 2 joints, all mates satisfied, no collisions, fastened parts stay rigid. Gravity not checked.',
    );
    expect(s.maxLevel).toBe('ok');
  });

  it('names declared ignore pairs while keeping them in collision coverage', () => {
    const s = summarizeMechanism({
      mechanism: 'real',
      failures: [],
      coverage: { ...coverage, ignoredPairs: [['base-frame', 'platform']] },
    });
    expect(s.checked).toContain('no swept collisions; declared ignore pairs also checked during travel: base-frame ↔ platform');
    expect(s.statement).toContain('declared ignore pairs also checked during travel: base-frame ↔ platform');
    expect(s.ignoredPairs).toEqual([['base-frame', 'platform']]);
  });

  it('keeps a real verdict ok but names the joint ranges it could not check', () => {
    const skipped = ["joint 'slide' offset has no limits, range not checked", "joint 'elbow' rotation has no limits, range not checked"];
    const s = summarizeMechanism({ mechanism: 'real', failures: [], coverage: { ...coverage, skipped } });
    expect(s).toMatchObject({ verdict: 'real', maxLevel: 'ok', skipped });
    expect(s.statement).toMatch(/Not checked: joint 'slide' offset has no limits, range not checked \(\+1 more\)\. Gravity not checked\.$/);
  });

  it('never reads unverified as a pass and says why', () => {
    const budget = {
      target: 'export-occt', code: 'mechanism.unverified-budget-exceeded', severity: 'warn',
      message: 'The articulated BREP pose-sweep ... was SKIPPED: estimated work 600 exceeds the budget 300 (24 parts ...)', hint: 'h',
    } as CompilerDiagnostic;
    const s = summarizeMechanism({ mechanism: 'unverified', failures: [budget], coverage: { ...coverage, sweep: false } });
    expect(s.verdict).toBe('unverified');
    expect(s.maxLevel).toBe('warning');
    expect(s.statement).toMatch(/^Motion not checked: collision sweep .* work 600 is over the budget 300\. Do not call this mechanism working\.$/);
    expect(s.checked).toEqual([]);
  });

  it('names declared ignore pairs when a collision sweep is unverified', () => {
    const budget = {
      target: 'export-occt', code: 'mechanism.unverified-budget-exceeded', severity: 'warn',
      message: 'The articulated BREP pose-sweep was SKIPPED: estimated work 600 exceeds the budget 300.', hint: 'h',
    } as CompilerDiagnostic;
    const s = summarizeMechanism({
      mechanism: 'unverified',
      failures: [budget],
      coverage: { ...coverage, sweep: false, ignoredPairs: [['base-frame', 'platform']] },
    });
    expect(s.statement).toContain('Declared ignore pairs are not certified clear across joint travel: base-frame ↔ platform');
    expect(s.ignoredPairs).toEqual([['base-frame', 'platform']]);
  });

  it('names an unsupported closed loop as skipped physics, not a broken mechanism', () => {
    const unsupported = {
      target: 'export-occt', code: 'mechanism.physics-unsupported', severity: 'warn',
      message: 'Physics was not run because the mate graph is a closed loop.', hint: 'h',
    } as CompilerDiagnostic;
    const s = summarizeMechanism({
      mechanism: 'unverified',
      failures: [unsupported],
      coverage: { ...coverage, sweep: true, physics: false },
    });
    expect(s.verdict).toBe('unverified');
    expect(s.maxLevel).toBe('warning');
    expect(s.statement).toMatch(/closed-loop mate graphs are unsupported/);
    expect(s.statement).toMatch(/Do not call this mechanism working/);
    expect(s.failures).toEqual([]);
  });

  it('names unavailable rest-pose continuity in an unverified summary', () => {
    const unknown = {
      target: 'export-occt', code: 'mechanism.joint-mesh-unverified', severity: 'warn',
      message: "Joint 'select' parent body 'parent': rest-pose continuity could not be measured because both measurement paths failed.",
      hint: 'h', details: { mateName: 'select', partName: 'parent', side: 'parent' },
    } as CompilerDiagnostic;
    const s = summarizeMechanism({ mechanism: 'unverified', failures: [unknown], coverage });
    expect(s.verdict).toBe('unverified');
    expect(s.maxLevel).toBe('warning');
    expect(s.skipped).toContain("rest-pose joint continuity could not be measured at 'select' on 'parent'");
    expect(s.statement).toMatch(/^Motion not checked: rest-pose joint continuity could not be measured at 'select' on 'parent'\. Do not call this mechanism working\.$/);
    expect(s.failures).toEqual([]);
  });

  it('names the joint of a broken verdict', () => {
    const d = {
      target: 'export-occt', code: 'mechanism.motion-on-fixed-joint', severity: 'error',
      message: "Joint drive 'shoulder-drive' turns joint 'shoulder', but 'shoulder' is fastened.", hint: 'h', mateName: 'shoulder',
    } as CompilerDiagnostic;
    const s = summarizeMechanism({
      mechanism: 'broken',
      failures: [d],
      coverage: { ...coverage, ignoredPairs: [['base-frame', 'platform']] },
    });
    expect(s.statement).toBe("Mechanism broken: Joint drive 'shoulder-drive' turns joint 'shoulder', but 'shoulder' is fastened. Declared ignore pairs: base-frame ↔ platform.");
    expect(s.failures).toEqual([{ code: d.code, reason: d.message, joint: 'shoulder' }]);
    expect(s.maxLevel).toBe('error');
    expect(s.ignoredPairs).toEqual([['base-frame', 'platform']]);
  });
});
