// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `lib.fixture.clampSet` — plan a complete T-slot clamp set around a workpiece
// height: T-slot nut, clamping stud, strap clamp, step block and flange nut,
// placed in one canonical frame. The planner is pure; placement goes through
// the same `placePart` path as every other fixture call.
//
// Frame: origin = the stud axis at the table surface (z = 0); the workpiece
// side is -X and the step block sits at +X with its treads ascending away.
// The plan reproduces the dimension chain `examples/fixture/table-clamp-set`
// documents by hand: the nut 0.6 mm below the surface, the stud from the
// channel ceiling, the clamp level with the workpiece, the tread under the
// tail, and the shortest stocked stud that clears clamp + nut.

import type { Shape } from '../capture/proxy';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { fixtureVariants, resolvePart, type ResolvedPart } from './familyTable';
import { placePart, type PlaceCtx } from './placePart';
import type { FixtureThread } from './fixtureParts';

/** Nut top sits this far below the table surface when pulled up. */
const NUT_CLEARANCE_MM = 0.6;
/** How far the stud should stand above the flange nut. */
const STUD_PROTRUSION_MM = 4;
/** Clearance between the clamp tail and the next (higher) tread riser. */
const TAIL_RISER_CLEARANCE_MM = 1;

export type ClampSetRole = 't-slot-nut' | 'stud' | 'strap-clamp' | 'step-block' | 'flange-nut';

export interface ClampSetMemberPlan {
  role: ClampSetRole;
  part: ResolvedPart;
  at: [number, number, number];
}

export interface ClampSetPlan {
  thread: string;
  workpieceHeightMm: number;
  /** The stocked tread the clamp tail rests on, mm. */
  treadMm: number;
  studLengthMm: number;
  clampTopMm: number;
  members: ClampSetMemberPlan[];
}

export interface ClampSetRequest {
  thread: FixtureThread;
  /** Workpiece height above the table. Must equal a tread of that thread's
   *  step block (10/20/30/40 M8, 12/24/36/48 M10, 15/30/45/60 M12). */
  workpieceHeightMm: number;
}

const SET_EXAMPLE = "lib.fixture.clampSet({ thread: 'M10', workpieceHeightMm: 36 })";

function dimOf(part: ResolvedPart, name: string): number {
  return part.dims?.[name] ?? 0;
}

/** The stocked tread this workpiece height lands on, or an invalid-args error
 *  naming the stocked heights. */
function stockedTread(thread: string, heightMm: number, rise: number, steps: number): number {
  const treads = Array.from({ length: steps }, (_, index) => (index + 1) * rise);
  const tread = treads.find((candidate) => Math.abs(candidate - heightMm) < 1e-6);
  if (tread === undefined) {
    invalidArgs({
      api: 'lib.fixture.clampSet({ thread, workpieceHeightMm })',
      path: 'workpieceHeightMm',
      got: heightMm,
      requires: `a stocked ${thread} step-block tread: ${treads.join(', ')}`,
      unit: 'mm',
      example: SET_EXAMPLE,
    });
  }
  return tread;
}

/** The shortest stocked stud that spans from the channel ceiling to past the
 *  flange nut, or an invalid-args error naming the longest stock. */
function stockedStudLength(thread: FixtureThread, needed: number): number {
  const stocked = fixtureVariants('clamping-stud')
    .filter((variant) => variant.thread === thread)
    .map((variant) => variant.lengthMm ?? 0)
    .sort((a, b) => a - b);
  const length = stocked.find((candidate) => candidate + 1e-9 >= needed);
  if (length === undefined) {
    invalidArgs({
      api: 'lib.fixture.clampSet({ thread, workpieceHeightMm })',
      path: 'workpieceHeightMm',
      got: needed,
      requires: `a workpiece the longest ${thread} stud (${stocked[stocked.length - 1] ?? 0} mm) can clamp`,
      unit: 'mm',
      example: SET_EXAMPLE,
    });
  }
  return length;
}

/** Pure plan for one clamp set. Throws `feature.invalid-args` when the height
 *  is not a stocked tread or the stud would run past the longest stock. */
export function planClampSet(request: ClampSetRequest): ClampSetPlan {
  const { thread, workpieceHeightMm } = request;
  const tNut = resolvePart({ family: 't-slot-nut', thread });
  const clamp = resolvePart({ family: 'strap-clamp', thread });
  const block = resolvePart({ family: 'step-block', thread });
  const flange = resolvePart({ family: 'flange-nut', thread });

  const rise = dimOf(block, 'riseMm');
  const steps = Math.max(1, Math.round(dimOf(block, 'steps')));
  const tread = stockedTread(thread, workpieceHeightMm, rise, steps);

  const clampT = dimOf(clamp, 'thicknessMm');
  const nutM = dimOf(flange, 'heightMm');
  const studBottom = -(NUT_CLEARANCE_MM + dimOf(tNut, 'neckHeightMm'));
  const needed = workpieceHeightMm + clampT + nutM + STUD_PROTRUSION_MM - studBottom;
  const studLength = stockedStudLength(thread, needed);

  const run = dimOf(block, 'runMm');
  const blockHalf = dimOf(block, 'lengthMm') / 2;
  const tailReach = dimOf(clamp, 'lengthMm') - dimOf(clamp, 'slotCenterMm');
  // Tread k spans [blockX - half + (k-1)*run, blockX - half + k*run]; its top
  // is k*rise. Put the tread's outer edge just past the clamp tail.
  const blockX = tailReach + TAIL_RISER_CLEARANCE_MM - (tread / rise) * run + blockHalf;

  return {
    thread,
    workpieceHeightMm,
    treadMm: tread,
    studLengthMm: studLength,
    clampTopMm: workpieceHeightMm + clampT,
    members: [
      { role: 't-slot-nut', part: tNut, at: [0, 0, -NUT_CLEARANCE_MM] },
      {
        role: 'stud',
        part: resolvePart({ family: 'clamping-stud', thread, lengthMm: studLength }),
        at: [0, 0, studBottom],
      },
      { role: 'strap-clamp', part: clamp, at: [0, 0, workpieceHeightMm] },
      { role: 'step-block', part: block, at: [blockX, 0, 0] },
      { role: 'flange-nut', part: flange, at: [0, 0, workpieceHeightMm + clampT] },
    ],
  };
}

export interface PlacedClampSet {
  studLengthMm: number;
  treadMm: number;
  clampTopMm: number;
  members: Array<{ role: ClampSetRole; shape: Shape }>;
}

/** Plan and place one clamp set; each member is translated to its frame. */
export async function placeClampSet(
  ctx: PlaceCtx,
  request: ClampSetRequest,
): Promise<PlacedClampSet> {
  const plan = planClampSet(request);
  const members: PlacedClampSet['members'] = [];
  for (const member of plan.members) {
    const partRequest: { family: string; thread: string; lengthMm?: number } = {
      family: member.part.family,
      thread: member.part.thread,
      ...(member.part.lengthMm > 0 ? { lengthMm: member.part.lengthMm } : {}),
    };
    const shape = await placePart(ctx, partRequest);
    const [x, y, z] = member.at;
    members.push({ role: member.role, shape: shape.translate(x, y, z) });
  }
  return {
    studLengthMm: plan.studLengthMm,
    treadMm: plan.treadMm,
    clampTopMm: plan.clampTopMm,
    members,
  };
}
