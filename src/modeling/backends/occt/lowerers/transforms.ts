// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { LowerResult, ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { MeshBackend } from '../../../../kernel/backends/meshBackend';
import { propagateTransformHistory } from '../../../../kernel/naming/evolutionRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { isValidPlaneSpec } from '../../../../shared/intent/types';
import type { Vec3 } from '../../../../shared/intent/types';
import type { LowerContext, LowerOutcome } from './context';
import { absurdGeometryDiagnostic } from '../featureSanity';

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
    case 'scale': return shape.scale([t.sx, t.sy, t.sz]);
    case 'reflect': throw new Error('Display mesh bodies do not support reflect; convert to BRep explicitly when solid operations are needed.');
  }
  return shape;
}

export function applyTransforms(
  ctx: LowerContext,
  input: ShapeBackend,
  r: FeatureRecord,
): ShapeBackend {
  let shape = input;
  for (const t of r.transforms) {
    if (shape instanceof MeshBackend) {
      shape = applyMeshTransform(shape, t);
      continue;
    }
    const inputBackend = shape as OcctBackend;
    const inputHashes = inputBackend.faceHashes();
    const inputMap = inputBackend.historyMap;
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
      case 'scale':
        shape = shape.scale([t.sx, t.sy, t.sz]);
        break;
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
      const outputBackend = shape as OcctBackend;
      const outputHashes = outputBackend.faceHashes();
      if (outputHashes.length === inputHashes.length) {
        const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrapped = (outputBackend.getReplicadShape() as any);
        const carried = new OcctBackend(wrapped, undefined, newMap);
        if (outputBackend.analysisBody !== undefined) carried.analysisBody = outputBackend.analysisBody;
        shape = carried;
      }
      // else: defensive path — face count mismatch (unexpected for these ops).
      // Leave shape without historyMap; resolver returns face-ref-not-resolvable.
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
