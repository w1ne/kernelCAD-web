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

function failingFitness(): MechanismFitnessResult {
  return {
    functional: false,
    repairMode: 'parameter-tune',
    repairDirective: 'Widen the hinge mate limits to cover the requested pose.',
    passedChecks: [],
    blockingReasons: [
      {
        code: 'assembly.pose.out-of-limits',
        message: "mate 'hinge' pose 120° exceeds limits [-90, 90].",
        repairHint: 'Widen the limits of the hinge mate to cover pose 120.',
      },
    ],
    mechanismSummary: {
      sampleCount: 0,
      interferenceCount: 0,
      trackedConnectorCount: 0,
    },
  };
}

function failingReviewOutput(): ReviewCadOutput {
  return {
    ok: false,
    featureCount: 1,
    diagnostics: [
      {
        code: 'assembly.pose.out-of-limits',
        severity: 'error',
        message: "mate 'hinge' pose 120° exceeds limits [-90, 90].",
        hint: 'Widen the limits of the hinge mate to cover pose 120.',
        mateName: 'hinge',
        pose: 120,
        limits: [-90, 90],
        sampleName: 'current',
        // PoseEnvelopeDiagnostic shape; cast loosened for the unit test.
      } as unknown as ReviewCadOutput['diagnostics'][number],
    ],
    assembly: 'rig',
    validator: {
      status: 'ok',
      diagnostics: [],
      partCount: 2,
      jointCount: 1,
    },
    fitness: failingFitness(),
    repairContext: {
      blockingReasons: [
        "assembly.pose.out-of-limits: mate 'hinge' pose 120° exceeds limits [-90, 90].",
      ],
      topDiagnostics: [
        {
          code: 'assembly.pose.out-of-limits',
          sampleName: 'current',
          mateName: 'hinge',
          suggestedDelta: { mate: 'hinge', widenBy: 30 },
        },
      ],
      preserveInterfaces: ['base-yaw mate'],
      designGoal: 'Test hinge widening repair flow.',
    },
    suggestedRepairPrompt: 'Repair the kernelCAD script using these deterministic review facts:\nRepair mode: parameter-tune\nDirective: Widen the hinge mate limits to cover the requested pose.\n\n- assembly.pose.out-of-limits [current]: mate exceeds limits. Hint: Widen the limits.',
  };
}

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
      designGoal: 'Test clean pass.',
    },
  };
}

describe('design_loop nextActionPrompt rendering from RepairContext', () => {
  it('nextActionPrompt cites blockingReasons from RepairContext on failure', async () => {
    runReviewPipeline.mockReset();
    runReviewPipeline.mockResolvedValue(failingReviewOutput());

    const result = await designLoopTool({
      goal: 'Test hinge widening repair flow.',
      preserveInterfaces: ['base-yaw mate'],
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'Out-of-limits', code: 'return undefined;' }],
    });

    expect(result.ok).toBe(false);
    const prompt = result.attempts[0].nextActionPrompt;
    expect(prompt).toContain("mate 'hinge' pose 120° exceeds limits [-90, 90].");
  });

  it('nextActionPrompt cites top diagnostics with suggestedDelta when present', async () => {
    runReviewPipeline.mockReset();
    runReviewPipeline.mockResolvedValue(failingReviewOutput());

    const result = await designLoopTool({
      goal: 'Test hinge widening repair flow.',
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'Out-of-limits', code: 'return undefined;' }],
    });

    const prompt = result.attempts[0].nextActionPrompt;
    expect(prompt).toMatch(/widen by 30/i);
    expect(prompt).toContain('hinge');
  });

  it('nextActionPrompt does not duplicate suggestedRepairPrompt verbatim', async () => {
    runReviewPipeline.mockReset();
    const review = failingReviewOutput();
    runReviewPipeline.mockResolvedValue(review);

    const result = await designLoopTool({
      goal: 'Test hinge widening repair flow.',
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'Out-of-limits', code: 'return undefined;' }],
    });

    const prompt = result.attempts[0].nextActionPrompt;
    // Verifies the prompt was BUILT from the structured context (has structured-bullet shape),
    // not just copy-pasted from result.suggestedRepairPrompt.
    expect(prompt).toMatch(/\[error\]|Top diagnostics:/i);
    // And the prompt should not be byte-equal to the raw suggestedRepairPrompt.
    expect(prompt).not.toBe((review as { suggestedRepairPrompt: string }).suggestedRepairPrompt);
  });

  it('nextActionPrompt happy path still says "no interferences" on ok:true', async () => {
    runReviewPipeline.mockReset();
    runReviewPipeline.mockResolvedValue(cleanReviewOutput());

    const result = await designLoopTool({
      goal: 'Test clean pass.',
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'Clean', code: 'return undefined;' }],
    });

    expect(result.ok).toBe(true);
    const prompt = result.attempts[0].nextActionPrompt;
    // ok:true uses fitness.repairDirective. No [error] lines.
    expect(prompt).not.toMatch(/\[error\]/);
    expect(prompt).toMatch(/no repair needed|preserve the current design/i);
  });

  it('does not allow allowReviewWarnings to suppress required visual evidence gates', async () => {
    runReviewPipeline.mockReset();
    runReviewPipeline.mockResolvedValue(cleanReviewOutput());

    const result = await designLoopTool({
      goal: 'Require screenshot-backed visual review for a release model.',
      allowReviewWarnings: ['assembly.visual.review-required'],
      attempts: [{ id: '01', title: 'No visual packet', code: 'return undefined;' }],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts[0]).toMatchObject({
      functional: true,
      qualityOk: false,
      ok: false,
    });
    expect(result.attempts[0].reviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.visual.review-required' }),
    ]));
  });
});
