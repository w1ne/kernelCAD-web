// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sketchOffset.ts
//
// Parallel (offset) curve of a closed planar sketch profile.
//
// The profile is the REGION bounded by the first loop minus the hole loops, so
// a positive distance grows the region: the outer boundary moves outward and
// every hole shrinks. A negative distance does the opposite. This is the
// convention of `BRepOffsetAPI_MakeOffset` on a face, and the one a clearance
// pocket (+) or an inset wall / gasket land (-) needs.
//
// Lines stay lines and arcs stay arcs: the OCCT offset edges are read back
// through `extractLoops`, the same exact line/arc reader `faceSketch` uses.
//
// An offset is not always one profile. The result is refused, with a reason
// the caller turns into a typed diagnostic, when
//   - the region collapses (inset by more than half its narrowest width),
//   - the region splits into several separate islands (a neck pinches off),
//   - the result pinches: it touches itself, so the topology changes within
//     `PINCH_PROBE_MM` of the requested distance,
//   - OCCT returns an open chain or throws.
// A multi-island result cannot be represented: a kernelCAD sketch is one outer
// loop plus holes, so a second island would be read as a hole and dropped.

import { getOC, cast, measureArea, type AnyShape } from 'replicad';
import type { Edge } from 'replicad';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { drawingFromCommands } from './sketchToDrawing';
import { cardinalFrame, extractLoops } from './sketchFromShape';

/** How an outward-moving convex corner is joined. */
export type SketchOffsetCorners = 'round' | 'sharp';

export type SketchOffsetFailure = 'collapsed' | 'split' | 'open' | 'kernel';

export type SketchOffsetResult =
  | {
      ok: true;
      /** `moveTo … close` groups, outer boundary first, then holes. */
      commands: SketchCommand[];
      loopCount: number;
      /** Area of the offset region (outer minus holes), mm². */
      areaMm2: number;
      /** Area of the source region, mm². */
      sourceAreaMm2: number;
    }
  | { ok: false; reason: SketchOffsetFailure; detail: string };

export interface FaceLike {
  wrapped: unknown;
  delete?: () => void;
}

/** Planar XY face of a closed command list (outer loop minus hole loops). */
export function faceOfCommands(commands: readonly SketchCommand[]): FaceLike {
  type Lifted = { face?: () => FaceLike; sketches?: Lifted[] };
  let sketch = drawingFromCommands(commands).sketchOnPlane('XY') as unknown as Lifted;
  // A profile with exactly one hole comes back as a one-element `Sketches`.
  if (typeof sketch.face !== 'function' && sketch.sketches?.length === 1) sketch = sketch.sketches[0];
  if (typeof sketch.face !== 'function') {
    throw new Error('profile is not a single closed region');
  }
  return sketch.face();
}

/** Region area of a closed command list, mm². */
export function sketchRegionArea(commands: readonly SketchCommand[]): number {
  const face = faceOfCommands(commands);
  try {
    return measureArea(face as never);
  } finally {
    face.delete?.();
  }
}

/**
 * Offset the region described by `commands` by `distance` mm. Every Param in
 * `commands` must already carry its resolved value in `.evaluated`.
 */
export function offsetSketchCommands(
  commands: readonly SketchCommand[],
  distance: number,
  corners: SketchOffsetCorners = 'round',
): SketchOffsetResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const face = faceOfCommands(commands);
  const sourceAreaMm2 = measureArea(face as never);
  const join = corners === 'sharp' ? oc.GeomAbs_JoinType.GeomAbs_Intersection : oc.GeomAbs_JoinType.GeomAbs_Arc;
  const builder = new oc.BRepOffsetAPI_MakeOffset_2(face.wrapped, join, false);
  try {
    let edges: Edge[];
    try {
      builder.Perform(distance, 0);
      if (!builder.IsDone()) return { ok: false, reason: 'kernel', detail: 'the offset builder did not finish' };
      edges = (cast(builder.Shape()) as AnyShape as unknown as { edges?: Edge[] }).edges ?? [];
    } catch (e) {
      return { ok: false, reason: 'kernel', detail: e instanceof Error ? e.message : String(e) };
    }
    if (edges.length === 0) {
      return { ok: false, reason: 'collapsed', detail: 'no offset curve remains' };
    }
    const extracted = extractLoops(edges, cardinalFrame('xy', 0));
    if (extracted.openChains.length > 0) {
      return { ok: false, reason: 'open', detail: `${extracted.openChains.length} offset chain(s) did not close` };
    }
    if (extracted.loops.length === 0) {
      return { ok: false, reason: 'collapsed', detail: 'no closed offset loop remains' };
    }
    if (extracted.areas[0] <= 1e-9) {
      return { ok: false, reason: 'collapsed', detail: 'the offset curve encloses no area' };
    }
    const result = extracted.loops.flat();
    // One outer loop plus holes encloses exactly `outer − Σ holes`. A second
    // island is not subtracted by the hole convention, so the region area of
    // the rebuilt profile exposes it.
    const expected = extracted.areas[0] - extracted.areas.slice(1).reduce((acc, a) => acc + a, 0);
    let areaMm2: number;
    try {
      areaMm2 = sketchRegionArea(result);
    } catch {
      return { ok: false, reason: 'split', detail: 'the offset loops touch or cross each other' };
    }
    if (Math.abs(areaMm2 - expected) > 1e-6 * Math.max(1, extracted.areas[0])) {
      return {
        ok: false,
        reason: 'split',
        detail: `the offset is ${extracted.loops.length} loops that are not one outer boundary with holes`,
      };
    }
    return { ok: true, commands: result, loopCount: extracted.loops.length, areaMm2, sourceAreaMm2 };
  } finally {
    builder.delete();
    face.delete?.();
  }
}

/** Half-width of the distance band probed for a topology change, mm. */
export const PINCH_PROBE_MM = 1e-5;

/**
 * `offsetSketchCommands`, plus a refusal of results that sit on a topology
 * change. When a neck is exactly `2·|distance|` wide the inset boundary touches
 * itself: OCCT still returns one closed loop, but it is two regions joined by
 * a zero-width bridge and extrudes to a non-manifold solid. Such a result has
 * a different loop count a hair to either side, so the offset is repeated at
 * `distance ± PINCH_PROBE_MM` and must agree with both.
 */
export function offsetSketchStable(
  commands: readonly SketchCommand[],
  distance: number,
  corners: SketchOffsetCorners = 'round',
): SketchOffsetResult {
  const result = offsetSketchCommands(commands, distance, corners);
  if (!result.ok) return result;
  const grows = result.areaMm2 > result.sourceAreaMm2;
  if (grows !== distance > 0) {
    return { ok: false, reason: 'kernel', detail: 'the offset region moved the wrong way' };
  }
  const probe = Math.min(PINCH_PROBE_MM, Math.abs(distance) / 2);
  for (const d of [distance - probe, distance + probe]) {
    const near = offsetSketchCommands(commands, d, corners);
    if (!near.ok || near.loopCount !== result.loopCount) {
      return {
        ok: false,
        reason: near.ok || near.reason !== 'collapsed' ? 'split' : 'collapsed',
        detail: `the profile pinches at this distance: at ${d} mm ${near.ok ? `it has ${near.loopCount} loop(s) instead of ${result.loopCount}` : near.detail}`,
      };
    }
  }
  return result;
}
