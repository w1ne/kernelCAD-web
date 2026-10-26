// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import type { ReviewCadInput, ReviewCadOutput } from '../../../src/agent/review/reviewPipeline';

const runReviewPipeline = vi.fn<(input: ReviewCadInput) => Promise<ReviewCadOutput>>();

vi.mock('../../../src/agent/review/reviewPipeline', async () => {
  const actual = await vi.importActual<typeof import('../../../src/agent/review/reviewPipeline')>(
    '../../../src/agent/review/reviewPipeline',
  );
  return {
    ...actual,
    runReviewPipeline: (input: ReviewCadInput) => runReviewPipeline(input),
  };
});

vi.mock('../../../src/agent/mcp/tools/repairScript', () => ({
  repairScriptTool: vi.fn(async () => ({
    ok: false,
    strategy: 'try-all',
    candidates: [],
    attempts: [],
    candidateStatus: 'no-automatic-candidate',
  })),
}));

import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

function cleanReview(): ReviewCadOutput {
  return {
    ok: true,
    featureCount: 3,
    diagnostics: [],
    assembly: undefined,
    validator: { status: 'ok', diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: {
      functional: true,
      repairMode: 'none',
      repairDirective: 'No repair needed.',
      passedChecks: ['validator-no-errors'],
      blockingReasons: [],
      mechanismSummary: { sampleCount: 0, interferenceCount: 0, trackedConnectorCount: 0 },
    },
    repairContext: {
      blockingReasons: [],
      topDiagnostics: [],
      preserveInterfaces: [],
      designGoal: '',
    },
    suggestedRepairPrompt: 'No repair needed.',
  };
}


describe('design_loop revision assist', () => {
  it('passes manufacturing-intent housing with no quality facts', async () => {
    runReviewPipeline.mockResolvedValue(cleanReview());

    const housing = [
      'const L = param("length", 120);',
      'let body = box(L, 80, 50);',
      'body = body.subtract(box(112, 72, 46).translate(4, 4, 4));',
      'return body.fillet(1.5);',
    ].join('\n');

    const result = await designLoopTool({
      goal: 'Build a real production bearing housing enclosure',
      requireVisualReview: false,
      autoRevise: false,
      attempts: [{ code: housing }],
    });

    expect(result.ok).toBe(true);
    expect(result.attempts[0].reviewFacts).toEqual([]);
    expect(result.revisionAssist).toBeUndefined();
  });

  it('treats clean single-body solids as functionally green (no assembly required)', async () => {
    runReviewPipeline.mockResolvedValue({
      ok: false,
      featureCount: 5,
      diagnostics: [],
      repairContext: {
        blockingReasons: [],
        topDiagnostics: [],
        preserveInterfaces: [],
        designGoal: '',
      },
      suggestedRepairPrompt:
        'review_cad: no assembly captured by the script. Return arm.model() or arm.solvedModel(...) from a script that calls assembly(...).',
    });

    const housing = [
      'let body = box(120, 80, 50);',
      'body = body.subtract(box(112, 72, 46).translate(4, 4, 4));',
      'return body.fillet(1.5);',
    ].join('\n');

    const result = await designLoopTool({
      goal: 'production machined bearing housing',
      requireVisualReview: false,
      autoRevise: false,
      attempts: [{ code: housing }],
    });

    expect(result.ok).toBe(true);
    expect(result.attempts[0]?.functional).toBe(true);
    expect(result.attempts[0]?.passedChecks).toContain('solid-only-evaluate');
  });

});
