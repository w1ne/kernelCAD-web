import { describe, expect, it } from 'vitest';
import {
  FUNCTION_FIRST_ROBOT_HAND_PRINCIPLES,
  ROBOT_HAND_GRASP_TASKS,
  ROBOT_HAND_ACCEPTANCE_GATES,
  summarizeRobotHandFunctionalBrief,
} from '../../../scripts/robotHandFunctionalRequirements';

describe('function-first robot hand requirements', () => {
  it('starts from grasp tasks instead of visual hand appearance', () => {
    expect(FUNCTION_FIRST_ROBOT_HAND_PRINCIPLES[0]).toMatch(/function before form/i);
    expect(ROBOT_HAND_GRASP_TASKS.map((task) => task.id)).toEqual([
      'pinch-thin-plate',
      'power-cylinder',
      'spherical-object',
      'box-grasp',
      'hook-handle',
      'wide-object',
    ]);
  });

  it('defines measurable acceptance gates for every grasp task', () => {
    for (const task of ROBOT_HAND_GRASP_TASKS) {
      expect(task.object).toBeTruthy();
      expect(task.contacts.length).toBeGreaterThanOrEqual(2);
      expect(task.requiredChecks).toEqual(expect.arrayContaining([
        'reachable-contact-points',
        'joint-limits-respected',
        'no-self-collision',
        'load-path-to-palm',
      ]));
    }

    expect(ROBOT_HAND_ACCEPTANCE_GATES).toEqual(expect.arrayContaining([
      'grasp-aperture-covers-target-object',
      'opposing-contact-normals-resist-escape',
      'pose-envelope-has-no-breaking-collisions',
      'all-loaded-parts-are-in-mate-graph',
      'actuation-path-has-anchored-transmission',
    ]));
  });

  it('summarizes the recommended first artifact as a three-finger functional hand', () => {
    const brief = summarizeRobotHandFunctionalBrief();

    expect(brief.firstArtifact).toBe('three-finger functional hand');
    expect(brief.deferred).toContain('five-finger visual styling');
    expect(brief.why).toMatch(/grasp tests/i);
  });
});
