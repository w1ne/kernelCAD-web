// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/backends/occt/sheetMetalLowerer.ts
//
// `case 'sheetMetalBend'` lowering. The fold geometry comes from the pure
// planner in `modeling/sheetMetalFold.ts` (one `FoldStep` per bend, in world
// space at the moment that bend is folded). For the step being lowered:
//
//   1. Split the current body at the two bend-zone planes (zone start on the
//      fixed side, zone end on the moving side; the zone is the K-factor bend
//      allowance strip across the bend line). Half-space boxes do the split
//      (`BRepAlgoAPI_Splitter` is not bound in the bundled wasm).
//   2. Revolve the fixed piece's cut section (the sheet cross-section at the
//      zone start, with any relief notches or cutouts that cross it) about the
//      bend axis by the bend angle: the bend arc with the requested INNER
//      radius.
//   3. Move the flange by the step's rigid transform: slide it back by the
//      bend allowance (the arc consumes that strip), then rotate it about the
//      bend axis. Its cut face lands exactly on the arc's end face.
//   4. Fuse fixed piece + arc + flange into one solid. Holes and cutouts in
//      the flange ride along with it.
//
// Returns a `bendRecord` (bend line in flat-blank coordinates, bend
// allowance, flat blank extents) that the caller persists on
// `r.metadata.bendRecord` for `flattenPattern()`.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeatureId } from '../../../shared/intent/types';
import type { FoldStep, Rigid, Vec3 } from '../../sheetMetalFold';

export interface BendAxisSpec {
  /** A point on the bend axis line, in world coordinates (slice-1 sheets
   *  live in the XY plane, so z = thickness/2 is the centerline). */
  origin: [number, number, number];
  /** Unit direction vector along the bend axis. Must be perpendicular to the
   *  top-face normal. */
  direction: [number, number, number];
  /** Length of the bend line across the flat blank. */
  edgeLength: number;
}

/** Persisted on `FeatureRecord.metadata.bendRecord` for `flattenPattern()`. */
export interface BendRecord {
  /** Bend line start in FLAT-BLANK coordinates (bottom surface). */
  axisOrigin: [number, number, number];
  axisDirection: [number, number, number];
  angleRad: number;
  radius: number;
  kFactor: number;
  thickness: number;
  /** Bend allowance: developed neutral-axis length of the arc (mm). */
  arcLength: number;
  edgeLength: number;
  /** +1 when the +X/+Y side of the line folded, -1 for the -X/-Y side. */
  movingSide: 1 | -1;
  /** Flat blank extents [xmin, ymin, xmax, ymax] and bottom z. */
  flatBounds: [number, number, number, number];
  flatZ0: number;
}

