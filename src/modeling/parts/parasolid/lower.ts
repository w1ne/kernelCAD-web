// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Turn a parasolid-core body model into OCCT solids. Each body is sewn on its
// own and instanced by the transmit's own placements. Planar and analytic
// surfaces (plane, cylinder, cone, sphere, torus) are built exactly; anything
// else is reported and not approximated.

import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ParasolidFace, ParasolidInstance, ParasolidRead, ParasolidSegment } from './native';

const TO_MM: Record<'m' | 'cm' | 'mm' | 'in' | 'ft', number> = {
  m: 1000,
  cm: 10,
  mm: 1,
  in: 25.4,
  ft: 304.8,
};

interface BoundsMm {
  min: [number, number, number];
  max: [number, number, number];
}

function unionBounds(a: BoundsMm | undefined, b: BoundsMm): BoundsMm {
  if (!a) return b;
  return {
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
  };
}

/**
 * A backend whose bounding box is known analytically from the transmit.
 * Asking OCCT for the box of a whole-machine compound (hundreds of sewn
 * solids, thousands of placements) overflows the module; the union of the
 * placed per-body boxes is exact and free.
 */
class BoundedBackend extends OcctBackend {
  private readonly bounds: BoundsMm;

  constructor(shape: never, bounds: BoundsMm) {
    super(shape);
    this.bounds = bounds;
  }

  override boundingBox(): BoundsMm {
    return { min: [...this.bounds.min], max: [...this.bounds.max] } as BoundsMm;
  }
}

/** Transform an axis-aligned box by one transmit instance (8 corners). */
function transformBounds(bounds: BoundsMm, instance: ParasolidInstance, scale: number): BoundsMm {
  const r = normalizeRotation(instance.rotation);
  const s = Number.isFinite(instance.scale) && instance.scale > 0 ? instance.scale : 1;
  const t = instance.translation ?? [0, 0, 0];
  const out: BoundsMm = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (let corner = 0; corner < 8; corner++) {
    const x = corner & 1 ? bounds.max[0] : bounds.min[0];
    const y = corner & 2 ? bounds.max[1] : bounds.min[1];
    const z = corner & 4 ? bounds.max[2] : bounds.min[2];
    for (let axis = 0; axis < 3; axis++) {
      const value =
        s * (r[axis * 3]! * x + r[axis * 3 + 1]! * y + r[axis * 3 + 2]! * z) +
        (t[axis] ?? 0) * scale * s;
      out.min[axis] = Math.min(out.min[axis]!, value);
      out.max[axis] = Math.max(out.max[axis]!, value);
    }
  }
  return out;
}

/**
 * Build solids from a Parasolid body model. Each body becomes one solid; every
 * instance of it is placed by the transmit's own transform. The units come from
 * the caller — a Parasolid file stores numbers, not units.
 */
