// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/verify.ts
//
// Stage 7: evaluate the emitted script and check it against the drawing it
// came from.
//
//   extents     — exact OCCT bbox of the result vs the solved extents (which
//                 are the stated dimensions wherever the drawing states them);
//   holes       — cylindrical holes detected on the result vs the holes read
//                 off the sheet, diameters paired in sorted order;
//   silhouettes — the result is re-projected through the svg-drawing
//                 exporter's own view stage (same cameras, same HLR line
//                 classes) and each view's outer silhouette is compared, as
//                 filled area (IoU), with the drawn silhouette of that view
//                 mapped through the dimension snap.
//
// The verdict is what an agent branches on: `match` means every check is
// inside tolerance, `partial` means the shape is right but something (a hole,
// a secondary silhouette) is off, `mismatch` means the rebuild is wrong.

import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { detectCylindricalHoles } from '../../kernel/backends/occt/holeDetection';
import { projectDrawingViews } from '../../kernel/backends/occt/exportSvgDrawing';
import { resolveRootId } from '../../composition/buildModel';
import { runMcpScript } from '../mcp/runMcpScript';
import { outerBoundary, polylineSegments, silhouetteIoU, type P2, type Seg2 } from './geometry2d';
import type { PartModel, ViewGeometry } from './reconstruct';
import type { ModelAxis, OrthoViewName } from './views';

export type FidelityVerdict = 'match' | 'partial' | 'mismatch' | 'failed';

export interface FidelityReport {
  verdict: FidelityVerdict;
  extents: Record<ModelAxis, { expected: number; actual: number; delta: number }>;
  holes: { expected: number[]; actual: number[]; maxDiameterDelta: number };
  silhouettes: Array<{ view: OrthoViewName; iou: number }>;
  reasons: string[];
  /** Evaluation error, when the script did not build. */
  error?: string;
}

export const EXTENT_TOL_MM = 0.1;
export const HOLE_TOL_MM = 0.1;
export const SILHOUETTE_MATCH_IOU = 0.97;

const AXES: readonly ModelAxis[] = ['x', 'y', 'z'];
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Re-projected view → model-axis coordinates. Cameras per drawingProjection.ts. */
const CAMERA_AXES: Record<'front' | 'top' | 'left', { u: ModelAxis; v: ModelAxis; flipU: boolean }> = {
  front: { u: 'x', v: 'z', flipU: false },
  top: { u: 'x', v: 'y', flipU: false },
  left: { u: 'y', v: 'z', flipU: true }, // screen-right is −Y
};

function normalise(loop: readonly P2[]): P2[] {
  if (loop.length === 0) return [];
  const x0 = Math.min(...loop.map(p => p[0]));
  const y0 = Math.min(...loop.map(p => p[1]));
  return loop.map(p => [p[0] - x0, p[1] - y0]);
}

function emptyFidelityReport(model: PartModel, error: string): FidelityReport {
  return {
    verdict: 'failed',
    extents: Object.fromEntries(AXES.map(a => [a, { expected: model.extents[a], actual: 0, delta: model.extents[a] }])) as FidelityReport['extents'],
    holes: { expected: [], actual: [], maxDiameterDelta: 0 },
    silhouettes: [],
    reasons: [error],
    error,
  };
}

/** Run the emitted script and lower its returned root to a solid. */
async function lowerScriptShape(script: string): Promise<{ shape: OcctBackend } | { error: string }> {
  const run = await runMcpScript({ code: script, file: 'drawing_to_cad.kcad.ts' });
  if (!run.ok) return { error: `the emitted script did not run: ${run.error}` };
  const engine = new RecomputeEngine(createOcctLowerer(run.run.session));
  const lowered = await engine.run(run.run.records, { paramTable: run.run.paramTable });
  const fatal = lowered.diagnostics.find(d => d.severity === 'error');
  if (fatal) return { error: `the emitted script failed to build: ${fatal.code} — ${fatal.message}` };
  const tail = run.run.records.length > 0 ? run.run.records[run.run.records.length - 1].id : undefined;
  const rootId = resolveRootId(run.run.returnValue, tail);
  const shape = rootId !== undefined ? lowered.shapes.get(rootId) : undefined;
  if (!(shape instanceof OcctBackend)) return { error: 'the emitted script did not return a solid.' };
  return { shape };
}

/** Exact bbox of the rebuild vs the solved extents, appending mismatches. */
function measureExtents(
  shape: OcctBackend,
  model: PartModel,
  reasons: string[],
): FidelityReport['extents'] {
  const bb = shape.boundingBox({ exact: true });
  const extents = {} as FidelityReport['extents'];
  AXES.forEach((a, i) => {
    const actual = round3(bb.max[i] - bb.min[i]);
    const expected = round3(model.extents[a]);
    extents[a] = { expected, actual, delta: round3(actual - expected) };
    if (Math.abs(actual - expected) > EXTENT_TOL_MM) {
      reasons.push(`${a.toUpperCase()} extent is ${actual} mm, the drawing states ${expected} mm.`);
    }
  });
  return extents;
}

