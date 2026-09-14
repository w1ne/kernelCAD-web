// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/helicalSweep.ts
//
// Screw-motion sweep of a planar profile along an EXACT helix — the
// construction threads, worms and helical grooves need.
//
// Why not the generic smooth-spine sweep: that spine is a B-spline fitted
// through sampled rail points and the profile is rotated normal to the spine
// tangent, so a thread cross-section authored in the axial plane arrives
// skewed by the helix angle and a 60° V profile self-intersects. Why not one
// helix edge for the whole run: MakePipeShell then emits faces that each wrap
// every turn, and later booleans against those faces silently return empty
// results (measured: a bored block ∩ an 8-turn ridge came back 0 mm³ where
// 16.33 mm³ was expected; with per-half-turn faces it matched to 1e-4).
//
// Construction:
//   - spine: 2D line segments on a cylindrical surface (`u` = angle, `v` =
//     axial), EDGES_PER_TURN edges per turn, 3D curves built from the
//     pcurves. Each edge is an exact helix arc up to BuildCurves3d tolerance.
//   - frame: constant binormal along the helix axis. On a helix that trihedron
//     is carried by the screw motion itself, so the profile is moved rigidly by
//     a pure rotation + axial translation.
//   - profile placement: the caller's profile lives in local XY with
//     x = radial offset from the helix start point (positive = away from the
//     axis) and y = axial offset. It is placed in the axial plane through the
//     start point.
//
// The swept volume of such a profile is exactly θ_total · ∫∫ r dA (Pappus for
// a screw motion), which `analyticHelicalSweepVolume` computes for polygon
// profiles; the thread tests compare OCCT's volume against it.

import { getOC } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';

/** Helix edges per turn. Two keeps every face under 180° of wrap, which is
 *  what makes downstream booleans against the swept faces reliable. */
export const EDGES_PER_TURN = 2;

export interface HelicalSweepSpec {
  /** Point on the helix axis at the start of the sweep. */
  readonly origin: Vec3;
  /** Unit axis; the helix advances along +axis. */
  readonly axis: Vec3;
  /** Unit vector ⟂ axis at angle 0. */
  readonly refDir: Vec3;
  /** Unit vector ⟂ axis at angle +90°. `refDir × normalDir = axis` gives a
   *  right-handed helix; `= -axis` gives a left-handed one. */
  readonly normalDir: Vec3;
  readonly radius: number;
  /** Axial advance per turn (mm), > 0. */
  readonly pitch: number;
  /** Number of turns, > 0 (fractional allowed). */
  readonly turns: number;
  /** Angle of the start point, radians. */
  readonly startAngle: number;
}

/** A failure the lowerer maps to `feature.invalid-args` (author-fixable). */
export class HelicalSweepArgsError extends Error {
  readonly hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.name = 'HelicalSweepArgsError';
    this.hint = hint;
  }
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];

/** The helix frame `modeling/helix.ts` uses for its sampled points, so the
 *  exact spine is the same curve the rail samples. */
export function helixAxisBasis(axis: 'X' | 'Y' | 'Z'): { axis: Vec3; refDir: Vec3; normalDir: Vec3 } {
  if (axis === 'X') return { axis: [1, 0, 0], refDir: [0, 1, 0], normalDir: [0, 0, 1] };
  if (axis === 'Y') return { axis: [0, 1, 0], refDir: [1, 0, 0], normalDir: [0, 0, 1] };
  return { axis: [0, 0, 1], refDir: [1, 0, 0], normalDir: [0, 1, 0] };
}

function validateSpec(spec: HelicalSweepSpec): void {
  const finite = [spec.radius, spec.pitch, spec.turns, spec.startAngle, ...spec.origin].every(Number.isFinite);
  if (!finite) {
    throw new HelicalSweepArgsError(
      `helical sweep: radius, pitch, turns and startAngle must be finite; got radius=${spec.radius}, pitch=${spec.pitch}, turns=${spec.turns}, startAngle=${spec.startAngle}.`,
      'Pass finite helix dimensions.',
    );
  }
  if (!(spec.radius > 0) || !(spec.pitch > 0) || !(spec.turns > 0)) {
    throw new HelicalSweepArgsError(
      `helical sweep: radius (${spec.radius}), pitch (${spec.pitch}) and turns (${spec.turns}) must all be > 0.`,
      'Use a positive helix radius, pitch and turn count.',
    );
  }
}

