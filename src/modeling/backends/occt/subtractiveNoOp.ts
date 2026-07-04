// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/subtractiveNoOp.ts
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeatureId } from '../../../shared/intent/types';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

/**
 * Post-condition guard for subtractive operations — boolean difference, hole,
 * holes, cutout. Such an op is authored to remove material; if the result
 * volume equals the input volume the tool never touched the body (cutter
 * missed, hole drilled off the face, blind hole too shallow). The kernel
 * otherwise returns the unchanged solid as a success, which is the worst
 * failure mode for an agent caller that cannot see the render.
 *
 * Generalizes the embossText no-op guard (embossTextLowerer.ts): same tolerance
 * `max(1e-6, volumeBefore * 1e-9)` — rejects silent no-ops while tolerating
 * floating-point rounding. Returns the error diagnostic to emit, or null when
 * material was actually removed.
 *
 * Only call this for genuinely subtractive kinds. Union/intersection (not
 * monotonic), fillet/chamfer/shell (volume unpredictable), transforms, and
 * primitive creates must NOT be gated this way. Gated-off features never reach
 * the lowerer (RecomputeEngine returns a passthrough before lowering), so no
 * `enabled === false` guard is needed at the call site.
 */
export function subtractiveNoOpDiagnostic(args: {
  featureId: FeatureId;
  /** Human-facing op name, e.g. 'boolean difference', 'hole', 'cutout'. */
  opLabel: string;
  volumeBefore: number;
  volumeAfter: number;
}): CompilerDiagnostic | null {
  const { featureId, opLabel, volumeBefore, volumeAfter } = args;
  const tol = Math.max(1e-6, volumeBefore * 1e-9);
  if (volumeBefore - volumeAfter > tol) return null; // material was removed
  return {
    target: 'export-occt',
    code: 'feature.subtractive-noop',
    featureId,
    severity: 'error',
    message: `${opLabel} removed no material: result volume equals the input volume (${volumeBefore.toFixed(3)} mm³). The tool did not intersect the body.`,
    hint: HINT_TEMPLATES['feature.subtractive-noop'].template,
  };
}
