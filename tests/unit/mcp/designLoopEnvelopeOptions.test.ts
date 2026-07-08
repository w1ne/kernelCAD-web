import { describe, expect, it, vi } from 'vitest';
import type { MechanismFitnessResult } from '../../../src/modeling/mates/mechanismFitness';
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

// Imported after the mock so designLoopTool's review-pipeline reference is the mock.
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

function cleanFitness(): MechanismFitnessResult {
  return {
    functional: true,
    repairMode: 'none',
    repairDirective: 'No repair needed. Preserve the current design and rerun review_cad after changes.',
    passedChecks: ['validator-no-errors'],
    blockingReasons: [],
    mechanismSummary: {
      sampleCount: 0,
      interferenceCount: 0,
      trackedConnectorCount: 0,
    },
  };
}

function cleanReviewOutput(): ReviewCadOutput {
  return {
    ok: true,
    featureCount: 1,
    diagnostics: [],
    assembly: 'clean',
    validator: { status: 'ok', diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: cleanFitness(),
    repairContext: {
      blockingReasons: [],
      topDiagnostics: [],
      preserveInterfaces: [],
      designGoal: '',
    },
  };
}

describe('design_loop envelope-option pass-through', () => {
  it('designLoopTool forwards samplesPerMate per attempt', async () => {
    runReviewPipeline.mockReset();
    runReviewPipeline.mockResolvedValue(cleanReviewOutput());

    await designLoopTool({
      goal: 'Test samplesPerMate plumbing.',
      requireVisualReview: false,
      samplesPerMate: 5,
      attempts: [{ id: '01', title: 'attempt-1', code: 'return undefined;' }],
    });

    expect(runReviewPipeline).toHaveBeenCalledTimes(1);
    const reviewInput = runReviewPipeline.mock.calls[0]?.[0];
    expect(reviewInput?.samplesPerMate).toBe(5);
  });

  it('designLoopTool forwards combinatorial per attempt', async () => {
    runReviewPipeline.mockReset();
    runReviewPipeline.mockResolvedValue(cleanReviewOutput());

    await designLoopTool({
      goal: 'Test combinatorial plumbing.',
      requireVisualReview: false,
      combinatorial: true,
      attempts: [{ id: '01', title: 'attempt-1', code: 'return undefined;' }],
    });

    expect(runReviewPipeline).toHaveBeenCalledTimes(1);
    const reviewInput = runReviewPipeline.mock.calls[0]?.[0];
    expect(reviewInput?.combinatorial).toBe(true);
  });
});
