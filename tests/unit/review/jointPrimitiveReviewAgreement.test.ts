// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// KC-04 regression — `review_cad` must never contradict itself.
//
// The reported defect: a VALID joint-primitive assembly came back in ONE
// response with
//     fitness.functional: true
//     fitness.repairMode: 'none'
//     fitness.repairDirective: 'No repair needed. Preserve the current topology…'
// alongside
//     mechanism: 'broken'
//     mechanism.orphan-part — "Part 'arm' is not reachable from the mate graph"
// An agent trusting `fitness` ships a broken mechanism; an agent trusting
// `mechanism` abandons a sound one. Both cannot be right.
//
// Two independent guarantees are locked here:
//   (a) the mechanism-truth reachability walk sees joint-primitive edges, so
//       a sound joint-primitive assembly is not called an orphan; and
//   (b) `fitness` and `mechanism` AGREE — including on an assembly that is
//       genuinely broken, so (a) is not just "everything now passes".

import { describe, expect, it } from 'vitest';
import { runReviewPipeline } from '../../../src/agent/review/reviewPipeline';

/** A sound single-DOF hinge built from the joint-primitive convention. */
const SOUND_JOINT_PRIMITIVE_HINGE = `
const asm = assembly('hinge');
const b = asm.part('base', box(60, 40, 10));
const a = asm.part('arm', box(50, 10, 8));
asm.revolute('elbow', b, a, { axis: [0, -1, 0], origin: [0, 0, 10], limitsDeg: [0, 90] });
return asm.solvedModel({ elbow: 0 });
`;

/** The same hinge plus a part wired to nothing at all. */
const HINGE_WITH_TRUE_ORPHAN = `
const asm = assembly('hinge-plus-floater');
const b = asm.part('base', box(60, 40, 10));
const a = asm.part('arm', box(50, 10, 8));
asm.revolute('elbow', b, a, { axis: [0, -1, 0], origin: [0, 0, 10], limitsDeg: [0, 90] });
asm.part('floater', box(5, 5, 5).translate(0, 200, 0));
return asm.solvedModel({ elbow: 0 });
`;

/**
 * The invariant. `mechanism: 'broken'` and `fitness.functional: true` must
 * never co-occur, and the repair advice must move with the verdict.
 */
function expectSelfConsistent(out: Record<string, any>): void {
  if (out.mechanism === 'broken') {
    expect(out.fitness.functional).toBe(false);
    expect(out.fitness.repairMode).not.toBe('none');
    expect(out.fitness.repairDirective).not.toMatch(/No repair needed/);
    expect(out.fitness.blockingReasons.length).toBeGreaterThan(0);
    expect(out.ok).toBe(false);
  }
  if (out.fitness.functional === true) {
    expect(out.mechanism).not.toBe('broken');
    expect(out.fitness.repairMode).toBe('none');
  }
}

describe('review_cad — joint-primitive assemblies (KC-04)', () => {
  it('does not report a sound joint-primitive hinge as an orphan', async () => {
    const out = await runReviewPipeline({ code: SOUND_JOINT_PRIMITIVE_HINGE }) as any;

    const orphans = (out.mechanismFailures ?? [])
      .filter((f: { code: string }) => f.code === 'mechanism.orphan-part');
    expect(orphans).toEqual([]);
    expect(out.mechanism).toBe('real');
  }, 120000);

  it('reports fitness and mechanism in agreement on a sound joint-primitive hinge', async () => {
    const out = await runReviewPipeline({ code: SOUND_JOINT_PRIMITIVE_HINGE }) as any;

    expect(out.fitness.functional).toBe(true);
    expect(out.fitness.repairMode).toBe('none');
    expect(out.mechanism).toBe('real');
    expect(out.ok).toBe(true);
    expectSelfConsistent(out);
  }, 120000);

  it('reports fitness and mechanism in agreement when a joint-primitive assembly IS broken', async () => {
    // Guards against "the contradiction went away because nothing fails any
    // more": a genuinely unconnected part must still break the mechanism,
    // and `fitness` must now say so too instead of "No repair needed".
    const out = await runReviewPipeline({ code: HINGE_WITH_TRUE_ORPHAN }) as any;

    const orphans = (out.mechanismFailures ?? [])
      .filter((f: { code: string }) => f.code === 'mechanism.orphan-part');
    expect(orphans).toHaveLength(1);
    expect(orphans[0].message).toContain("'floater'");
    expect(out.mechanism).toBe('broken');

    expect(out.fitness.functional).toBe(false);
    expect(out.fitness.repairMode).toBe('topology-redesign');
    expect(out.fitness.blockingReasons.map((r: { code: string }) => r.code))
      .toContain('mechanism.orphan-part');
    expectSelfConsistent(out);
  }, 120000);
});
