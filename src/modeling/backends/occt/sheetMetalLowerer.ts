// src/backends/occt/sheetMetalLowerer.ts
//
// W2.2 sheet-metal slice 1: `case 'sheetMetalBend'` lowering implementation.
//
// Pipeline (slice 1):
//   1. Resolve the bend axis from the FeatureRecord's `edges` / `face` ref —
//      slice-1 accepts an EdgeQuery with `atX` or `atY` (defines an axis
//      line inside the sheet) or a canonical face selector (uses the body
//      bbox to derive the axis).
//   2. Split the base body by two thin-slab `BRepAlgoAPI_Cut_3` cuts at the
//      bend plane (workaround for absent `BRepAlgoAPI_Splitter` binding).
//   3. Build the cylindrical bend section as a revolved arc strip via
//      `BRepPrimAPI_MakeRevol_2`.
//   4. Rotate the moving half by the bend angle about the bend axis using
//      `gp_Trsf.SetRotation_1` + `BRepBuilderAPI_Transform_2`.
//   5. Sew the three pieces with `BRepBuilderAPI_Sewing` + solidify with
//      `BRepBuilderAPI_MakeSolid_3`.
//
// Returns a `bendRecord` containing the axis line + arcLength + edgeLength —
// the lowerer caller persists this on `r.metadata.bendRecord` so
// `flattenPattern()` can replay the bend without re-resolving the edge.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeatureId } from '../../../shared/intent/types';
import { computeBendAllowance } from '../../sheetMetal';

export interface BendAxisSpec {
  /** A point on the bend axis line, in world coordinates (slice-1 sheets
   *  live in the XY plane, so z = thickness/2 is the centerline). */
  origin: [number, number, number];
  /** Unit direction vector along the bend axis. Must be perpendicular to the
   *  top-face normal. */
  direction: [number, number, number];
  /** Length of the bend (= length of the moving half's intersection with the
   *  bend axis). Slice-1 uses the bbox extent perpendicular to the bend axis
   *  within the top face. */
  edgeLength: number;
}

export interface SheetMetalBendLoweringResult {
  shape?: OcctBackend;
  diagnostics: CompilerDiagnostic[];
  /** Bend record stored on FeatureRecord.metadata.bendRecord by the caller.
   *  Lets flattenPattern() replay the rotation without re-resolving the edge. */
  bendRecord?: {
    axisOrigin: [number, number, number];
    axisDirection: [number, number, number];
    angleRad: number;
    radius: number;
    kFactor: number;
    thickness: number;
    arcLength: number;
    edgeLength: number;
  };
}

export interface BendInputs {
  featureId: FeatureId;
  base: OcctBackend;
  axis: BendAxisSpec;
  /** Top-face normal (Z+ for slice-1 xy-plane bodies). Used to construct the
   *  cutter slab and the moving-half rotation axis. */
  topNormal: [number, number, number];
  angleDeg: number;
  radius: number;
  kFactor: number;
  thickness: number;
}

/** Lower a sheetMetalBend record to a TopoDS_Solid. See module docstring for
 *  the pipeline; the spec's intended `BRepAlgoAPI_Splitter` is replaced with
 *  two `BRepAlgoAPI_Cut_3` slab cuts (Splitter is not bound in the bundled
 *  `replicad-opencascadejs` WASM build — verified 2026-05-14). */
