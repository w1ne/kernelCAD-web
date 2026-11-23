// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sketchBoolean.ts
//
// 2D boolean of closed planar sketch profiles: union, subtract, intersect.
//
// Each profile is the REGION bounded by its first loop minus its hole loops.
// The regions are built as planar faces, combined with the OCCT boolean, and
// merged with `ShapeUpgrade_UnifySameDomain` so that a boundary shared by two
// operands disappears and collinear or co-circular pieces become one segment.
// The boundary is read back through `extractLoops`, the exact line/arc reader
// `faceSketch` and `Sketch.offset` use, so lines stay lines and arcs stay arcs.
//
// A boolean is not always one profile. The result is refused, with a reason
// the caller turns into a typed diagnostic, when
//   - nothing is left (a subtract that removes everything, an intersect of
//     profiles that do not overlap),
//   - the result is several separate regions (a union of profiles that do not
//     overlap, a subtract that cuts the profile in two),
//   - the result touches itself at a point: it extrudes to a non-manifold
//     solid,
//   - OCCT returns an open chain or throws.
// A multi-region result cannot be represented: a kernelCAD sketch is one outer
// loop plus holes, so a second region would be read as a hole and dropped.

import { getOC, cast, measureArea, type AnyShape } from 'replicad';
import type { Edge } from 'replicad';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { cardinalFrame, extractLoops, type ProjectedSegment } from './sketchFromShape';
import { faceOfCommands, sketchRegionArea, type FaceLike } from './sketchOffset';

export type SketchBooleanOp = 'union' | 'subtract' | 'intersect';

export type SketchBooleanFailure = 'empty' | 'split' | 'open' | 'kernel';

export type SketchBooleanResult =
  | {
      ok: true;
      /** `moveTo … close` groups, outer boundary first, then holes. */
      commands: SketchCommand[];
      loopCount: number;
      /** Area of the result region (outer minus holes), mm². */
      areaMm2: number;
      /** Region areas of the base profile and of each tool profile, mm². */
      operandAreasMm2: number[];
    }
  | { ok: false; reason: SketchBooleanFailure; detail: string };

interface Deletable {
  delete?: () => void;
}

/** Vertices closer than this are one point when counting boundary joints, mm. */
const JOINT_TOLERANCE_MM = 1e-4;

/**
 * A point where more than two boundary segment ends meet, or `null`. On a
 * profile of simple closed loops every joint has exactly two segment ends.
 */
function selfTouchPoint(segments: readonly ProjectedSegment[]): [number, number] | null {
  const ends = new Map<string, { n: number; at: [number, number] }>();
  const key = (x: number, y: number) =>
    `${Math.round(x / JOINT_TOLERANCE_MM)},${Math.round(y / JOINT_TOLERANCE_MM)}`;
  for (const s of segments) {
    for (const at of [[s.x0, s.y0], [s.x1, s.y1]] as Array<[number, number]>) {
      const k = key(at[0], at[1]);
      const entry = ends.get(k);
      if (entry) entry.n += 1;
      else ends.set(k, { n: 1, at });
    }
  }
  for (const { n, at } of ends.values()) if (n > 2) return at;
  return null;
}

type Failure = Extract<SketchBooleanResult, { ok: false }>;
type Own = <T extends Deletable>(value: T) => T;

/**
 * The operand faces, every one turned to +Z. A profile drawn clockwise builds
 * a face whose normal is −Z, and the boolean treats coplanar faces of opposite
 * sense as different regions.
 */
function upwardRegions(faces: readonly FaceLike[], own: Own): unknown[] {
  return faces.map((f) => {
    const normal = (f as unknown as { normalAt: () => { z: number; delete?: () => void } }).normalAt();
    const down = normal.z < 0;
    normal.delete?.();
    return down ? own((f.wrapped as { Reversed: () => Deletable }).Reversed()) : f.wrapped;
  });
}

