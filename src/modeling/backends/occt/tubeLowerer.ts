// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { TubePath, V3 } from '../../../shared/tube/tubePath';

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
