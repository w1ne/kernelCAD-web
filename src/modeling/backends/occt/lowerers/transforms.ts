// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { LowerResult, ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { MeshBackend } from '../../../../kernel/backends/meshBackend';
import { propagateEdgeTransformHistory, propagateTransformHistory } from '../../../../kernel/naming/evolutionRecord';
import type { FaceHash, EdgeHash } from '../../../../kernel/naming/evolutionRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { Param } from '../../../../shared/intent/types';
import { isValidPlaneSpec } from '../../../../shared/intent/types';
import type { Vec3 } from '../../../../shared/intent/types';
import type { LowerContext, LowerOutcome } from './context';
import { absurdGeometryDiagnostic } from '../featureSanity';

export function resolvedScaleFactor(value: number | Param): number {
  return typeof value === 'number' ? value : value.evaluated;
}

/**
 * Apply the record's post-hoc `transforms` in declared order, propagating the
 * face-lineage historyMap through each step. Shared tail of every non-terminal
 * lowering; terminal outcomes (virtual records, SceneBackends, error fallbacks)
 * never reach it.
 */
/** Rigid/scale transforms on a display-only mesh body (no face history). */
function applyMeshTransform(shape: MeshBackend, t: FeatureRecord['transforms'][number]): ShapeBackend {
  switch (t.op) {
    case 'translate': return shape.translate(t.vec.x.evaluated, t.vec.y.evaluated, t.vec.z.evaluated);
    case 'rotateAxis': return shape.rotate([t.axis.x.evaluated, t.axis.y.evaluated, t.axis.z.evaluated], t.degrees.evaluated, t.pivot ? [t.pivot.x.evaluated, t.pivot.y.evaluated, t.pivot.z.evaluated] : undefined);
    case 'scale': return shape.scale([resolvedScaleFactor(t.sx), resolvedScaleFactor(t.sy), resolvedScaleFactor(t.sz)]);
    case 'reflect': throw new Error('Display mesh bodies do not support reflect; convert to BRep explicitly when solid operations are needed.');
  }
  return shape;
}

function resolvePositiveScaleFactors(
  ctx: LowerContext,
  r: FeatureRecord,
  t: Extract<FeatureRecord['transforms'][number], { op: 'scale' }>,
): [number, number, number] | null {
  const sx = resolvedScaleFactor(t.sx);
  const sy = resolvedScaleFactor(t.sy);
  const sz = resolvedScaleFactor(t.sz);
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz) || sx <= 0 || sy <= 0 || sz <= 0) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `scale transform has non-positive or non-finite factors: ${JSON.stringify([sx, sy, sz])}.`,
      hint: 'Scale factors must be positive finite numbers; check the param values and their declared min/max bounds.',
    });
    return null;
  }
  return [sx, sy, sz];
}

function carryTransformHistory(
  shape: ShapeBackend,
  inputHashes: readonly FaceHash[],
  inputMap: NonNullable<OcctBackend['historyMap']>,
  inputEdgeHashes: readonly EdgeHash[],
  inputEdgeMap: OcctBackend['edgeHistoryMap'],
): ShapeBackend {
  const outputBackend = shape as OcctBackend;
  const outputHashes = outputBackend.faceHashes();
  if (outputHashes.length !== inputHashes.length) {
    // defensive path — face count mismatch (unexpected for these ops).
    // Leave shape without historyMap; resolver returns face-ref-not-resolvable.
    return shape;
  }
  const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (outputBackend.getReplicadShape() as any);
  const carried = new OcctBackend(wrapped, undefined, newMap);
  if (outputBackend.analysisBody !== undefined) carried.analysisBody = outputBackend.analysisBody;
  const outputEdgeHashes = carried.edgeHashes();
  if (inputEdgeMap && outputEdgeHashes.length === inputEdgeHashes.length) {
    carried.edgeHistoryMap = propagateEdgeTransformHistory(inputEdgeMap, inputEdgeHashes, outputEdgeHashes);
  }
  return carried;
}

