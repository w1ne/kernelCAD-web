import { describe, expect, it, vi } from 'vitest';
import type { MechanismFitnessResult } from '../../../src/modeling/mates/mechanismFitness';
import type { ReviewCadInput, ReviewCadOutput } from '../../../src/mcp/tools/reviewCad';

const mockReviewCadTool = vi.fn<(input: ReviewCadInput) => Promise<ReviewCadOutput>>();

vi.mock('../../../src/mcp/tools/reviewCad', () => ({
  reviewCadTool: (input: ReviewCadInput) => mockReviewCadTool(input),
}));

// Imported after the mock so designLoopTool's reviewCadTool reference is the mock.
import { designLoopTool } from '../../../src/mcp/tools/designLoop';

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
    mockReviewCadTool.mockReset();
    mockReviewCadTool.mockResolvedValue(cleanReviewOutput());

    await designLoopTool({
      goal: 'Test samplesPerMate plumbing.',
      requireVisualReview: false,
      samplesPerMate: 5,
      attempts: [{ id: '01', title: 'attempt-1', code: 'return undefined;' }],
    });

    expect(mockReviewCadTool).toHaveBeenCalledTimes(1);
    const reviewInput = mockReviewCadTool.mock.calls[0]?.[0];
    expect(reviewInput?.samplesPerMate).toBe(5);
  });

  it('designLoopTool forwards combinatorial per attempt', async () => {
    mockReviewCadTool.mockReset();
    mockReviewCadTool.mockResolvedValue(cleanReviewOutput());

    await designLoopTool({
      goal: 'Test combinatorial plumbing.',
      requireVisualReview: false,
      combinatorial: true,
      attempts: [{ id: '01', title: 'attempt-1', code: 'return undefined;' }],
    });

    expect(mockReviewCadTool).toHaveBeenCalledTimes(1);
    const reviewInput = mockReviewCadTool.mock.calls[0]?.[0];
    expect(reviewInput?.combinatorial).toBe(true);
  });
});
