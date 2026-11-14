// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Second leg of `.chamfer(distance, edges, { distance2 | angleDeg, face })`:
// read the leg from the record, resolve the reference face, and refuse a
// face that does not border every selected edge.
import type { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../../kernel/backends/occt/edgeSelection';
import { edgesNotOnFace, type EdgeRefForFilleting } from '../../../../kernel/backends/occt/historyAwareEdgeFeatures';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText, type InvalidArgsSpec } from '../../../../shared/intent/invalidArgs';
import type { LowerContext } from './context';

/** Asymmetric leg of a chamfer op. `distance2Ratio` is distance2 / distance,
 *  so the max-feasible probe scales both legs together. */
export interface ChamferLegOp {
  face: unknown;
  distance2Ratio?: number;
  angleDeg?: number;
}

const API = 'chamfer(distance, edges, { distance2 | angleDeg, face })';
const EXAMPLE = "box(40, 30, 10).chamfer(2, 'top', { distance2: 5 })";

function refuse(ctx: LowerContext, r: FeatureRecord, spec: Omit<InvalidArgsSpec, 'api' | 'example'>): 'refused' {
  ctx.diagnostics.push({
    target: 'export-occt',
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    ...invalidArgsText({ api: API, example: EXAMPLE, ...spec }),
  });
  return 'refused';
}

function referenceFace(ctx: LowerContext, r: FeatureRecord, base: OcctBackend): unknown {
  // pickFace reads `inputs.face`; hand it the reference face in that slot.
  const probe: FeatureRecord = { ...r, inputs: { base: r.inputs.base, face: r.inputs.referenceFace } };
  const face = pickFace(probe, base, ctx.allRecords);
  if ('error' in face) {
    ctx.diagnostics.push(face.error);
    return undefined;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (face as any).wrapped;
}

/**
 * The asymmetric leg of chamfer record `r`: `undefined` for a symmetric
 * chamfer, `'refused'` when the leg is invalid (a diagnostic is pushed and
 * nothing may be applied).
 */
export function resolveChamferLegs(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend,
  edges: readonly EdgeRefForFilleting[],
  distance: number,
): ChamferLegOp | undefined | 'refused' {
  const distance2 = r.params.distance2?.evaluated;
  const angleDeg = r.params.angle?.evaluated;
  if (distance2 === undefined && angleDeg === undefined) return undefined;
  if (distance2 !== undefined && !(Number.isFinite(distance2) && distance2 > 0)) {
    return refuse(ctx, r, {
      path: 'opts.distance2', got: distance2, unit: 'mm',
      requires: 'a finite number > 0 — the bevel leg on the face opposite the reference face',
    });
  }
  if (angleDeg !== undefined && !(angleDeg > 0 && angleDeg < 90)) {
    return refuse(ctx, r, {
      path: 'opts.angleDeg', got: angleDeg, unit: 'deg',
      requires: 'a number in (0, 90) — the angle between the bevel and the reference face',
    });
  }
  const face = referenceFace(ctx, r, base);
  if (face === undefined) return 'refused';
  const stray = edgesNotOnFace(face, edges);
  if (stray.length > 0) {
    return refuse(ctx, r, {
      path: 'opts.face',
      gotText: `a face that does not border ${stray.length} of the ${edges.length} selected edges`,
      requires: 'a reference face adjacent to every chamfered edge — `distance` is measured on that face',
    });
  }
  return distance2 !== undefined ? { face, distance2Ratio: distance2 / distance } : { face, angleDeg };
}
