// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/holeExitDepth.ts
//
// `depth: 'through'` measured along the drill axis: the length of the bore
// axis inside material, from the hole's own entry point, before it first
// leaves the body. Unlike a back-face search keyed on the entry-face centroid,
// this stays correct for off-centre holes once a fillet split or shrank the
// back face.

import * as replicad from 'replicad';
import type { OcctBackend } from './occtBackend';
import type { Vec3 } from '../../../shared/intent/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Oc = any;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Parameter of `q` along the ray (origin, unit axis). */
const along = (q: Vec3, origin: Vec3, axis: Vec3): number => dot(sub(q, origin), axis);

function edgeInterval(oc: Oc, edge: unknown, origin: Vec3, axis: Vec3): [number, number] {
  const ts: number[] = [];
  const ex = new oc.TopExp_Explorer_2(edge, oc.TopAbs_ShapeEnum.TopAbs_VERTEX, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; ex.More(); ex.Next()) {
    const pnt = oc.BRep_Tool.Pnt(oc.TopoDS.Vertex_1(ex.Current()));
    ts.push(along([pnt.X(), pnt.Y(), pnt.Z()], origin, axis));
    pnt.delete();
  }
  ex.delete();
  return [Math.min(...ts), Math.max(...ts)];
}

/**
 * Depth from `origin` along `axis` to where the axis first leaves material,
 * or undefined when the axis does not run through the body there. The bore
 * axis is intersected with the solid (Common of solid and a line edge).
 */
export function firstExitDepth(target: OcctBackend, origin: Vec3, axis: Vec3): number | undefined {
  const oc = replicad.getOC() as Oc;
  const bb = target.boundingBox();
  const reach = 2 * Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) + 1;
  const line = replicad.makeLine(add(origin, scale(axis, -0.05)), add(origin, scale(axis, reach)));
  const progress = new oc.Message_ProgressRange_1();
  const common = new oc.BRepAlgoAPI_Common_3((target.getReplicadShape() as unknown as { wrapped: unknown }).wrapped, line.wrapped, progress);
  try {
    common.Build(progress);
    if (common.HasErrors()) return undefined;
    const intervals: [number, number][] = [];
    const ex = new oc.TopExp_Explorer_2(common.Shape(), oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    for (; ex.More(); ex.Next()) intervals.push(edgeInterval(oc, ex.Current(), origin, axis));
    ex.delete();
    return exitFromIntervals(intervals);
  } finally {
    common.delete();
    progress.delete();
    line.delete();
  }
}

/** Merge touching inside-material intervals from the entry and return where they end. */
export function exitFromIntervals(intervals: readonly [number, number][]): number | undefined {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let end: number | undefined;
  for (const [a, b] of sorted) {
    if (end === undefined) {
      if (a > 0.1) return undefined;
      end = b;
    } else if (a <= end + 1e-6) {
      end = Math.max(end, b);
    } else {
      break;
    }
  }
  return end !== undefined && end > 1e-6 ? end : undefined;
}
