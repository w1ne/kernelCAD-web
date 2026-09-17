// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { LowerResult, ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { propagateTransformHistory } from '../../../../kernel/naming/evolutionRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { isValidPlaneSpec } from '../../../../shared/intent/types';
import type { Vec3 } from '../../../../shared/intent/types';
import type { LowerContext, LowerOutcome } from './context';

/**
 * Apply the record's post-hoc `transforms` in declared order, propagating the
 * face-lineage historyMap through each step. Shared tail of every non-terminal
 * lowering; terminal outcomes (virtual records, SceneBackends, error fallbacks)
 * never reach it.
 */
export function applyTransforms(
  ctx: LowerContext,
  input: ShapeBackend,
  r: FeatureRecord,
): ShapeBackend {
  let shape = input;
  for (const t of r.transforms) {
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
        shape = new OcctBackend(wrapped, undefined, newMap);
      }
      // else: defensive path — face count mismatch (unexpected for these ops).
      // Leave shape without historyMap; resolver returns face-ref-not-resolvable.
    }
  }
  return shape;
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
  return { shape: applyTransforms(ctx, out.shape, r), diagnostics: ctx.diagnostics };
}
