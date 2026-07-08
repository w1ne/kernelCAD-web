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

vi.mock('../../../src/agent/mcp/tools/reviewCad', () => ({
  reviewCadTool: () => {
    throw new Error('design_loop should use runReviewPipeline, not reviewCadTool');
  },
}));

import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

function cleanReviewOutput(): ReviewCadOutput {
  return {
    ok: true,
    featureCount: 1,
    diagnostics: [],
    assembly: 'clean',
    validator: { status: 'ok', diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: {
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
    },
    repairContext: {
      blockingReasons: [],
      topDiagnostics: [],
      preserveInterfaces: [],
      designGoal: '',
    },
  };
}

describe('design_loop review boundary', () => {
  it('uses the shared review pipeline instead of the MCP review_cad adapter', async () => {
    runReviewPipeline.mockResolvedValueOnce(cleanReviewOutput());

    await expect(designLoopTool({
      goal: 'Keep design loop off the MCP adapter.',
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'clean', code: 'return undefined;' }],
    })).resolves.toMatchObject({ ok: true, finalAttemptId: '01' });

    expect(runReviewPipeline).toHaveBeenCalledTimes(1);
    expect(runReviewPipeline.mock.calls[0]?.[0]).toMatchObject({
      code: 'return undefined;',
      designGoal: 'Keep design loop off the MCP adapter.',
    });
  });
});
