// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Revolved sub-tools for hole bottoms: countersink cones and blind-hole
// drill-point tips. Kept out of holeLowerer.ts to stay under the max-lines
// ratchet.

import * as replicad from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';
import { drillPointTipDepth } from '../../../shared/intent/holeDrillPoint';

function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(v: Vec3, s: number): Vec3 { return [v[0] * s, v[1] * s, v[2] * s]; }

/**
 * Countersink cutter: the right triangle (axis, entry rim, apex) revolved a
 * full turn about the bore axis. The bundled OCCT wasm does not bind
 * `BRepPrimAPI_MakeCone`, so the cone is built with `BRepPrimAPI_MakeRevol`,
 * which OCCT turns into an exact conical face for a straight generatrix.
 *
 * The profile starts `overshoot` outside the entry face (continuing the cone)
 * so the cutter crosses the face instead of sharing it, and ends at the apex
 * `rimRadius / tan(angle/2)` into the body.
 *
 * @throws {Error} when the cone cannot be built — the caller turns that into
 *   an error diagnostic; a hole never silently loses its countersink.
 */
export function buildCountersinkCone(
  entryPoint: Vec3,
  axisIntoBody: Vec3,
  uBasis: Vec3,
  rimRadius: number,
  angleDeg: number,
  overshoot: number,
): replicad.Shape3D {
  const halfAngle = (angleDeg / 2) * Math.PI / 180;
  const apexDepth = rimRadius / Math.tan(halfAngle);
  const outerRadius = rimRadius + overshoot * Math.tan(halfAngle);
  const at = (radial: number, axial: number): Vec3 =>
    add(entryPoint, add(scale(uBasis, radial), scale(axisIntoBody, axial)));
  const corners: Vec3[] = [at(0, -overshoot), at(outerRadius, -overshoot), at(0, apexDepth)];
  return revolveProfileAboutAxis(corners, entryPoint, axisIntoBody, 'countersink cone');
}

/**
 * Blind-bore tool with a drill-point tip: one revolved profile holds the
 * cylinder from `above` the entry face to `depth` and the cone from the
 * full-diameter shoulder to its apex. `depth` is the shoulder depth, matching
 * the public `hole()` contract and the drill-point reading in drawings.
 */
export function buildDrillPointTool(
  entryPoint: Vec3,
  axisIntoBody: Vec3,
  uBasis: Vec3,
  radius: number,
  depth: number,
  above: number,
  angleDeg: number,
): replicad.Shape3D {
  const tipDepth = drillPointTipDepth(radius, angleDeg);
  const at = (radial: number, axial: number): Vec3 =>
    add(entryPoint, add(scale(uBasis, radial), scale(axisIntoBody, axial)));
  const corners: Vec3[] = [
    at(0, -above),
    at(radius, -above),
    at(radius, depth),
    at(0, depth + tipDepth),
  ];
  return revolveProfileAboutAxis(corners, entryPoint, axisIntoBody, 'drill-point tip');
}

/** Revolve a closed planar profile (defined in the axis/u plane) a full turn
 *  about `axis`. OCCT turns a straight generatrix into an exact conical face;
 *  the caller keeps the returned solid and owns the temporary OCCT objects. */
function revolveProfileAboutAxis(
  corners: readonly Vec3[],
  origin: Vec3,
  axisIntoBody: Vec3,
  label: string,
): replicad.Shape3D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = (replicad as any).getOC();
  const created: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(o: T): T => { created.push(o); return o; };
  try {
    if (typeof oc.BRepPrimAPI_MakeRevol_2 !== 'function') {
      throw new Error(`this OCCT build does not provide BRepPrimAPI_MakeRevol, so the ${label} cannot be built.`);
    }
    const wire = keep(new oc.BRepBuilderAPI_MakeWire_1());
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      const pa = keep(new oc.gp_Pnt_3(a[0], a[1], a[2]));
      const pb = keep(new oc.gp_Pnt_3(b[0], b[1], b[2]));
      const edge = keep(new oc.BRepBuilderAPI_MakeEdge_3(pa, pb));
      wire.Add_1(edge.Edge());
    }
    const face = keep(new oc.BRepBuilderAPI_MakeFace_15(wire.Wire(), true));
    if (!face.IsDone()) throw new Error(`the ${label} profile face could not be built.`);
    const originPoint = keep(new oc.gp_Pnt_3(origin[0], origin[1], origin[2]));
    const dir = keep(new oc.gp_Dir_4(axisIntoBody[0], axisIntoBody[1], axisIntoBody[2]));
    const axis = keep(new oc.gp_Ax1_2(originPoint, dir));
    const revol = keep(new oc.BRepPrimAPI_MakeRevol_2(face.Face(), axis, true));
    if (!revol.IsDone()) throw new Error(`BRepPrimAPI_MakeRevol did not build the ${label}.`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solid = (replicad as any).cast(revol.Shape()) as replicad.Shape3D;
    if (Math.abs(replicad.measureVolume(solid)) < 1e-9) {
      throw new Error(`the ${label} came out empty.`);
    }
    return solid;
  } finally {
    for (const o of created.reverse()) o.delete();
  }
}