/** Cylindrical holes detected on the result vs the holes read off the sheet. */
function checkHoles(
  shape: OcctBackend,
  model: PartModel,
  reasons: string[],
): { expectedHoles: number[]; actualHoles: number[]; maxDiameterDelta: number } {
  let actualHoles: number[] = [];
  try {
    actualHoles = detectCylindricalHoles(shape).map(h => round3(h.diameterMm)).sort((p, q) => p - q);
  } catch {
    actualHoles = [];
  }
  const expectedHoles = model.holes.map(h => round3(h.diameter.v)).sort((p, q) => p - q);
  let maxDiameterDelta = 0;
  if (actualHoles.length !== expectedHoles.length) {
    reasons.push(`${actualHoles.length} hole(s) detected on the result, ${expectedHoles.length} read off the drawing.`);
  }
  for (let i = 0; i < Math.min(actualHoles.length, expectedHoles.length); i++) {
    maxDiameterDelta = Math.max(maxDiameterDelta, Math.abs(actualHoles[i] - expectedHoles[i]));
  }
  maxDiameterDelta = round3(maxDiameterDelta);
  if (maxDiameterDelta > HOLE_TOL_MM) reasons.push(`hole diameters differ by up to ${maxDiameterDelta} mm.`);
  return { expectedHoles, actualHoles, maxDiameterDelta };
}

/** Re-project each view's outer silhouette and compare by filled-area IoU. */
function compareSilhouettes(
  shape: OcctBackend,
  geometry: readonly ViewGeometry[],
  snap: (axis: ModelAxis, measured: number) => number,
  reasons: string[],
): FidelityReport['silhouettes'] {
  const silhouettes: FidelityReport['silhouettes'] = [];
  let projected: ReturnType<typeof projectDrawingViews> | null = null;
  try {
    projected = projectDrawingViews(shape.getReplicadShape(), ['front', 'top', 'left']);
  } catch (e) {
    reasons.push(`re-projection failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (projected) {
    const tol = 0.02;
    for (const g of geometry) {
      if (g.outline.length < 3) continue;
      // Right / bottom views carry the same silhouette as left / top.
      const cam = g.view.name === 'right' ? 'left' : g.view.name === 'bottom' ? 'top' : g.view.name;
      const axes = CAMERA_AXES[cam];
      const pv = projected[cam];
      const segs: Seg2[] = [...pv.visible, ...pv.tangent].flatMap(pl =>
        polylineSegments(pl.map(([x, y]) => [axes.flipU ? -x : x, y] as P2)),
      );
      const reprojected = normalise(outerBoundary(segs, tol));
      // The drawn silhouette, mapped through the dimension snap per axis.
      const drawn = normalise(g.outline.map(([u, v]) => [snap(g.view.u.axis, u), snap(g.view.v.axis, v)] as P2));
      // Align axis order: both are (u-axis, v-axis) in model terms.
      const iou = Math.round(silhouetteIoU({ outer: drawn }, { outer: reprojected }) * 1000) / 1000;
      silhouettes.push({ view: g.view.name, iou });
      if (iou < SILHOUETTE_MATCH_IOU) reasons.push(`${g.view.name} silhouette overlaps the drawing by ${iou} (IoU).`);
    }
  }
  return silhouettes;
}

export async function verifyReconstruction(
  script: string,
  model: PartModel,
  geometry: readonly ViewGeometry[],
  snap: (axis: ModelAxis, measured: number) => number,
): Promise<FidelityReport> {
  const lowered = await lowerScriptShape(script);
  if ('error' in lowered) return emptyFidelityReport(model, lowered.error);
  const shape = lowered.shape;

  const reasons: string[] = [];
  const extents = measureExtents(shape, model, reasons);
  const { expectedHoles, actualHoles, maxDiameterDelta } = checkHoles(shape, model, reasons);
  const silhouettes = compareSilhouettes(shape, geometry, snap, reasons);

  const extentOk = AXES.every(a => Math.abs(extents[a].delta) <= EXTENT_TOL_MM);
  const holesOk = actualHoles.length === expectedHoles.length && maxDiameterDelta <= HOLE_TOL_MM;
  const minIoU = silhouettes.length ? Math.min(...silhouettes.map(s => s.iou)) : 0;
  let verdict: FidelityVerdict;
  if (extentOk && holesOk && minIoU >= SILHOUETTE_MATCH_IOU) verdict = 'match';
  else if (AXES.every(a => Math.abs(extents[a].delta) <= 5 * EXTENT_TOL_MM) && minIoU >= 0.9) verdict = 'partial';
  else verdict = 'mismatch';

  return {
    verdict,
    extents,
    holes: { expected: expectedHoles, actual: actualHoles, maxDiameterDelta },
    silhouettes,
    reasons,
  };
}
