// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runMcpScript } from '../runMcpScript';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';

export interface InspectNurbsInput { file?: string; code?: string; feature_id?: string }

function decomposeKnots(flat: number[]): { knots: number[]; multiplicities: number[] } {
  const knots: number[] = [];
  const multiplicities: number[] = [];
  for (const knot of flat) {
    const last = knots.length - 1;
    if (last >= 0 && knots[last] === knot) multiplicities[last] = (multiplicities[last] ?? 0) + 1;
    else { knots.push(knot); multiplicities.push(1); }
  }
  return { knots, multiplicities };
}

/** Read captured NURBS data. `rational` follows OCCT IsRational semantics;
 * `uniformWeights` tracks equal weights; `hasNonUnitWeights` tracks literal
 * weights even when a common scale cancels. */
export async function inspectNurbsTool(input: InspectNurbsInput) {
  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, error: script.error, errorCode: script.errorCode };
  const records = script.run.records.filter(record => record.kind === 'curve3d' && record.metadata?.curve3d);
  const target = input.feature_id === undefined
    ? records.at(-1)
    : records.find(record => record.id === input.feature_id);
  if (!target) return {
    ok: false,
    error: input.feature_id ? `No captured NURBS curve feature '${input.feature_id}'.` : 'The script has no captured NURBS curve feature.',
    errorCode: 'nurbs.inspect.not-found',
    hint: 'This first version reads nurbsCurve/spline3d feature definitions. Geometry-derived edge and face extraction is not available.',
  };
  const data = target.metadata?.curve3d as Curve3DMetadata;
  const flat = data.knots ?? [];
  const { knots, multiplicities } = decomposeKnots(flat);
  const domain = flat.length ? [flat[data.degree]!, flat[data.controlPoints.length]!] : [0, 1];
  const weights = data.weights ?? data.controlPoints.map(() => 1);
  // A common scale on every weight cancels from the homogeneous quotient.
  const rational = weights.some(weight => weight !== weights[0]);
  const uniformWeights = weights.every(weight => weight === weights[0]);
  const hasNonUnitWeights = weights.some(weight => weight !== 1);
  return {
    ok: true,
    feature_id: target.id,
    entity: 'curve',
    representation: 'captured-nurbs-definition',
    degree: data.degree,
    knots,
    multiplicities,
    poles: data.controlPoints,
    weights,
    rational,
    uniformWeights,
    hasNonUnitWeights,
    parameter_range: domain,
    closed: data.closed ?? false,
    limitations: ['Reads the captured authored NURBS definition; it does not extract the exact post-operation B-rep edge curve. Surface records, geometry-picked edges/faces, and blends are not included.'],
  };
}
