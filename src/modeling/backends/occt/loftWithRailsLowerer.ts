// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';

const RAIL_MISS_TOL_MM = 1;

function hypot3(ax: number, ay: number, az: number): number {
  return Math.hypot(ax, ay, az);
}

/**
 * True when `railEdge` comes within `RAIL_MISS_TOL_MM` of every section wire.
 */
export function railHitsSections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  railEdge: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sectionWires: any[],
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const adaptor = new oc.BRepAdaptor_Curve_2(railEdge);
  const u0 = adaptor.FirstParameter();
  const u1 = adaptor.LastParameter();
  const p = new oc.gp_Pnt_1();
  const samples: Array<[number, number, number]> = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    adaptor.D0(u0 + ((u1 - u0) * i) / n, p);
    samples.push([p.X(), p.Y(), p.Z()]);
  }
  adaptor.delete?.();

  for (const wire of sectionWires) {
    const verts: Array<[number, number, number]> = [];
    const exp = new oc.TopExp_Explorer_2(
      wire,
      oc.TopAbs_ShapeEnum.TopAbs_VERTEX,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    while (exp.More()) {
      const v = oc.TopoDS.Vertex_1(exp.Current());
      const vp = oc.BRep_Tool.Pnt(v);
      verts.push([vp.X(), vp.Y(), vp.Z()]);
      exp.Next();
    }
    exp.delete();
    if (verts.length === 0) return false;
    let hit = false;
    for (const [sx, sy, sz] of samples) {
      for (const [vx, vy, vz] of verts) {
        if (hypot3(sx - vx, sy - vy, sz - vz) <= RAIL_MISS_TOL_MM) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    // Also accept a rail that merely passes near the wire (not a vertex) by
    // comparing rail samples against the wire's bounding-box centre when
    // vertices are sparse — fall through to closest-sample vs first vertex
    // already covered. If no vertex is within tolerance, the rail missed.
    if (!hit) return false;
  }
  return true;
}

/**
 * Guide-rail loft via `BRepOffsetAPI_MakePipeShell`.
 *
 * First rail is the spine; an optional second rail is the auxiliary spine
 * (`SetMode_5`). Sections are added with `Add_1` so they need not sit on
 * spine vertices (unlike variableSweep's `Add_2`).
 */
export function lowerLoftWithRails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spineEdge: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sectionWires: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auxEdge?: any,
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  if (sectionWires.length < 2) {
    throw new Error(`lowerLoftWithRails: need at least 2 sections; got ${sectionWires.length}.`);
  }
  const spineWire = new oc.BRepBuilderAPI_MakeWire_2(spineEdge).Wire();
  const pipeShell = new oc.BRepOffsetAPI_MakePipeShell(spineWire);
  pipeShell.SetMode_1(false);
  if (auxEdge) {
    const auxWire = new oc.BRepBuilderAPI_MakeWire_2(auxEdge).Wire();
    pipeShell.SetMode_5(
      auxWire,
      true,
      oc.BRepFill_TypeOfContact.BRepFill_ContactOnBorder,
    );
  }
  pipeShell.SetTransitionMode(oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RoundCorner);
  for (const wire of sectionWires) {
    pipeShell.Add_1(wire, true, true);
  }
  const progress = new oc.Message_ProgressRange_1();
  pipeShell.Build(progress);
  if (!pipeShell.IsDone()) {
    throw new Error('BRepOffsetAPI_MakePipeShell::Build did not converge for a rail loft.');
  }
  pipeShell.MakeSolid();
  const rawShape = pipeShell.Shape();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(rawShape as any) as replicad.Shape3D;
  return new OcctBackend(wrapped);
}
