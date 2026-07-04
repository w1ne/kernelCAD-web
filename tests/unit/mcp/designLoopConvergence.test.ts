// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Convergence guard: when successive attempts fail the same way, the loop
// should say so — "topology-redesign attempted N times with no progress" —
// instead of silently handing back the last attempt's repair prompt as if
// one more nudge would converge. No silent caps.

import { describe, it, expect } from 'vitest';
import { detectConvergenceStall } from '../../../src/agent/mcp/tools/designLoop';
import type { DesignLoopAttemptResult } from '../../../src/agent/mcp/tools/designLoop';

function attempt(
  id: string,
  ok: boolean,
  repairMode: DesignLoopAttemptResult['repairMode'],
  factCodes: string[],
): DesignLoopAttemptResult {
  return {
    id, title: id, ok, functional: false, qualityOk: ok,
    featureCount: 1, diagnosticCount: factCodes.length,
    reviewFacts: factCodes.map((code) => ({ code, severity: 'warning', message: code })),
    repairMode, passedChecks: [], blockingReasons: [],
    nextActionPrompt: 'repair',
  };
}

describe('detectConvergenceStall', () => {
  it('returns undefined for a single attempt', () => {
    expect(detectConvergenceStall([attempt('01', false, 'topology-redesign', ['a'])])).toBeUndefined();
  });

  it('returns undefined when the final attempt passed', () => {
    const attempts = [
      attempt('01', false, 'local-fix', ['a']),
      attempt('02', true, 'none', []),
    ];
    expect(detectConvergenceStall(attempts)).toBeUndefined();
  });

  it('escalates when the last two attempts share the same failure signature', () => {
    const attempts = [
      attempt('01', false, 'topology-redesign', ['assembly.geometry.floating-body']),
      attempt('02', false, 'topology-redesign', ['assembly.geometry.floating-body']),
    ];
    const stall = detectConvergenceStall(attempts);
    expect(stall?.escalate).toBe(true);
    expect(stall?.repeatCount).toBe(2);
    expect(stall?.reason).toContain('topology-redesign');
  });

  it('does not escalate when each attempt resolves a different fact (progress)', () => {
    const attempts = [
      attempt('01', false, 'local-fix', ['a', 'b']),
      attempt('02', false, 'local-fix', ['a']),
    ];
    expect(detectConvergenceStall(attempts)).toBeUndefined();
  });
});