/** Exact helix wire, EDGES_PER_TURN edges per turn. */
export function buildHelixSpine(spec: HelicalSweepSpec): unknown {
  validateSpec(spec);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const handed = Math.sign(dot(cross(spec.refDir, spec.normalDir), spec.axis)) || 1;
  // Cylinder frame: main direction N = handed·axis and X = refDir give a local
  // Y = N × refDir = normalDir in both handednesses, so the surface parameter
  // u is exactly the helix angle. World axial advance along +axis is then
  // v = handed · pitch · (u − startAngle) / 2π along N.
  const n = scale(spec.axis, handed);
  const pnt = new oc.gp_Pnt_3(spec.origin[0], spec.origin[1], spec.origin[2]);
  const dirN = new oc.gp_Dir_4(n[0], n[1], n[2]);
  const dirX = new oc.gp_Dir_4(spec.refDir[0], spec.refDir[1], spec.refDir[2]);
  const ax3 = new oc.gp_Ax3_3(pnt, dirN, dirX);
  const surface = new oc.Handle_Geom_Surface_2(new oc.Geom_CylindricalSurface_1(ax3, spec.radius));
  const edgeCount = Math.max(1, Math.ceil(spec.turns * EDGES_PER_TURN - 1e-9));
  const totalAngle = 2 * Math.PI * spec.turns;
  const wire = new oc.BRepBuilderAPI_MakeWire_1();
  for (let i = 0; i < edgeCount; i++) {
    const a0 = (totalAngle * i) / edgeCount;
    const a1 = (totalAngle * (i + 1)) / edgeCount;
    const p0 = new oc.gp_Pnt2d_3(spec.startAngle + a0, (handed * spec.pitch * a0) / (2 * Math.PI));
    const p1 = new oc.gp_Pnt2d_3(spec.startAngle + a1, (handed * spec.pitch * a1) / (2 * Math.PI));
    const seg = new oc.GCE2d_MakeSegment_1(p0, p1);
    const curve = new oc.Handle_Geom2d_Curve_2(seg.Value().get());
    const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_30(curve, surface);
    const edge = edgeMaker.Edge();
    oc.BRepLib.BuildCurves3d_2(edge);
    wire.Add_1(edge);
    p0.delete(); p1.delete(); seg.delete(); curve.delete(); edgeMaker.delete();
  }
  if (!wire.IsDone()) {
    wire.delete();
    throw new Error('helical sweep: could not assemble the helix spine wire.');
  }
  const out = wire.Wire();
  wire.delete(); pnt.delete(); dirN.delete(); dirX.delete(); ax3.delete();
  return out;
}

interface Box2 { xmin: number; xmax: number; ymin: number; ymax: number }

function boundsOf(shape: unknown): Box2 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const box = new oc.Bnd_Box_1();
  oc.BRepBndLib.Add(shape, box, false);
  const lo = box.CornerMin();
  const hi = box.CornerMax();
  const out = { xmin: lo.X(), xmax: hi.X(), ymin: lo.Y(), ymax: hi.Y() };
  box.delete();
  return out;
}

/**
 * Sweep a planar profile wire (authored in local XY: x = radial offset from
 * the helix start point, y = axial offset) along the exact helix. Returns the
 * solid as a TopoDS_Shape.
 *
 * @throws HelicalSweepArgsError when the profile would cross the axis or
 *   overlap the next turn (author-fixable).
 * @throws Error when OCCT cannot build a valid solid.
 */
