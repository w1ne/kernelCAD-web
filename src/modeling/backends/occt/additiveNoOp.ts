// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/additiveNoOp.ts
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeatureId } from '../../../shared/intent/types';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

/**
 * Post-condition guards for additive / primitive-create operations — the
 * additive analog of subtractiveNoOp.ts. Same design goal: the kernel otherwise
 * returns an empty/degenerate shape as a "success", which is the worst failure
 * mode for an agent caller that cannot see the render.
 *
 * The entire risk here is false positives, so these only fire for cases that
 * CANNOT have a legitimate empty/zero result:
 *
 *  - `intersectionEmptyDiagnostic` — boolean op === 'intersection'. The op is
 *    authored to keep the common volume of two bodies; an empty result means
 *    the bodies don't overlap (the additive analog of the subtractive
 *    cutter-miss) and is unambiguous. A tangential/coplanar touch yields a
 *    non-solid (shared face/edge) with zero volume, which is also not the
 *    requested common solid — also gated.
 *
 *  - `emptyResultDiagnostic` — a SOLID primitive create (box, cylinder, sphere)
 *    or a solid sweep-family create (extrude, revolve, loft, sweep) that lowers
 *    to an empty shape or a zero-volume degenerate. A solid is supposed to have
 *    volume; zero/empty is unambiguous breakage.
 *
 * What deliberately is NOT gated this way, and why each could legitimately be
 * empty / zero-volume (so gating would false-positive):
 *  - union: containment of one operand in another is legitimate, so a union
 *    whose volume equals an operand is correct, not a no-op.
 *  - fillet / chamfer / shell: volume change is unpredictable and never empty.
 *  - transforms / mirror / pattern: volume-preserving, never the create site.
 *  - sketch / curve / surface creates: legitimately non-solid (zero volume by
 *    construction) — calling emptyResultDiagnostic on them WOULD false-fire, so
 *    the lowerer must only call it for genuinely solid kinds.
 *
 * Tolerance for "zero volume" mirrors subtractiveNoOp's floor: max(1e-6, ...).
 * Gated-off features never reach the lowerer (RecomputeEngine returns a
 * passthrough before lowering), so no `enabled === false` guard is needed.
 */

const VOLUME_FLOOR = 1e-6;

export function intersectionEmptyDiagnostic(args: {
  featureId: FeatureId;
  /** Volume of the intersection result; 0 (or sub-floor) means no overlap solid. */
  volumeAfter: number;
  /** Result has no faces at all (truly empty compound). */
  isEmpty: boolean;
}): CompilerDiagnostic | null {
  const { featureId, volumeAfter, isEmpty } = args;
  // A real common solid has volume above the floor. Both a truly empty result
  // and a non-solid touch (faces but no volume) fail to satisfy the requested
  // common volume → error.
  if (!isEmpty && volumeAfter > VOLUME_FLOOR) return null;
  return {
    target: 'export-occt',
    code: 'feature.intersection-empty',
    featureId,
    severity: 'error',
    message:
      'boolean intersection produced an empty result: the bodies do not overlap, so the requested common volume is empty.',
    hint: HINT_TEMPLATES['feature.intersection-empty'].template,
  };
}

export function emptyResultDiagnostic(args: {
  featureId: FeatureId;
  /** Human-facing op name, e.g. 'box', 'extrude', 'revolve'. */
  opLabel: string;
  volumeAfter: number;
  /** Result has no faces at all (truly empty compound). */
  isEmpty: boolean;
}): CompilerDiagnostic | null {
  const { featureId, opLabel, volumeAfter, isEmpty } = args;
  if (!isEmpty && volumeAfter > VOLUME_FLOOR) return null;
  return {
    target: 'export-occt',
    code: 'feature.empty-result',
    featureId,
    severity: 'error',
    message: `${opLabel} produced an empty or zero-volume solid; the create degenerated and the result has no material.`,
    hint: HINT_TEMPLATES['feature.empty-result'].template,
  };
}
