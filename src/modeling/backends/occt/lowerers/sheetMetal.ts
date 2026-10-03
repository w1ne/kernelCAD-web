// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
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
      ...invalidArgsText({
        api: 'sheetMetal(profile, opts)',
        path: 'profile',
        gotText: 'no sketch input',
        requires:
          'a closed sketch as the FIRST argument — build it with path()...close(); the flat blank outline is what gets thickened',
        example:
          "sheetMetal(path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 0.42 })",
      }),
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
      ...invalidArgsText({
        api: 'bend(edgeRef, angle, radius)',
        path: 'inputs.base',
        gotText: 'no base shape',
        requires: 'a Shape returned by sheetMetal(...) to chain onto',
        example: "blank.bend({ face: 'right' }, 90, 1.5)",
      }),
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
      ...invalidArgsText({
        api: 'bend(edgeRef, angle, radius)',
        path: 'the receiving Shape',
        gotText: 'a Shape whose lineage does not root at sheetMetal(...)',
        requires:
          'a sheet-metal body — .bend() reads thickness and kFactor from the root sheetMetal(...) record, so build the blank with sheetMetal(profile, { thickness, kFactor }) first; a box or extrude cannot be bent',
        example:
          "sheetMetal(profile, { thickness: 1.5, kFactor: 0.42 }).bend({ face: 'right' }, 90, 1.5)",
      }),
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