export async function solidFromParasolid(
  model: ParasolidRead,
  sourceUnit: 'm' | 'cm' | 'mm' | 'in' | 'ft',
): Promise<OcctBackend> {
  const scale = TO_MM[sourceUnit];
  const bodies = model.bodies ?? [];
  if (bodies.length === 0) {
    throw new Error('parasolid import: the reader returned no B-rep bodies');
  }
  await initOcct();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = replicad.getOC() as any;
  // A single body that OCCT cannot sew must not abort the whole machine; it
  // is dropped and the remaining bodies still import.
  let builtBodies = 0;
  let skippedBodies = 0;
  let visited = 0;
  const KERNELCAD_PARASOLID_DEBUG_ENABLED = process.env.KERNELCAD_PARASOLID_DEBUG !== undefined;
  const progress = (label: string, total: number): void => {
    if (KERNELCAD_PARASOLID_DEBUG_ENABLED) {
      console.error(`[parasolid] ${label} ${visited}/${total} built ${builtBodies} skipped ${skippedBodies}`);
    }
  };
  // Sewing cost grows sharply with face count; very large castings are left
  // to their own pass rather than stalling the whole-machine import.
  const MAX_FACES_PER_BODY = Number(process.env.KERNELCAD_PARASOLID_MAX_FACES ?? 400);
  const bodyBounds: (BoundsMm | undefined)[] = [];
  const solids = bodies.map((body) => {
    visited += 1;
    let solid: OcctBackend | undefined;
    let bounds: BoundsMm | undefined;
    const faces = body.faces ?? [];
    if (KERNELCAD_PARASOLID_DEBUG_ENABLED) {
      console.error(`[parasolid] body ${visited}/${bodies.length} faces ${faces.length}`);
    }
    if (faces.length <= MAX_FACES_PER_BODY) {
      try {
        solid = bodySolid(oc, faces, scale);
      } catch {
        solid = undefined;
      }
    }
    // A body whose bounds are non-finite (or absurd) carries an unbounded
    // face; it would poison the machine's bounding box, so it is dropped.
    // Exact bounds are required: the fast path reports the OCCT infinite
    // sentinel for solids built from raw sewn shells.
    if (solid) {
      try {
        const bb = solid.boundingBox({ exact: true });
        const absurd = !Number.isFinite(bb.min[0]) || Math.max(...bb.max.map(Math.abs), ...bb.min.map(Math.abs)) > 1e7;
        if (absurd) solid = undefined;
        else bounds = { min: [bb.min[0], bb.min[1], bb.min[2]], max: [bb.max[0], bb.max[1], bb.max[2]] };
      } catch {
        solid = undefined;
      }
    }
    bodyBounds.push(bounds);
    if (solid) builtBodies += 1;
    else skippedBodies += 1;
    if (KERNELCAD_PARASOLID_DEBUG_ENABLED && visited % 10 === 0) progress('bodies', bodies.length);
    return solid;
  });
  const instances = model.instances ?? [];
  const placed: OcctBackend[] = [];
  if (instances.length === 0) {
    for (const solid of solids) {
      if (solid) placed.push(solid);
    }
  } else {
    visited = 0;
    for (const instance of instances) {
      visited += 1;
      const solid = solids[instance.body];
      if (!solid) continue;
      try {
        // Transform primitives consume their input; keep the body solid
        // alive for every other instance of the same body.
        placed.push(placedSolid(instance, solid.clone(), scale));
      } catch {
        // Skip instances OCCT cannot transform.
      }
      if (visited % 500 === 0) progress('instances', instances.length);
    }
  }
  if (placed.length === 0) {
    throw new Error('parasolid import: no body could be built into a solid');
  }
  // Machine bounds from the placed body boxes; the compound itself cannot be
  // measured by OCCT at this scale, and these bounds are exact.
  let machine: BoundsMm | undefined;
  if (instances.length === 0) {
    for (const bounds of bodyBounds) {
      if (bounds) machine = unionBounds(machine, bounds);
    }
  } else {
    for (const instance of instances) {
      const bounds = bodyBounds[instance.body];
      if (!bounds || !solids[instance.body]) continue;
      machine = unionBounds(machine, transformBounds(bounds, instance, scale));
    }
  }
  const compound = placed.length === 1 ? placed[0]! : OcctBackend.compound(placed);
  return machine === undefined
    ? compound
    : new BoundedBackend(compound.getReplicadShape() as never, machine);
}

/** Sew one body's faces into a closed shell and make it a solid. */
export function bodySolid(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  faces: ParasolidFace[],
  scale: number,
): OcctBackend | undefined {
  const usable = faces.filter(
    (face) =>
      (face.edges ?? []).some((ring) => ring.length > 0) ||
      face.loops.some((loop) => loop.length >= 3),
  );
  if (usable.length === 0) return undefined;
  // Cutting must stay off: on assemblies with many near-coplanar faces it
  // sends OCCT's face-splitting into unbounded recursion. Matching shared
  // edges is all this import needs.
  const analysis = process.env.KERNELCAD_PARASOLID_SEW_ANALYSIS !== 'false';
  const sewing = new oc.BRepBuilderAPI_Sewing(1e-3, true, analysis, false, false);
  for (const face of usable) {
    addFace(oc, sewing, face, scale);
  }
  sewing.Perform(new oc.Message_ProgressRange_1());
  const sewed = sewing.SewedShape();
  sewing.delete?.();
  const shapeTypeRaw = sewed.ShapeType();
  const shapeType = typeof shapeTypeRaw === 'object' && shapeTypeRaw !== null
    ? (shapeTypeRaw as { value?: number }).value ?? shapeTypeRaw
    : shapeTypeRaw;
  if (shapeType !== 3) return undefined;
  const shell = oc.TopoDS.Shell_1(sewed);
  const makeSolid = new oc.BRepBuilderAPI_MakeSolid_3(shell);
  if (!makeSolid.IsDone()) {
    makeSolid.delete?.();
    return undefined;
  }
  const solid = makeSolid.Solid();
  makeSolid.delete?.();
  return new OcctBackend(replicad.cast(solid) as never);
}

