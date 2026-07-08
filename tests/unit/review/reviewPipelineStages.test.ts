import { describe, expect, it } from 'vitest';
import { REVIEW_PIPELINE_STAGES } from '../../../src/agent/review/reviewPipeline';

describe('review pipeline stage structure', () => {
  it('keeps the deterministic review stages explicit and ordered', () => {
    expect(REVIEW_PIPELINE_STAGES).toEqual([
      'evaluate-source',
      'select-assembly',
      'default-pose-geometry',
      'mechanical-review',
      'pose-envelope',
      'mechanism-truth',
      'fitness-and-repair',
    ]);
  });
});
