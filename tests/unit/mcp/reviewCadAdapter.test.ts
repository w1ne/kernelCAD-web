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

import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

describe('review_cad MCP adapter', () => {
  it('delegates review execution to the shared review pipeline', async () => {
    const output = {
      ok: false,
      featureCount: 0,
      diagnostics: [],
      repairContext: {
        blockingReasons: [],
        topDiagnostics: [],
        preserveInterfaces: [],
        designGoal: '',
      },
      suggestedRepairPrompt: 'fix',
    } satisfies ReviewCadOutput;
    runReviewPipeline.mockResolvedValueOnce(output);

    const input: ReviewCadInput = { code: 'return box(1, 1, 1);' };
    await expect(reviewCadTool(input)).resolves.toBe(output);
    expect(runReviewPipeline).toHaveBeenCalledTimes(1);
    expect(runReviewPipeline).toHaveBeenCalledWith(input);
  });
});