/** Run the boolean and merge same-domain pieces; the raw OCCT result shape. */
function combineRegions(op: SketchBooleanOp, regions: readonly unknown[], own: Own): unknown | Failure {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const builderName =
    op === 'union' ? 'BRepAlgoAPI_Fuse_1' : op === 'subtract' ? 'BRepAlgoAPI_Cut_1' : 'BRepAlgoAPI_Common_1';
  let current = regions[0];
  try {
    // `intersect` with several tools is a chain of pairwise commons: one OCCT
    // common with a tool list keeps what the base shares with ANY tool.
    const steps = op === 'intersect' ? regions.slice(1).map((r) => [r]) : [regions.slice(1)];
    for (const step of steps) {
      const builder = own(new oc[builderName]());
      const args = own(new oc.TopTools_ListOfShape_1());
      const toolList = own(new oc.TopTools_ListOfShape_1());
      const progress = own(new oc.Message_ProgressRange_1());
      args.Append_1(current);
      for (const r of step) toolList.Append_1(r);
      builder.SetArguments(args);
      builder.SetTools(toolList);
      builder.Build(progress);
      if (!builder.IsDone() || builder.HasErrors()) {
        return { ok: false, reason: 'kernel', detail: `the ${op} did not complete` };
      }
      current = builder.Shape();
    }
    const unify = own(new oc.ShapeUpgrade_UnifySameDomain_2(current, true, true, false));
    unify.AllowInternalEdges(false);
    unify.Build();
    return unify.Shape();
  } catch (e) {
    return { ok: false, reason: 'kernel', detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Read the one region of `shape` back as exact `moveTo … close` loops. */
function readRegion(shape: unknown): Failure | { commands: SketchCommand[]; loopCount: number; areaMm2: number } {
  const merged = cast(shape as never) as AnyShape as unknown as { faces?: Deletable[]; edges?: Edge[] };
  const regions = merged.faces ?? [];
  if (regions.length === 0) return { ok: false, reason: 'empty', detail: 'no region remains' };
  if (regions.length > 1) {
    return { ok: false, reason: 'split', detail: `the result is ${regions.length} separate regions` };
  }
  const expected = measureArea(regions[0] as never);
  if (expected <= 1e-9) return { ok: false, reason: 'empty', detail: 'the result encloses no area' };
  const extracted = extractLoops(merged.edges ?? [], cardinalFrame('xy', 0));
  if (extracted.openChains.length > 0) {
    return { ok: false, reason: 'open', detail: `${extracted.openChains.length} boundary chain(s) did not close` };
  }
  if (extracted.loops.length === 0) return { ok: false, reason: 'empty', detail: 'no closed boundary loop remains' };
  const touch = selfTouchPoint(extracted.segments);
  if (touch !== null) {
    return {
      ok: false,
      reason: 'split',
      detail: `the result touches itself at (${Number(touch[0].toFixed(4))}, ${Number(touch[1].toFixed(4))})`,
    };
  }
  const commands = extracted.loops.flat();
  let areaMm2: number;
  try {
    areaMm2 = sketchRegionArea(commands);
  } catch {
    return { ok: false, reason: 'split', detail: 'the result loops touch or cross each other' };
  }
  if (Math.abs(areaMm2 - expected) > 1e-6 * Math.max(1, expected)) {
    return {
      ok: false,
      reason: 'kernel',
      detail: `the boundary read back encloses ${areaMm2.toFixed(6)} mm², the kernel region is ${expected.toFixed(6)} mm²`,
    };
  }
  return { commands, loopCount: extracted.loops.length, areaMm2 };
}

const isFailure = (value: unknown): value is Failure =>
  typeof value === 'object' && value !== null && (value as { ok?: unknown }).ok === false;

/**
 * Combine the region of `base` with the regions of `tools`. `union` adds every
 * tool, `subtract` removes every tool, `intersect` keeps what `base` shares
 * with every tool. Every Param in the commands must already carry its resolved
 * value in `.evaluated`.
 */
export function booleanSketchCommands(
  op: SketchBooleanOp,
  base: readonly SketchCommand[],
  tools: ReadonlyArray<readonly SketchCommand[]>,
): SketchBooleanResult {
  const owned: Deletable[] = [];
  const own: Own = (value) => {
    owned.push(value);
    return value;
  };
  try {
    const faces = [base, ...tools].map((commands) => own(faceOfCommands(commands)));
    const operandAreasMm2 = faces.map((f) => measureArea(f as never));
    const combined = combineRegions(op, upwardRegions(faces, own), own);
    if (isFailure(combined)) return combined;
    const region = readRegion(combined);
    if (isFailure(region)) return region;
    return { ok: true, ...region, operandAreasMm2 };
  } finally {
    for (const o of owned) {
      try {
        o.delete?.();
      } catch {
        // already released
      }
    }
  }
}