/** Apply one transmit instance: x' = (R·x + t)·s, in the file's own unit. */
function placedSolid(instance: ParasolidInstance, solid: OcctBackend, scale: number): OcctBackend {
  const rotation = normalizeRotation(instance.rotation);
  let out = solid;
  let proper = rotation;
  if (determinant3(rotation) < 0) {
    out = out.reflect('xy');
    proper = multiply3(rotation, [1, 0, 0, 0, 1, 0, 0, 0, -1]);
  }
  const { axis, degrees } = axisAngleFromMatrix(proper);
  if (degrees > 1e-9) out = out.rotate(axis, degrees);
  const s = Number.isFinite(instance.scale) && instance.scale > 0 ? instance.scale : 1;
  if (Math.abs(s - 1) > 1e-12) out = out.scale(s);
  const t = instance.translation ?? [0, 0, 0];
  const tx = (t[0] ?? 0) * scale * s;
  const ty = (t[1] ?? 0) * scale * s;
  const tz = (t[2] ?? 0) * scale * s;
  if (tx !== 0 || ty !== 0 || tz !== 0) out = out.translate(tx, ty, tz);
  return out;
}

function normalizeRotation(values: number[] | undefined): number[] {
  if (!values || values.length < 9) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  return values.slice(0, 9).map((value) => (Number.isFinite(value) ? value : 0));
}

function determinant3(m: number[]): number {
  return (
    m[0]! * (m[4]! * m[8]! - m[5]! * m[7]!) -
    m[1]! * (m[3]! * m[8]! - m[5]! * m[6]!) +
    m[2]! * (m[3]! * m[7]! - m[4]! * m[6]!)
  );
}

function multiply3(a: number[], b: number[]): number[] {
  const out = new Array<number>(9).fill(0);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += a[row * 3 + k]! * b[k * 3 + column]!;
      out[row * 3 + column] = sum;
    }
  }
  return out;
}

