// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { TubeJoint } from '../../../shared/tube/tubeBranch';
import { scale, sub, type TubePath, type V3 } from '../../../shared/tube/tubePath';

/** Sweep one disc of radius `r` along the path wire. Exact lines and arcs,
 *  so the solid's length is the bend table's cut length. */
function sweptRod(path: TubePath, r: number): replicad.Shape3D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const edges = path.segments.map((s) =>
    s.kind === 'line' ? replicad.makeLine(s.a, s.b) : replicad.makeThreePointArc(s.start, s.mid, s.end));
  const spine = replicad.assembleWire(edges);
  const start: V3 = path.points[0];
  const profile = replicad.makeFace(replicad.assembleWire([replicad.makeCircle(r, start, path.startDir)]));
  const pipe = new oc.BRepOffsetAPI_MakePipe_1(spine.wrapped, profile.wrapped);
  pipe.Build(new oc.Message_ProgressRange_1());
  if (!pipe.IsDone()) throw new Error('tube: BRepOffsetAPI_MakePipe did not finish.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return replicad.cast(pipe.Shape() as any) as replicad.Shape3D;
}

/** The tube as one solid. `wall >= od / 2` leaves no bore and builds a solid rod. */
export function tubeSolid(path: TubePath, od: number, wall: number): OcctBackend {
  const outer = sweptRod(path, od / 2);
  if (wall >= od / 2) return new OcctBackend(outer);
  const inner = sweptRod(path, od / 2 - wall);
  return new OcctBackend(outer.cut(inner) as replicad.Shape3D);
}

/** The cutter stands this far past the branch on each side along the trunk:
 *  enough to clear the branch, short enough to cut nothing else. */
const CUTTER_MARGIN_MM = 1;

/** The trunk's outer cylinder around one joint: a solid rod along the trunk
 *  leg, just longer than the branch is wide. */
function trunkCutter(joint: TubeJoint, branchOd: number): OcctBackend {
  const half = branchOd / 2 + CUTTER_MARGIN_MM;
  const start = sub(joint.center, scale(joint.legDir, half));
  return new OcctBackend(replicad.makeCylinder(joint.trunkOd / 2, 2 * half, start, joint.legDir) as replicad.Shape3D);
}

/**
 * A tube with its branch ends cut to the trunk. `sweep` is the centreline run
 * on to the trunk centreline at each joint (`branchSweepPath`); the tube is
 * swept along it and the trunk's outer cylinder is cut away at each joint, so
 * the end is a saddle that sits on the trunk wall: the two solids touch and
 * share no volume. The trunk itself is not cut.
 */
export function tubeSolidOnTrunks(sweep: TubePath, joints: readonly TubeJoint[], od: number, wall: number): OcctBackend {
  let solid = tubeSolid(sweep, od, wall);
  for (const joint of joints) solid = solid.subtract(trunkCutter(joint, od));
  return solid;
}
