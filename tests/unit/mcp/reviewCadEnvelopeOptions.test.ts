import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoseEnvelopeReviewOptions, PoseEnvelopeReviewResult } from '../../../src/lib/mates/poseEnvelope';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/mcp/activeSession';

const reviewPoseEnvelopeSpy = vi.fn<
  (arm: unknown, opts?: PoseEnvelopeReviewOptions) => Promise<PoseEnvelopeReviewResult>
>();

vi.mock('../../../src/lib/mates/poseEnvelope', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/mates/poseEnvelope')>(
    '../../../src/lib/mates/poseEnvelope',
  );
  return {
    ...actual,
    reviewPoseEnvelope: (arm: unknown, opts?: PoseEnvelopeReviewOptions) =>
      reviewPoseEnvelopeSpy(arm, opts),
  };
});

// Imported AFTER the mock so reviewCadTool's reviewPoseEnvelope reference is the spy.
import { reviewCadTool } from '../../../src/mcp/tools/reviewCad';

function emptyEnvelopeResult(): PoseEnvelopeReviewResult {
  return {
    samples: [],
    diagnostics: [],
    interferencePairs: [],
    connectorPoses: [],
    connectorWorkspace: [],
  };
}

const SIMPLE_ARM_CODE = `
  const arm = assembly('rig');
  arm.part('base', box(10, 10, 10))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.part('link', box(5, 5, 5))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
    pose: 0,
    limitsDeg: [-90, 90],
  });
  return arm.model();
`;

describe('review_cad envelope-option pass-through', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => {
    clearActiveMcpSession();
    reviewPoseEnvelopeSpy.mockReset();
    reviewPoseEnvelopeSpy.mockResolvedValue(emptyEnvelopeResult());
  });

  it('reviewCadTool forwards samplesPerMate to reviewPoseEnvelope', async () => {
    await reviewCadTool({
      code: SIMPLE_ARM_CODE,
      includeInterference: false,
      samplesPerMate: 4,
    });

    expect(reviewPoseEnvelopeSpy).toHaveBeenCalledTimes(1);
    const opts = reviewPoseEnvelopeSpy.mock.calls[0]?.[1];
    expect(opts?.samplesPerMate).toBe(4);
  });

  it('reviewCadTool forwards combinatorial to reviewPoseEnvelope', async () => {
    await reviewCadTool({
      code: SIMPLE_ARM_CODE,
      includeInterference: false,
      combinatorial: true,
    });

    expect(reviewPoseEnvelopeSpy).toHaveBeenCalledTimes(1);
    const opts = reviewPoseEnvelopeSpy.mock.calls[0]?.[1];
    expect(opts?.combinatorial).toBe(true);
  });
});