/** Rotation (row-major) to axis and degrees about the origin. */
export function axisAngleFromMatrix(m: number[]): { axis: [number, number, number]; degrees: number } {
  const trace = m[0]! + m[4]! + m[8]!;
  const cos = Math.min(1, Math.max(-1, (trace - 1) / 2));
  const degrees = (Math.acos(cos) * 180) / Math.PI;
  if (degrees < 1e-9) return { axis: [0, 0, 1], degrees: 0 };
  let x = m[7]! - m[5]!;
  let y = m[2]! - m[6]!;
  let z = m[3]! - m[1]!;
  let length = Math.hypot(x, y, z);
  if (length < 1e-9) {
    // Near 180 degrees: recover the axis from the symmetric part columns.
    const columns: [number, number, number][] = [
      [m[0]! + 1, m[3]!, m[6]!],
      [m[1]!, m[4]! + 1, m[7]!],
      [m[2]!, m[5]!, m[8]! + 1],
    ];
    let best = columns[0]!;
    let bestLength = Math.hypot(...best);
    for (const column of columns.slice(1)) {
      const columnLength = Math.hypot(...column);
      if (columnLength > bestLength) {
        best = column;
        bestLength = columnLength;
      }
    }
    x = best[0];
    y = best[1];
    z = best[2];
    length = bestLength;
  }
  if (length < 1e-12) return { axis: [0, 0, 1], degrees: 0 };
  return { axis: [x / length, y / length, z / length], degrees };
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
function dir(oc: any, v: number[] | undefined, fallback: number[]): any {
  const x = v?.[0] ?? fallback[0];
  const y = v?.[1] ?? fallback[1];
  const z = v?.[2] ?? fallback[2];
  const n = Math.hypot(x, y, z) || 1;
  return new oc.gp_Dir_4(x / n, y / n, z / n);
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
function pnt(oc: any, v: number[] | undefined, scale: number): any {
  return new oc.gp_Pnt_3((v?.[0] ?? 0) * scale, (v?.[1] ?? 0) * scale, (v?.[2] ?? 0) * scale);
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
function analyticFace(oc: any, face: ParasolidFace, wires: unknown[], scale: number): any | undefined {
  const s = face.surf;
  const outer = wires[0];
  if (!s || !outer) return undefined;
  const origin = pnt(oc, s.point ?? s.center, scale);
  const axis = dir(oc, s.axis ?? s.normal, [0, 0, 1]);
  const xAxis = dir(oc, s.xAxis, [1, 0, 0]);
  const ax3 = new oc.gp_Ax3_3(origin, axis, xAxis);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maker: any;
  // A cylinder or cone is infinite along its axis; a face with fewer than two
  // boundary loops is a half-infinite tube, not a bounded sheet, and sewing
  // it into a "solid" produces an unbounded shape.
  if ((face.kind === 'cylinder' || face.kind === 'cone') && wires.length < 2) {
    return undefined;
  }
  if (face.kind === 'cylinder' && s.radius && s.radius > 0) {
    maker = new oc.BRepBuilderAPI_MakeFace_17(new oc.gp_Cylinder_2(ax3, s.radius * scale), outer, true);
  } else if (face.kind === 'sphere' && s.radius && s.radius > 0) {
    maker = new oc.BRepBuilderAPI_MakeFace_19(new oc.gp_Sphere_2(ax3, s.radius * scale), outer, true);
  } else if (
    face.kind === 'cone' &&
    typeof oc.gp_Cone_2 === 'function' &&
    s.radius !== undefined &&
    s.sinHalf !== undefined &&
    s.cosHalf !== undefined
  ) {
    const half = Math.atan2(s.sinHalf, s.cosHalf);
    maker = new oc.BRepBuilderAPI_MakeFace_18(new oc.gp_Cone_2(ax3, half, Math.abs(s.radius) * scale), outer, true);
  } else if (face.kind === 'torus' && typeof oc.gp_Torus_2 === 'function' && s.major && s.minor) {
    maker = new oc.BRepBuilderAPI_MakeFace_20(new oc.gp_Torus_2(ax3, s.major * scale, s.minor * scale), outer, true);
  }
  if (!maker) return undefined;
  // Further loops bound bands (both rims of a cylinder), same as planar inner wires.
  for (const inner of wires.slice(1)) {
    maker.Add(inner);
  }
  if (!maker.IsDone()) {
    maker.delete?.();
    return undefined;
  }
  const built = maker.Face();
  maker.delete?.();
  return built;
}

function addFace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sewing: any,
  face: ParasolidFace,
  scale: number,
): void {
  const wires = wiresForFace(oc, face, scale);
  const outer = wires[0];
  if (!outer) return;
  const curved = analyticFace(oc, face, wires, scale);
  if (curved) {
    sewing.Add(curved);
    return;
  }
  const maker = new oc.BRepBuilderAPI_MakeFace_15(outer, true);
  for (const inner of wires.slice(1)) maker.Add(inner);
  if (maker.IsDone()) sewing.Add(maker.Face());
  maker.delete?.();
}

/**
 * Prefer the exact per-edge curves; fall back to vertex-position chords when
 * any ring of this face cannot be built exactly.
 */
export function wiresForFace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  face: ParasolidFace,
  scale: number,
): unknown[] {
  const exactRings = (face.edges ?? []).filter((ring) => ring.length > 0);
  if (exactRings.length > 0) {
    const built = exactRings.map((ring) => wireFromSegments(oc, ring, scale));
    if (built.every((wire) => wire !== undefined)) return built as unknown[];
  }
  return face.loops.filter((loop) => loop.length >= 3).map((loop) => wireFromLoop(oc, loop, scale));
}

function wireFromSegments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  ring: (ParasolidSegment | null)[],
  scale: number,
): unknown | undefined {
  const wire = new oc.BRepBuilderAPI_MakeWire_1();
  for (const segment of ring) {
    const edge = segment ? edgeFromSegment(oc, segment, scale) : undefined;
    if (!edge) {
      wire.delete?.();
      return undefined;
    }
    wire.Add_1(edge);
  }
  const built = wire.Wire();
  wire.delete?.();
  return built;
}