export interface SheetMetalBendLoweringResult {
  shape?: OcctBackend;
  diagnostics: CompilerDiagnostic[];
  bendRecord?: BendRecord;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Oc = any;

export interface BendInputs {
  featureId: FeatureId;
  base: OcctBackend;
  step: FoldStep;
  thickness: number;
  radius: number;
  kFactor: number;
  /** Bend line + flat blank data recorded for flattenPattern. */
  flat: { axis: BendAxisSpec; bounds: [number, number, number, number]; z0: number };
}

function kernelFailed(featureId: FeatureId, message: string, hint: string): CompilerDiagnostic {
  return { target: 'export-occt', code: 'feature.kernel-failed', featureId, severity: 'error', message, hint };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A box covering the half-space { x : (x - point)·normal > 0 } within `size`. */
function halfSpaceBox(oc: Oc, point: Vec3, normal: Vec3, size: number): unknown {
  const ref: Vec3 = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const xd = cross(ref, normal);
  const xl = Math.hypot(xd[0], xd[1], xd[2]);
  const x: Vec3 = [xd[0] / xl, xd[1] / xl, xd[2] / xl];
  const y = cross(normal, x);
  const o: Vec3 = [
    point[0] - (x[0] + y[0]) * size / 2,
    point[1] - (x[1] + y[1]) * size / 2,
    point[2] - (x[2] + y[2]) * size / 2,
  ];
  const ax2 = new oc.gp_Ax2_2(new oc.gp_Pnt_3(...o), new oc.gp_Dir_4(...normal), new oc.gp_Dir_4(...x));
  const box = new oc.BRepPrimAPI_MakeBox_5(ax2, size, size, size);
  const shape = box.Shape();
  box.delete();
  ax2.delete();
  return shape;
}

function cutShape(oc: Oc, shape: unknown, tool: unknown): unknown {
  const progress = new oc.Message_ProgressRange_1();
  const cut = new oc.BRepAlgoAPI_Cut_3(shape, tool, progress);
  cut.Build(progress);
  const out = cut.HasErrors() ? null : cut.Shape();
  cut.delete();
  progress.delete();
  if (!out) throw new Error('half-space cut failed');
  return out;
}

function toTrsf(oc: Oc, T: Rigid): unknown {
  const trsf = new oc.gp_Trsf_1();
  const R = T.R;
  trsf.SetValues(R[0], R[1], R[2], T.t[0], R[3], R[4], R[5], T.t[1], R[6], R[7], R[8], T.t[2]);
  return trsf;
}

function transformShape(oc: Oc, shape: unknown, T: Rigid): unknown {
  const trsf = toTrsf(oc, T) as { delete(): void };
  const xf = new oc.BRepBuilderAPI_Transform_2(shape, trsf, true);
  const out = xf.Shape();
  xf.delete();
  trsf.delete();
  return out;
}

/** Faces of `piece` that are the planar cut section at the zone start. */
function zoneSectionFaces(piece: replicad.Shape3D, step: FoldStep, thickness: number): replicad.Face[] {
  const tol = 1e-4;
  const out: replicad.Face[] = [];
  for (const face of piece.faces) {
    if (face.geomType !== 'PLANE') continue;
    const c = face.center;
    const rel = sub([c.x, c.y, c.z], step.zoneStart);
    const inPlane = Math.abs(dot(rel, step.e)) < tol;
    const h = dot(rel, step.n);
    if (inPlane && h > -tol && h < thickness + tol) out.push(face);
  }
  return out;
}

function isEmptyShape(shape: unknown): boolean {
  try {
    return Math.abs(replicad.measureVolume(replicad.cast(shape) as replicad.Shape3D)) < 1e-9;
  } catch {
    return true;
  }
}

/** The bend arc: each zone-start section revolved about the bend axis. */
function buildArc(step: FoldStep, sections: replicad.Face[]): replicad.Shape3D[] {
  const sign = step.angleRad >= 0 ? 1 : -1;
  const dir: Vec3 = [step.axis[0] * sign, step.axis[1] * sign, step.axis[2] * sign];
  const deg = Math.abs(step.angleRad) * 180 / Math.PI;
  return sections.map((f) => replicad.revolution(f, step.center, dir, deg) as replicad.Shape3D);
}

/** Fuse the pieces into one shape; a compound holding one solid is unwrapped. */
function fusePieces(pieces: replicad.Shape3D[]): replicad.Shape3D {
  let out = pieces[0];
  for (let i = 1; i < pieces.length; i++) out = out.fuse(pieces[i]) as replicad.Shape3D;
  const solids = (out as unknown as { wrapped: unknown }).wrapped;
  const oc = getOC() as Oc;
  const ex = new oc.TopExp_Explorer_2(solids, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const found: unknown[] = [];
  for (; ex.More(); ex.Next()) found.push(ex.Current());
  ex.delete();
  if (found.length === 1) return replicad.cast(oc.TopoDS.Solid_1(found[0])) as replicad.Shape3D;
  return out;
}

function foldPieces(oc: Oc, inp: BendInputs, baseShape: unknown): replicad.Shape3D[] {
  const { step } = inp;
  const bb = inp.base.boundingBox();
  const size = 4 * Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) + 4 * inp.radius;
  const fixedRaw = cutShape(oc, baseShape, halfSpaceBox(oc, step.zoneStart, step.e, size));
  const minusE: Vec3 = [-step.e[0], -step.e[1], -step.e[2]];
  const movingRaw = cutShape(oc, baseShape, halfSpaceBox(oc, step.zoneEnd, minusE, size));
  const fixed = replicad.cast(fixedRaw) as replicad.Shape3D;
  const pieces: replicad.Shape3D[] = [];
  if (!isEmptyShape(fixedRaw)) pieces.push(fixed);
  pieces.push(...buildArc(step, zoneSectionFaces(fixed, step, inp.thickness)));
  if (!isEmptyShape(movingRaw)) {
    pieces.push(replicad.cast(transformShape(oc, movingRaw, step.flangeTransform)) as replicad.Shape3D);
  }
  return pieces;
}

function bendRecordOf(inp: BendInputs): BendRecord {
  const { step, flat } = inp;
  return {
    axisOrigin: [flat.axis.origin[0], flat.axis.origin[1], flat.z0],
    axisDirection: flat.axis.direction,
    angleRad: step.angleRad,
    radius: inp.radius,
    kFactor: inp.kFactor,
    thickness: inp.thickness,
    arcLength: step.bendAllowance,
    edgeLength: flat.axis.edgeLength,
    movingSide: step.side,
    flatBounds: flat.bounds,
    flatZ0: flat.z0,
  };
}

/** Lower one sheetMetalBend step to a single folded solid. */
export function lowerSheetMetalBend(inp: BendInputs): SheetMetalBendLoweringResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const oc = getOC() as Oc;
  const baseShape = (inp.base.getReplicadShape() as { wrapped: unknown }).wrapped;
  if (!baseShape) {
    diagnostics.push(kernelFailed(
      inp.featureId,
      'sheetMetalBend: could not access the underlying OCCT shape of the input.',
      'Ensure the input Shape has been lowered before chaining .bend().',
    ));
    return { diagnostics };
  }
  let pieces: replicad.Shape3D[];
  try {
    pieces = foldPieces(oc, inp, baseShape);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push(kernelFailed(
      inp.featureId,
      `Folding the sheet at the bend line failed: ${msg}`,
      'OCCT could not split or fold the body at the bend line. Check that the bend line crosses the blank and that the inner radius is >= 0.5 x thickness.',
    ));
    return { diagnostics };
  }
  if (pieces.length < 2) {
    diagnostics.push(kernelFailed(
      inp.featureId,
      '.bend(): the bend line does not cross the sheet — nothing on one side of it to fold.',
      'Put the bend line inside the flat blank, in blank coordinates: { atX: <x> } runs along Y, { atY: <y> } runs along X.',
    ));
    return { diagnostics };
  }
  try {
    const folded = fusePieces(pieces);
    return { shape: new OcctBackend(folded), diagnostics, bendRecord: bendRecordOf(inp) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push(kernelFailed(
      inp.featureId,
      `Fusing the folded flange to the bend arc failed: ${msg}`,
      'OCCT could not join the folded pieces. Try a larger inner radius or a different bend angle.',
    ));
    return { diagnostics };
  }
}

/** Bounding box the bend line is resolved against (the FLAT blank). */
export interface BendBox { min: [number, number, number]; max: [number, number, number] }

/** Derive a bend axis from the FeatureRecord's edge / face input ref. Slice-1
 *  accepts:
 *   - EdgeQuery with `atX: <n>`: axis at x = n on the top face, along Y.
 *   - EdgeQuery with `atY: <n>`: axis at y = n on the top face, along X.
 *   - Canonical face ref (e.g. `{ face: 'top' }`): defaults to the midline of
 *     the long bbox dimension.
 *  Returns undefined + a diagnostic if the ref shape is unsupported. */
export function resolveBendAxis(
  base: { boundingBox(): BendBox },
  edgesRef: unknown,
  faceRef: unknown,
  featureId: FeatureId,
  thickness: number,
): { axis: BendAxisSpec } | { diagnostic: CompilerDiagnostic } {
  const bb = base.boundingBox();
  const zMid = (bb.min[2] + bb.max[2]) / 2;

  // 1. EdgeQuery with atX / atY.
  const fromEdges = resolveEdgeQueryBendAxis(bb, edgesRef, zMid);
  if (fromEdges !== undefined) return { axis: fromEdges };

  // 2. Canonical face ref → default to midline of the longer bbox axis.
  const fromFace = resolveCanonicalFaceBendAxis(bb, faceRef, zMid);
  if (fromFace !== undefined) return { axis: fromFace };

  return { diagnostic: unsupportedBendAxisDiagnostic(featureId, thickness) };
}

function resolveEdgeQueryBendAxis(
  bb: BendBox,
  edgesRef: unknown,
  zMid: number,
): BendAxisSpec | undefined {
  if (edgesRef && typeof edgesRef === 'object') {
    const ref = (edgesRef as { ref?: unknown }).ref ?? edgesRef;
    if (typeof ref === 'object' && ref !== null) {
      const r = ref as { kind?: string; query?: { atX?: number; atY?: number } };
      if (r.kind === 'query' && r.query) {
        if (typeof r.query.atX === 'number' && Number.isFinite(r.query.atX)) {
          const x = r.query.atX;
          return {
            origin: [x, bb.min[1], zMid],
            direction: [0, 1, 0],
            edgeLength: bb.max[1] - bb.min[1],
          };
        }
        if (typeof r.query.atY === 'number' && Number.isFinite(r.query.atY)) {
          const y = r.query.atY;
          return {
            origin: [bb.min[0], y, zMid],
            direction: [1, 0, 0],
            edgeLength: bb.max[0] - bb.min[0],
          };
        }
      }
    }
  }
  return undefined;
}

function resolveCanonicalFaceBendAxis(
  bb: BendBox,
  faceRef: unknown,
  zMid: number,
): BendAxisSpec | undefined {
  if (faceRef && typeof faceRef === 'object') {
    const ref = (faceRef as { ref?: unknown }).ref ?? faceRef;
    if (typeof ref === 'object' && ref !== null) {
      const r = ref as { kind?: string; face?: string };
      if (r.kind === 'canonical' && (r.face === 'top' || r.face === 'bottom')) {
        const w = bb.max[0] - bb.min[0];
        const h = bb.max[1] - bb.min[1];
        if (w >= h) {
          const xMid = (bb.min[0] + bb.max[0]) / 2;
          return {
            origin: [xMid, bb.min[1], zMid],
            direction: [0, 1, 0],
            edgeLength: h,
          };
        } else {
          const yMid = (bb.min[1] + bb.max[1]) / 2;
          return {
            origin: [bb.min[0], yMid, zMid],
            direction: [1, 0, 0],
            edgeLength: w,
          };
        }
      }
    }
  }
  return undefined;
}

function unsupportedBendAxisDiagnostic(
  featureId: FeatureId,
  thickness: number,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.bend.edge-not-linear',
    featureId,
    severity: 'error',
    message: '.bend(): could not derive a bend axis from the selector. Slice-1 supports { atX: <n> }, { atY: <n> }, or { face: "top" | "bottom" }.',
    hint: '.bend() slice-1 selectors: pass an EdgeQuery with atX/atY (e.g. { atX: 50 }) or { face: "top" }. thickness=' + thickness,
  };
}
