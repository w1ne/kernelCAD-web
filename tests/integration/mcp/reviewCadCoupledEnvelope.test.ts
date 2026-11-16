// review_cad pose envelope on a coupled spur pair. The driven gear's own
// limit is not a reachable pose: sampling it with the pinion held at rest put
// a gear tooth into a pinion tooth and failed the review with a clash that
// mechanism truth (which drives the source) did not see.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

/** 12:36 module-1 pair, 24 mm centres. `gearPhase` is the half-tooth turn
 *  that puts a gear space on the line of centres. */
function gearPair(outputLimits: string, gearPhase = '180 / 36', inputLimits = '[-100, 100]', offset = 0): string {
  return `
const pinion = spurGear({ module: 1, teeth: 12, faceWidth: 8, bore: 5, backlash: 0.15 }).translate(0, 0, 5.5);
const gear = spurGear({ module: 1, teeth: 36, faceWidth: 8, bore: 4, backlash: 0.15 })
  .rotateZ(${gearPhase}).translate(24, 0, 5.5);
const axis = (x) => ({ type: 'axis', origin: { kind: 'vec3', value: [x, 0, 5] }, axis: [0, 0, 1] });
const stage = assembly('coupled-envelope');
stage.part('plate', box(60, 40, 5).translate(-12, -20, 0)).connector('in', axis(0)).connector('out', axis(24));
stage.part('pinion', pinion).connector('axis', axis(0));
stage.part('gear', gear).connector('axis', axis(24));
stage.mate('input', 'plate.in', 'pinion.axis', 'revolute', { limitsDeg: ${inputLimits} });
stage.mate('output', 'plate.out', 'gear.axis', 'revolute', { limitsDeg: ${outputLimits} });
stage.coupleMates('output', { source: 'input', ratio: -12 / 36, offset: ${offset} });
stage.transmission('pinion-to-gear', {
  kind: 'gear-pair', sourceMate: 'input', drivenMates: ['output'],
  input: 'pinion', output: 'gear', path: ['pinion', 'gear'], ratio: -12 / 36,
});
return stage.solvedModel({});
`;
}

describe('review_cad pose envelope with coupled mates', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('samples the driven gear through its pinion, not at its own limits', async () => {
    // ±35 degrees is not a whole number of 10-degree gear teeth, so the
    // driven limit sampled alone would be tooth on tooth.
    const review = await reviewCadTool({ code: gearPair('[-35, 35]'), includeInterference: true, includePoseEnvelope: true });
    const envelope = review.poseEnvelope!;
    expect(envelope.samples.map((s) => [s.name, s.poses])).toEqual([
      ['current', {}],
      ['input:min', { input: -100, output: -100 * (-12 / 36) }],
      ['input:max', { input: 100, output: 100 * (-12 / 36) }],
    ]);
    expect(envelope.interferencePairs).toEqual([]);
    expect(review.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(review.ok).toBe(true);
  }, 180_000);

  it('still reports a real tooth clash at the source samples', async () => {
    const review = await reviewCadTool({ code: gearPair('[-35, 35]', '0'), includeInterference: true, includePoseEnvelope: true });
    const clashes = review.poseEnvelope!.interferencePairs.map((p) => [p.sampleName, p.a, p.b]);
    expect(clashes).toContainEqual(['input:min', 'pinion', 'gear']);
    expect(clashes).toContainEqual(['input:max', 'pinion', 'gear']);
    expect(review.ok).toBe(false);
  }, 180_000);

  it('checks the driven gear limits at its coupling offset at rest', async () => {
    // A 30-degree offset is three gear teeth, so the mesh is unchanged. At
    // rest the gear sits at 30 degrees, inside [10, 50]; its uncoupled 0 is not.
    const review = await reviewCadTool({
      code: gearPair('[10, 50]', '180 / 36', '[-60, 60]', 30),
      includeInterference: true,
      includePoseEnvelope: true,
    });
    expect(review.diagnostics.filter((d) => d.code === 'assembly.pose.out-of-limits')).toEqual([]);
    expect(review.poseEnvelope!.interferencePairs).toEqual([]);
    expect(review.ok).toBe(true);
  }, 180_000);
});