export function applyTransforms(
  ctx: LowerContext,
  input: ShapeBackend,
  r: FeatureRecord,
): ShapeBackend {
  let shape = input;
  for (const t of r.transforms) {
    if (shape instanceof MeshBackend) {
      if (t.op === 'scale' && resolvePositiveScaleFactors(ctx, r, t) === null) {
        continue;
      }
      shape = applyMeshTransform(shape, t);
      continue;
    }
    const inputBackend = shape as OcctBackend;
    const inputHashes = inputBackend.faceHashes();
    const inputMap = inputBackend.historyMap;
    const inputEdgeHashes = inputBackend.edgeHashes();
    const inputEdgeMap = inputBackend.edgeHistoryMap;
    switch (t.op) {
      case 'translate':
        shape = shape.translate(t.vec.x.evaluated, t.vec.y.evaluated, t.vec.z.evaluated);
        break;
      case 'rotateAxis': {
        const ax: Vec3 = [t.axis.x.evaluated, t.axis.y.evaluated, t.axis.z.evaluated];
        const pv: Vec3 | undefined = t.pivot
          ? [t.pivot.x.evaluated, t.pivot.y.evaluated, t.pivot.z.evaluated]
          : undefined;
        shape = shape.rotate(ax, t.degrees.evaluated, pv);
        break;
      }
      case 'scale': {
        const factors = resolvePositiveScaleFactors(ctx, r, t);
        if (factors === null) break; // skip applying the transform; preserve the prior shape
        shape = shape.scale(factors);
        break;
      }
      case 'reflect':
        if (!isValidPlaneSpec(t.plane)) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `reflect transform has invalid plane spec: ${JSON.stringify(t.plane)}.`,
            hint: "Reflect plane must be 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number }.",
          });
          break; // skip applying the transform; preserve the prior shape
        }
        shape = (shape as OcctBackend).reflect(t.plane);
        break;
    }
    // Propagate historyMap if input had one. All four transform ops (translate,
    // rotateAxis, scale, reflect) preserve topology (face count invariant).
    if (inputMap !== undefined) {
      shape = carryTransformHistory(shape, inputHashes, inputMap, inputEdgeHashes, inputEdgeMap);
    }
  }
  return shape;
}

/**
 * Part `at` is not a feature transform, but `OcctBackend.translate` drops
 * `historyMap`. Remap face hashes the same way {@link applyTransforms} does
 * so a later canonical pick still names the authored face. A face-count
 * mismatch leaves the solid without lineage; callers must fail that pick
 * instead of accepting the world-bbox plane.
 */
export function translatePreservingLineage(
  shape: ShapeBackend,
  tx: number,
  ty: number,
  tz: number,
): ShapeBackend {
  if (!(shape instanceof OcctBackend) || shape.historyMap === undefined) {
    return shape.translate(tx, ty, tz);
  }
  const inputHashes = shape.faceHashes();
  const moved = shape.translate(tx, ty, tz);
  const outputHashes = moved.faceHashes();
  if (outputHashes.length !== inputHashes.length) return moved;
  const lineage = propagateTransformHistory(shape.historyMap, inputHashes, outputHashes);
  const carried = new OcctBackend(moved.getReplicadShape(), undefined, lineage);
  if (moved.analysisBody !== undefined) carried.analysisBody = moved.analysisBody;
  return carried;
}

/**
 * Turn a per-kind lowerer's outcome into the `LowerResult` `lower()` returns.
 * Terminal outcomes pass straight through (they historically `return`ed out of
 * the switch, skipping the transform loop); everything else gets `r.transforms`.
 */
export function finishLowering(
  ctx: LowerContext,
  r: FeatureRecord,
  out: LowerOutcome,
): LowerResult {
  if (out.done === true) return { shape: out.shape, diagnostics: ctx.diagnostics };
  // Post-feature sanity gate, before the record's own transforms (a translate
  // legitimately moves the result away from its inputs). Fail closed: an
  // absurd result never flows downstream as a valid solid.
  const absurd = absurdGeometryDiagnostic(r, out.shape, Object.values(ctx.inputs.byKey));
  if (absurd !== null) {
    ctx.diagnostics.push(absurd);
    return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
  }
  return { shape: applyTransforms(ctx, out.shape, r), diagnostics: ctx.diagnostics };
}