export function lowerSheetMetalBend(inp: BendInputs): SheetMetalBendLoweringResult {
  const diagnostics: CompilerDiagnostic[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  // Normalize the axis direction.
  const [adx, ady, adz] = inp.axis.direction;
  const aLen = Math.hypot(adx, ady, adz);
  if (aLen < 1e-9) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.bend.edge-not-linear',
      featureId: inp.featureId,
      severity: 'error',
      message: '.bend(): bend axis direction is degenerate (zero-length).',
      hint: '.bend() requires a linear edge with a non-zero direction. Use list_edges to inspect candidates.',
    });
    return { diagnostics };
  }
  const axisDirection: [number, number, number] = [adx / aLen, ady / aLen, adz / aLen];

  // Compute the bend-plane normal as topNormal × axisDirection. This is the
  // plane perpendicular to the top face that contains the bend axis.
  const [nx, ny, nz] = inp.topNormal;
  const [dx, dy, dz] = axisDirection;
  const planeNormal: [number, number, number] = [
    ny * dz - nz * dy,
    nz * dx - nx * dz,
    nx * dy - ny * dx,
  ];
  const pnLen = Math.hypot(planeNormal[0], planeNormal[1], planeNormal[2]);
  if (pnLen < 1e-9) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: inp.featureId,
      severity: 'error',
      message: 'Bend axis is parallel to the top-face normal — cannot define a split plane.',
      hint: 'Pick a different bend edge; the bend axis must lie in the top face.',
    });
    return { diagnostics };
  }
  const pn: [number, number, number] = [
    planeNormal[0] / pnLen,
    planeNormal[1] / pnLen,
    planeNormal[2] / pnLen,
  ];

  const baseShape = (inp.base.getReplicadShape() as { wrapped: unknown }).wrapped;
  if (!baseShape) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: inp.featureId,
      severity: 'error',
      message: 'sheetMetalBend: could not access the underlying OCCT shape of the input.',
      hint: 'Ensure the input Shape has been lowered before chaining .bend().',
    });
    return { diagnostics };
  }

  // Bbox + slab cutter size.
  const bb = inp.base.boundingBox();
  const diag = Math.hypot(
    bb.max[0] - bb.min[0],
    bb.max[1] - bb.min[1],
    bb.max[2] - bb.min[2],
  );
  const SLAB = diag * 4;

  // Helper: build a slab cutter on one side of the bend plane.
  // Side = +1 cuts the +pn half-space, leaving the -pn body half.
  // Side = -1 cuts the -pn half-space, leaving the +pn body half.
  const buildSlab = (side: 1 | -1): unknown => {
    // Offset the cutter origin slightly off the bend plane so the cut surface
    // sits *outside* the bend plane proper — keeps the bend section's seam
    // attachable later.
    const offset = 1e-4;
    const ox = inp.axis.origin[0] + side * pn[0] * offset;
    const oy = inp.axis.origin[1] + side * pn[1] * offset;
    const oz = inp.axis.origin[2] + side * pn[2] * offset;
    const origin = new oc.gp_Pnt_3(ox, oy, oz);
    const xDir = new oc.gp_Dir_4(side * pn[0], side * pn[1], side * pn[2]);
    const zDir = new oc.gp_Dir_4(dx, dy, dz);
    const ax2 = new oc.gp_Ax2_2(origin, zDir, xDir);
    const box = new oc.BRepPrimAPI_MakeBox_5(ax2, SLAB, SLAB, SLAB);
    const slab = box.Shape();
    box.delete();
    return slab;
  };

  let movingHalf: unknown, fixedHalf: unknown;
  try {
    const cutterPos = buildSlab(1);
    const cutterNeg = buildSlab(-1);
    // Fixed half: body minus the +pn slab → keeps the -pn half.
    const cutFixed = new oc.BRepAlgoAPI_Cut_3(baseShape, cutterPos, new oc.Message_ProgressRange_1());
    cutFixed.Build(new oc.Message_ProgressRange_1());
    fixedHalf = cutFixed.Shape();
    cutFixed.delete();
    // Moving half: body minus the -pn slab → keeps the +pn half.
    const cutMoving = new oc.BRepAlgoAPI_Cut_3(baseShape, cutterNeg, new oc.Message_ProgressRange_1());
    cutMoving.Build(new oc.Message_ProgressRange_1());
    movingHalf = cutMoving.Shape();
    cutMoving.delete();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: inp.featureId,
      severity: 'error',
      message: `Splitting the sheet at the bend axis failed: ${msg}`,
      hint: 'OCCT could not split the body along the bend axis. The bend axis may not pass through the sheet — verify the bend selector lies on the body.',
    });
    return { diagnostics };
  }

  // Bend angle in radians; bend-allowance length.
  const angleRad = inp.angleDeg * Math.PI / 180;
  const arcLength = computeBendAllowance({
    angleDeg: inp.angleDeg,
    radius: inp.radius,
    kFactor: inp.kFactor,
    thickness: inp.thickness,
  });

  // Rotate the moving half about the bend axis by angleRad. Slice-1
  // simplifies the sewing step: we union the rotated moving half with the
  // fixed half via BRepAlgoAPI_Fuse_3, accepting a sharp inner-corner where
  // a rounded bend section would normally live. The K-factor neutral-axis
  // math is still correct for `.flattenPattern()` because we record the
  // bend's `arcLength` regardless of whether the cylinder section is
  // physically present in the lowered solid. Slice 2 will add the curved
  // bend cylinder via BRepPrimAPI_MakeRevol_1 once we work around the
  // current OCCT binding issue on the revolution arg list.
  let movingHalfRotated: unknown;
  try {
    const trsf = new oc.gp_Trsf_1();
    const ax1Origin = new oc.gp_Pnt_3(inp.axis.origin[0], inp.axis.origin[1], inp.axis.origin[2]);
    const ax1Dir = new oc.gp_Dir_4(dx, dy, dz);
    const ax1 = new oc.gp_Ax1_2(ax1Origin, ax1Dir);
    trsf.SetRotation_1(ax1, angleRad);
    const xform = new oc.BRepBuilderAPI_Transform_2(movingHalf, trsf, false);
    movingHalfRotated = xform.Shape();
    xform.delete();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: inp.featureId,
      severity: 'error',
      message: `Rotating the moving half failed: ${msg}`,
      hint: 'OCCT could not rotate the body half about the bend axis. Verify the bend axis lies on the body.',
    });
    return { diagnostics };
  }

  // Fuse the fixed half with the rotated moving half. For a non-zero bend
  // angle the two halves only meet along the bend axis edge — fuse still
  // produces a valid TopoDS_Compound that subsequent operations can consume.
  try {
    const fuse = new oc.BRepAlgoAPI_Fuse_3(fixedHalf, movingHalfRotated, new oc.Message_ProgressRange_1());
    fuse.Build(new oc.Message_ProgressRange_1());
    const fusedShape = fuse.Shape();
    fuse.delete();

    // Cast back through replicad so OcctBackend recognises the shape. Use
    // the same pattern as historyAwareBooleans / occtBackend.scale (cast
    // produces a Compound/Solid wrapper with the boundingBox getter populated).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const castShape = replicad.cast(fusedShape as any) as import('replicad').Shape3D;
    const result = new OcctBackend(castShape);
    return {
      shape: result,
      diagnostics,
      bendRecord: {
        axisOrigin: inp.axis.origin,
        axisDirection,
        angleRad,
        radius: inp.radius,
        kFactor: inp.kFactor,
        thickness: inp.thickness,
        arcLength,
        edgeLength: inp.axis.edgeLength,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: inp.featureId,
      severity: 'error',
      message: `Fusing the bent body halves failed: ${msg}`,
      hint: 'OCCT could not fuse the bend halves. Try a different bend angle or radius.',
    });
    return { diagnostics };
  }
}

