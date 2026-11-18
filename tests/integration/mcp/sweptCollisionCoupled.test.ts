// check_swept_collision on a coupled spur pair. The default walk used to turn
// the driven gear at its own limits with the pinion held at rest, which put a
// gear tooth into a pinion tooth at every non-zero output angle.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkSweptCollisionTool } from '../../../src/agent/mcp/tools/checkSweptCollision';

/** 12:36 module-1 pair, 24 mm centres, meshed at rest. `ratio` is the
 *  coupling; only -12 / 36 keeps the teeth meshed as the pinion turns. */
function gearPair(ratio = '-12 / 36'): string {
  return `
const pinion = spurGear({ module: 1, teeth: 12, faceWidth: 8, bore: 5, backlash: 0.15 }).translate(0, 0, 5.5);
const gear = spurGear({ module: 1, teeth: 36, faceWidth: 8, bore: 4, backlash: 0.15 })
  .rotateZ(180 / 36).translate(24, 0, 5.5);
const axis = (x) => ({ type: 'axis', origin: { kind: 'vec3', value: [x, 0, 5] }, axis: [0, 0, 1] });
const stage = assembly('coupled-sweep');
stage.part('plate', box(60, 40, 5).translate(-12, -20, 0)).connector('in', axis(0)).connector('out', axis(24));
stage.part('pinion', pinion).connector('axis', axis(0));
stage.part('gear', gear).connector('axis', axis(24));
stage.mate('input', 'plate.in', 'pinion.axis', 'revolute', { limitsDeg: [-12, 12] });
stage.mate('output', 'plate.out', 'gear.axis', 'revolute', { limitsDeg: [-4, 4] });
stage.coupleMates('output', { source: 'input', ratio: ${ratio} });
return stage.solvedModel({});
`;
}

type Swept = { ok: boolean; posesSampled: number; collidingPoses: ReadonlyArray<{ pose: Record<string, number> }> };

describe('check_swept_collision with coupled mates', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('walks the driven gear through its pinion, not at its own limits', async () => {
    const result = (await checkSweptCollisionTool({ code: gearPair() })) as Swept;
    expect(result.posesSampled).toBe(25);
    expect(result.collidingPoses).toEqual([]);
    expect(result.ok).toBe(true);
  }, 180_000);

  it('still reports a real tooth clash on the source walk', async () => {
    // A wrong ratio meshes at rest but walks the gear out of phase.
    const result = (await checkSweptCollisionTool({ code: gearPair('-1 / 2') })) as Swept;
    expect(result.collidingPoses.length).toBeGreaterThan(0);
    expect(result.collidingPoses.every((p) => Object.keys(p.pose).join() === 'input')).toBe(true);
    expect(result.ok).toBe(false);
  }, 180_000);
});