export function sweepProfileAlongHelix(profileWireXY: unknown, spec: HelicalSweepSpec): unknown {
  validateSpec(spec);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  // The optimal 2D bounds of a line/arc profile are tight; a small slack keeps
  // arc bulges from tripping the overlap check on a profile that fits.
  const b = boundsOf(profileWireXY);
  if (spec.radius + b.xmin <= 0) {
    throw new HelicalSweepArgsError(
      `helical sweep: the profile reaches x = ${b.xmin.toFixed(4)} mm, which crosses the helix axis (radius ${spec.radius} mm).`,
      'Profile x is the radial offset from the helix point; keep radius + min(x) > 0.',
    );
  }
  const axialExtent = b.ymax - b.ymin;
  if (axialExtent >= spec.pitch - 1e-6) {
    throw new HelicalSweepArgsError(
      `helical sweep: the profile spans ${axialExtent.toFixed(4)} mm along the axis but the pitch is ${spec.pitch} mm, so adjacent turns would overlap and self-intersect.`,
      'Profile y is the axial offset; keep its axial extent below the pitch (an ISO thread ridge spans about 0.81·pitch).',
    );
  }

  // Place the profile: local X → radial direction at the start angle, local
  // Y → axis, local origin → the helix start point.
  const radial = add(scale(spec.refDir, Math.cos(spec.startAngle)), scale(spec.normalDir, Math.sin(spec.startAngle)));
  const start = add(spec.origin, scale(radial, spec.radius));
  const normal = cross(radial, spec.axis);
  const fromAx3 = new oc.gp_Ax3_1();
  const toPnt = new oc.gp_Pnt_3(start[0], start[1], start[2]);
  const toN = new oc.gp_Dir_4(normal[0], normal[1], normal[2]);
  const toX = new oc.gp_Dir_4(radial[0], radial[1], radial[2]);
  const toAx3 = new oc.gp_Ax3_3(toPnt, toN, toX);
  const trsf = new oc.gp_Trsf_1();
  trsf.SetDisplacement(fromAx3, toAx3);
  const placer = new oc.BRepBuilderAPI_Transform_2(profileWireXY, trsf, true);
  const profile = placer.Shape();

  const spine = buildHelixSpine(spec);
  const pipe = new oc.BRepOffsetAPI_MakePipeShell(spine);
  const binormal = new oc.gp_Dir_4(spec.axis[0], spec.axis[1], spec.axis[2]);
  pipe.SetMode_3(binormal);
  // WithContact=false, WithCorrection=false: keep the placement above; the
  // profile is deliberately NOT normal to the helix tangent.
  pipe.Add_1(profile, false, false);
  const progress = new oc.Message_ProgressRange_1();
  pipe.Build(progress);
  const cleanup = () => {
    progress.delete(); binormal.delete(); pipe.delete(); placer.delete(); trsf.delete();
    toAx3.delete(); toX.delete(); toN.delete(); toPnt.delete(); fromAx3.delete();
  };
  if (!pipe.IsDone()) {
    cleanup();
    throw new Error('helical sweep: BRepOffsetAPI_MakePipeShell did not build (is the profile a closed planar wire?).');
  }
  pipe.MakeSolid();
  let solid = pipe.Shape();
  cleanup();

  // A clockwise profile yields an inside-out solid; flip it so volume is
  // positive and booleans see the right side as material.
  const props = new oc.GProp_GProps_1();
  oc.BRepGProp.VolumeProperties_1(solid, props, false, false, false);
  const volume = props.Mass();
  props.delete();
  if (volume < 0) solid = solid.Reversed();

  const analyzer = new oc.BRepCheck_Analyzer(solid, true, false);
  const valid = analyzer.IsValid_2();
  analyzer.delete();
  if (!valid || Math.abs(volume) < 1e-12) {
    throw new Error('helical sweep: OCCT produced an invalid or empty solid (BRepCheck failed).');
  }
  return solid;
}

/** Build a closed polygon wire in local XY from `[x, y]` vertices. */
export function polygonWireXY(points: ReadonlyArray<readonly [number, number]>): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const wire = new oc.BRepBuilderAPI_MakeWire_1();
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const pa = new oc.gp_Pnt_3(a[0], a[1], 0);
    const pb = new oc.gp_Pnt_3(b[0], b[1], 0);
    const maker = new oc.BRepBuilderAPI_MakeEdge_3(pa, pb);
    wire.Add_1(maker.Edge());
    maker.delete(); pa.delete(); pb.delete();
  }
  const out = wire.Wire();
  wire.delete();
  return out;
}

/**
 * Exact volume of a polygon profile swept by `turns` of screw motion about an
 * axis `radius` away from the profile origin: θ · ∫∫ (radius + x) dA.
 * Valid when the sweep does not self-overlap (axial extent < pitch).
 */
export function analyticHelicalSweepVolume(
  points: ReadonlyArray<readonly [number, number]>,
  radius: number,
  turns: number,
): number {
  let area2 = 0; // 2·signed area
  let mx6 = 0; // 6·∫∫ x dA
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const c = x0 * y1 - x1 * y0;
    area2 += c;
    mx6 += (x0 + x1) * c;
  }
  const area = area2 / 2;
  const firstMomentX = mx6 / 6;
  return Math.abs(2 * Math.PI * turns * (radius * area + firstMomentX));
}
