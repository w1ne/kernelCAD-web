import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';

describe('mechanism truth and solvedModel ignore pairs', () => {
  it('reports an ignored pair that overlaps at a prismatic joint limit', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('ignored-limit-collision');

    arm.part('base-frame', kcad.box(20, 10, 10))
      .connector('rail', {
        type: 'axis',
        origin: { kind: 'vec3', value: [20, 5, 5] },
        axis: [-1, 0, 0],
      });
    arm.part('platform', kcad.box(80, 10, 10, false))
      .connector('slide', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 5, 5] },
        axis: [-1, 0, 0],
      });
    arm.mate('platform-lift', 'base-frame.rail', 'platform.slide', 'prismatic', {
      limitsMm: [80, 150],
    });

    await arm.solvedModel({ 'platform-lift': 80 }, {
      ignore: [['base-frame', 'platform']],
    });

    const result = await checkMechanismTruth(arm);
    const collision = result.failures.find((failure) => failure.code === 'mechanism.interpenetration');
    expect(result.mechanism).toBe('broken');
    expect(collision?.message).toMatch(/'base-frame'.*'platform'.*'platform-lift:80'/);
    expect(collision?.hint).toMatch(/remove.*ignore|correct.*geometry/i);
    expect(result.coverage?.ignoredPairs).toEqual([['base-frame', 'platform']]);

    const swept = await checkSweptCollision(arm, {
      joint: 'platform-lift',
      range: [80, 150, 5],
    });
    expect(swept.ok).toBe(false);
    expect(swept.collidingPoses[0]?.pose['platform-lift']).toBe(80);
    expect(swept.collidingPoses[0]?.contacts).toContainEqual(
      expect.objectContaining({ partA: 'base-frame', partB: 'platform' }),
    );
  }, 60_000);
});