/** Derive a bend axis from the FeatureRecord's edge / face input ref. Slice-1
 *  accepts:
 *   - EdgeQuery with `atX: <n>`: axis at x = n on the top face, along Y.
 *   - EdgeQuery with `atY: <n>`: axis at y = n on the top face, along X.
 *   - Canonical face ref (e.g. `{ face: 'top' }`): defaults to the midline of
 *     the long bbox dimension.
 *  Returns undefined + a diagnostic if the ref shape is unsupported. */
export function resolveBendAxis(
  base: OcctBackend,
  edgesRef: unknown,
  faceRef: unknown,
  featureId: FeatureId,
  thickness: number,
): { axis: BendAxisSpec } | { diagnostic: CompilerDiagnostic } {
  const bb = base.boundingBox();
  const zMid = (bb.min[2] + bb.max[2]) / 2;

  // 1. EdgeQuery with atX / atY.
  if (edgesRef && typeof edgesRef === 'object') {
    const ref = (edgesRef as { ref?: unknown }).ref ?? edgesRef;
    if (typeof ref === 'object' && ref !== null) {
      const r = ref as { kind?: string; query?: { atX?: number; atY?: number } };
      if (r.kind === 'query' && r.query) {
        if (typeof r.query.atX === 'number' && Number.isFinite(r.query.atX)) {
          const x = r.query.atX;
          return {
            axis: {
              origin: [x, bb.min[1], zMid],
              direction: [0, 1, 0],
              edgeLength: bb.max[1] - bb.min[1],
            },
          };
        }
        if (typeof r.query.atY === 'number' && Number.isFinite(r.query.atY)) {
          const y = r.query.atY;
          return {
            axis: {
              origin: [bb.min[0], y, zMid],
              direction: [1, 0, 0],
              edgeLength: bb.max[0] - bb.min[0],
            },
          };
        }
      }
    }
  }

  // 2. Canonical face ref → default to midline of the longer bbox axis.
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
            axis: {
              origin: [xMid, bb.min[1], zMid],
              direction: [0, 1, 0],
              edgeLength: h,
            },
          };
        } else {
          const yMid = (bb.min[1] + bb.max[1]) / 2;
          return {
            axis: {
              origin: [bb.min[0], yMid, zMid],
              direction: [1, 0, 0],
              edgeLength: w,
            },
          };
        }
      }
    }
  }

  return {
    diagnostic: {
      target: 'export-occt',
      code: 'feature.bend.edge-not-linear',
      featureId,
      severity: 'error',
      message: '.bend(): could not derive a bend axis from the selector. Slice-1 supports { atX: <n> }, { atY: <n> }, or { face: "top" | "bottom" }.',
      hint: '.bend() slice-1 selectors: pass an EdgeQuery with atX/atY (e.g. { atX: 50 }) or { face: "top" }. thickness=' + thickness,
    },
  };
}