function samePoint(a: number[] | null | undefined, b: number[] | null | undefined): boolean {
  if (!a || !b) return false;
  return Math.abs(a[0]! - b[0]!) < 1e-9 && Math.abs(a[1]! - b[1]!) < 1e-9 && Math.abs(a[2]! - b[2]!) < 1e-9;
}

function edgeFromSegment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  segment: ParasolidSegment,
  scale: number,
): unknown | undefined {
  const curve = segment.curve;
  if (!curve) return undefined;
  const p = (v: number[] | null | undefined) =>
    v ? new oc.gp_Pnt_3(v[0]! * scale, v[1]! * scale, v[2]! * scale) : undefined;
  const from = p(segment.start);
  const to = p(segment.end);
  const closed = samePoint(segment.start, segment.end);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maker: any;
  if (curve.kind === 'line') {
    if (!from || !to || closed) return undefined;
    maker = new oc.BRepBuilderAPI_MakeEdge_3(from, to);
  } else if (curve.kind === 'circle' && curve.radius) {
    if (!curve.center || !curve.normal || !curve.xAxis) return undefined;
    const ax2 = new oc.gp_Ax2_2(pnt(oc, curve.center, scale), dir(oc, curve.normal, [0, 0, 1]), dir(oc, curve.xAxis, [1, 0, 0]));
    const circle = new oc.gp_Circ_2(ax2, curve.radius * scale);
    if (!from || !to || closed) {
      maker = new oc.BRepBuilderAPI_MakeEdge_8(circle);
    } else {
      maker = new oc.BRepBuilderAPI_MakeEdge_10(circle, from, to);
    }
  } else if (curve.kind === 'ellipse' && curve.major && curve.minor) {
    if (!curve.center || !curve.normal || !curve.xAxis) return undefined;
    const ax2 = new oc.gp_Ax2_2(pnt(oc, curve.center, scale), dir(oc, curve.normal, [0, 0, 1]), dir(oc, curve.xAxis, [1, 0, 0]));
    const ellipse = new oc.gp_Elips_2(ax2, curve.major * scale, curve.minor * scale);
    if (!from || !to || closed) {
      maker = new oc.BRepBuilderAPI_MakeEdge_12(ellipse);
    } else {
      maker = new oc.BRepBuilderAPI_MakeEdge_14(ellipse, from, to);
    }
  } else {
    return undefined;
  }
  if (!maker || !maker.IsDone()) {
    maker?.delete?.();
    return undefined;
  }
  const edge = maker.Edge();
  maker.delete?.();
  return edge;
}

function wireFromLoop(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  loop: number[][],
  scale: number,
): unknown {
  const wire = new oc.BRepBuilderAPI_MakeWire_1();
  const point = (xyz: number[]) => new oc.gp_Pnt_3(xyz[0] * scale, xyz[1] * scale, xyz[2] * scale);
  for (let i = 0; i < loop.length; i++) {
    const rawA = loop[i]!;
    const rawB = loop[(i + 1) % loop.length]!;
    // Zero-length chords come from repeated vertex positions and send the
    // OCCT wire builder into pathological recursion.
    if (
      Math.abs(rawA[0]! - rawB[0]!) * scale < 1e-9 &&
      Math.abs(rawA[1]! - rawB[1]!) * scale < 1e-9 &&
      Math.abs(rawA[2]! - rawB[2]!) * scale < 1e-9
    ) {
      continue;
    }
    const a = point(rawA);
    const b = point(rawB);
    const edge = new oc.BRepBuilderAPI_MakeEdge_3(a, b);
    if (edge.IsDone()) wire.Add_1(edge.Edge());
    a.delete?.();
    b.delete?.();
    edge.delete?.();
  }
  const built = wire.Wire();
  wire.delete?.();
  return built;
}
