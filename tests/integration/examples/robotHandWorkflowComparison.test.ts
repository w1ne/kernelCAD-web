import { describe, expect, it } from 'vitest';
import {
  compareRobotHandWorkflows,
  ROBOT_HAND_WORKFLOW_WEIGHTS,
} from '../../../scripts/robotHandWorkflowCompare';

describe('robot hand workflow comparison', () => {
  it('scores all five workflow options against the same robot hand target', () => {
    const result = compareRobotHandWorkflows();

    expect(result.weights).toEqual(ROBOT_HAND_WORKFLOW_WEIGHTS);
    expect(result.candidates.map((candidate) => candidate.id).sort()).toEqual([
      'mechanism-templates',
      'reference-conditioned',
      'mesh-feature-fitting',
      'master-skeleton',
      'validation-loop',
    ].sort());
    expect(result.candidates.every((candidate) => candidate.weightedScore >= 0 && candidate.weightedScore <= 100)).toBe(true);
  });

  it('does not treat validation as a standalone generator', () => {
    const result = compareRobotHandWorkflows();
    const validation = result.candidates.find((candidate) => candidate.id === 'validation-loop');

    expect(validation?.role).toBe('validator');
    expect(validation?.builds).toContain('acceptance gates');
    expect(validation?.caveat).toMatch(/not a generator/i);
  });

  it('recommends the hybrid path that preserves reference fit and physical validation', () => {
    const result = compareRobotHandWorkflows();

    expect(result.bestIndividual.id).toBe('reference-conditioned');
    expect(result.recommendedCombination.ids).toEqual([
      'reference-conditioned',
      'master-skeleton',
      'validation-loop',
    ]);
    expect(result.recommendedCombination.reason).toMatch(/visible fit/i);
    expect(result.recommendedCombination.reason).toMatch(/stable parametrics/i);
    expect(result.recommendedCombination.reason).toMatch(/physical acceptance/i);
  });
});
