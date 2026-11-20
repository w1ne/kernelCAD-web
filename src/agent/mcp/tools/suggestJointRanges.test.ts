// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Argument mapping and assembly selection for verify({ check: 'joint-range' }).
// The stop values are the analytic box gaps, so a swapped assembly or a
// dropped clearance is visible without reading the helper's own distance.

import { describe, expect, it } from 'vitest';
import { suggestJointRangesTool } from './suggestJointRanges';

const NEAR_WALL_X = 40;
const FAR_WALL_X = 55;
const RAIL_FACE_X = 10;
const CARRIAGE_LENGTH = 20;
/** Gap from the carriage +X face to the wall −X face at slide pose 0. */
function gapAtZero(wallX: number): number {
  return wallX - (RAIL_FACE_X + CARRIAGE_LENGTH);
}

function armBlock(binding: string, name: string, wallX: number): string {
  return `
const ${binding} = assembly('${name}');
const ${binding}Rail = ${binding}.part('rail', box(10, 30, 20));
const ${binding}Carriage = ${binding}.part('carriage', box(${CARRIAGE_LENGTH}, 16, 12));
${binding}.part('wall', box(10, 12, 20).translate(${wallX}, 0, 0));
${binding}Rail.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [10, 15, 10] }, axis: [1, 0, 0] });
${binding}Carriage.connector('slide', { type: 'axis', origin: { kind: 'vec3', value: [0, 8, 6] }, axis: [1, 0, 0] });
${binding}.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
  pose: 0.1,
  limitsMm: [-2, 30],
});
`;
}

const TWO_ARMS = `${armBlock('near', 'near-arm', NEAR_WALL_X)}
${armBlock('far', 'far-arm', FAR_WALL_X)}
return near.solvedModel({ slide: 0.1 });
`;

describe('suggestJointRangesTool', () => {
  it('maps clearance, search, step, resolution and joint onto the named assembly', async () => {
    const clearance = 1;
    const resolution = 0.05;
    const analytic = gapAtZero(FAR_WALL_X) - clearance;
    expect(analytic).toBe(24);

    const named = await suggestJointRangesTool({
      code: TWO_ARMS,
      assembly: 'far-arm',
      joint: 'slide',
      search: [-2, 30],
      clearance_mm: clearance,
      step: 2,
      resolution,
    });
    expect(named.ok, JSON.stringify(named)).toBe(true);
    if (!('joints' in named) || !('clearanceMm' in named)) {
      throw new Error('expected a suggestion result');
    }
    expect(named.clearanceMm).toBe(clearance);
    expect(named.joints).toHaveLength(1);
    expect(named.joints[0]).toMatchObject({
      joint: 'slide',
      search: [-2, 30],
      step: 2,
    });
    const upper = named.joints[0]!.upper;
    expect(upper.status).toBe('stop');
    expect(upper.pair).toEqual({ a: 'carriage', b: 'wall' });
    expect(upper.value).toBeLessThanOrEqual(analytic + 1e-6);
    expect(upper.value).toBeGreaterThanOrEqual(analytic - resolution - 1e-6);
    // The near wall's stop at this clearance is 9 mm. A swapped assembly cannot land here.
    expect(upper.value).toBeGreaterThan(gapAtZero(NEAR_WALL_X) - clearance + 1);

    const first = await suggestJointRangesTool({
      code: TWO_ARMS,
      joint: 'slide',
      resolution,
    });
    expect(first.ok, JSON.stringify(first)).toBe(true);
    if (!('joints' in first) || !('clearanceMm' in first)) {
      throw new Error('expected a suggestion result');
    }
    expect(first.clearanceMm).toBe(0.3);
    const nearStop = gapAtZero(NEAR_WALL_X) - 0.3;
    expect(first.joints[0]?.upper.value).toBeLessThanOrEqual(nearStop + 1e-6);
    expect(first.joints[0]?.upper.value).toBeGreaterThanOrEqual(nearStop - resolution - 1e-6);
    expect(first.joints[0]?.upper.value).toBeLessThan(20);
  }, 60_000);

  it('selects neither assembly when the name is missing, and rejects a script with none', async () => {
    const missing = await suggestJointRangesTool({ code: TWO_ARMS, assembly: 'missing-arm' });
    expect(missing.ok).toBe(false);
    expect(missing).toMatchObject({
      joints: [],
      error: "joint-range: assembly 'missing-arm' not found.",
    });

    const none = await suggestJointRangesTool({ code: 'return box(5, 5, 5);' });
    expect(none.ok).toBe(false);
    expect(none).toMatchObject({
      joints: [],
      error: 'joint-range: no assembly captured by the script.',
    });
  }, 60_000);

  it('forwards a bad search and an unknown joint as closed failures', async () => {
    const badSearch = await suggestJointRangesTool({
      code: TWO_ARMS,
      assembly: 'near-arm',
      search: [5, 1],
    });
    expect(badSearch.ok).toBe(false);
    expect(badSearch).toMatchObject({ error: expect.stringMatching(/search/) });

    const unknownJoint = await suggestJointRangesTool({
      code: TWO_ARMS,
      assembly: 'far-arm',
      joint: 'elbow',
    });
    expect(unknownJoint.ok).toBe(false);
    expect(unknownJoint).toMatchObject({ error: expect.stringMatching(/unknown joint 'elbow'/) });

    const failed = await suggestJointRangesTool({ code: 'throw new Error("boom");' });
    expect(failed.ok).toBe(false);
    expect(failed.joints).toEqual([]);
    expect(failed.error).toEqual(expect.any(String));
  }, 60_000);
});
