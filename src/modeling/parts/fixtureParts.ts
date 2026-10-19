// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `lib.fixture.*` — typed shortcuts for the machining-fixture families in the
// part table. Each call resolves the same catalog id `lib.part` resolves and
// goes through the same placement path, so the browser builds the envelope in
// memory and a host with the catalog on disk loads the STEP instead.

import type { Shape } from '../capture/proxy';
import { placePart, type PlaceCtx } from './placePart';
import { placeClampSet, type PlacedClampSet } from './clampSet';

export type FixtureThread = 'M8' | 'M10' | 'M12';

export interface FixtureParts {
  /** T-slot nut for a machine table (DIN 508 form), M8/M10/M12. */
  tSlotNut(args: { thread: FixtureThread }): Promise<Shape>;
  /** Clamping stud (DIN 6379 form); stocked lengths 63–160 mm by size. */
  clampStud(args: { thread: FixtureThread; lengthMm: number }): Promise<Shape>;
  /** Flange nut (DIN 6330 form) for the clamp top. */
  flangeNut(args: { thread: FixtureThread }): Promise<Shape>;
  /** Strap clamp: slot center at its origin, nose toward -X. */
  strapClamp(args: { thread: FixtureThread }): Promise<Shape>;
  /** Step block: treads rise along +X, `step-1..4` connectors on the treads. */
  stepBlock(args: { thread: FixtureThread }): Promise<Shape>;
  /** A complete clamp set around a workpiece height: T-slot nut, stud, strap
   *  clamp, step block and flange nut, placed in one frame (stud axis at the
   *  origin, table surface at z = 0, workpiece toward -X, block at +X). */
  clampSet(args: { thread: FixtureThread; workpieceHeightMm: number }): Promise<PlacedClampSet>;
}

export function createFixtureParts(ctx: PlaceCtx): FixtureParts {
  const place = (family: string, thread: FixtureThread, lengthMm?: number): Promise<Shape> =>
    placePart(ctx, { family, thread, ...(lengthMm !== undefined ? { lengthMm } : {}) });
  return {
    tSlotNut: ({ thread }) => place('t-slot-nut', thread),
    clampStud: ({ thread, lengthMm }) => place('clamping-stud', thread, lengthMm),
    flangeNut: ({ thread }) => place('flange-nut', thread),
    strapClamp: ({ thread }) => place('strap-clamp', thread),
    stepBlock: ({ thread }) => place('step-block', thread),
    clampSet: (args) => placeClampSet(ctx, args),
  };
}
