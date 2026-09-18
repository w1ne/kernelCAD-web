// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { findRootSheetMetalRecord } from '../../../sheetMetal';
import { lowerSheetMetalBend as bendSheetMetalBody, resolveBendAxis } from '../sheetMetalLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `sheetMetal` — reuses the sketch to extrude pipeline; the record kind
 *  carries the k-factor / sketch plane for `.bend()` and `flattenPattern()`. */
export function lowerSheetMetal(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  // Reuse the sketch→extrude pipeline. Sheet metal differs only in:
  //   (a) the record kind is 'sheetMetal' (threaded for face-label
  //       canonicalization and bend lineage walks);
  //   (b) thickness = depth;
  //   (c) kFactor + sketchPlane carried on metadata for .bend() and
  //       flattenPattern().
  const depth = r.params.thickness.evaluated;
  const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
  if (!sketchInput) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sheetMetal requires an input sketch.`,
      hint: 'Pass a closed path()...close() sketch as the first argument: sheetMetal(sketch, opts).',
    });
    return noShape();
  }
  try {
    shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT extrude failed during sheetMetal lowering: ${msg}`,
      hint: 'sheetMetal lowers via the extrude pipeline. Check for self-intersecting profile or near-zero thickness.',
    });
    return noShape();
  }
  return built(shape);
}

/** `sheetMetalBend` — bends a sheet body about an edge- or face-derived axis. */
export function lowerSheetMetalBend(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sheetMetalBend requires an input named 'base'.`,
      hint: 'Chain .bend() on a sheetMetal(...) Shape.',
    });
    return noShape();
  }
  // Walk lineage backward to find the root sheetMetal record so we can
  // read its kFactor and thickness. If none, emit feature.invalid-args.
  const rootRec = findRootSheetMetalRecord(r, ctx.allRecords ?? []);
  if (!rootRec) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `.bend() only works on Shapes whose lineage roots at sheetMetal(...).`,
      hint: 'Build the body via sheetMetal(sketch, opts), then chain .bend().',
    });
    return noShape();
  }
  const kFactor = rootRec.params.kFactor.evaluated;
  const thickness = rootRec.params.thickness.evaluated;
  // Top-face normal for slice-1 xy-plane bodies is +Z. (We could read
  // metadata.sketchPlane to support xz/yz; slice-1 sheets lower on XY.)
  const topNormal: [number, number, number] = [0, 0, 1];
  // Resolve the bend axis from edges / face inputs.
  const axisResult = resolveBendAxis(
    base,
    r.inputs.edges,
    r.inputs.face,
    r.id,
    thickness,
  );
  if ('diagnostic' in axisResult) {
    ctx.diagnostics.push(axisResult.diagnostic);
    return noShape();
  }
  const result = bendSheetMetalBody({
    featureId: r.id,
    base,
    axis: axisResult.axis,
    topNormal,
    angleDeg: r.params.angle.evaluated,
    radius: r.params.radius.evaluated,
    kFactor,
    thickness,
  });
  ctx.diagnostics.push(...result.diagnostics);
  if (!result.shape) {
    return noShape();
  }
  // Persist the bend record on r.metadata for flattenPattern.
  if (result.bendRecord) {
    const md = (r.metadata ??= {}) as Record<string, unknown>;
    md.bendRecord = result.bendRecord;
  }
  const shape: ShapeBackend = result.shape;
  return built(shape);
}
