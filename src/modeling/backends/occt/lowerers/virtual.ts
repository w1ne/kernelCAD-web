// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { noShape, type LowerOutcome } from './context';

/**
 * Virtual records — capture-only declarations with no BREP output.
 * `recomputeEngine` gates on `metadata.virtual === true` and skips the
 * lowerer entirely, so these arms are defense-in-depth for callers that
 * invoke the lowerer directly.
 *
 * Covers `referenceImage`, `renderEnvironment`, `cameraTarget`, `dfmSpec`
 * (print-prep gate), `feaStudy` (the solver run happens in the FEA runner,
 * which reads this record's metadata and the shape it points at) and the
 * GD&T declarations `drawingDatum` / `drawingTolerance`, which the
 * svg-drawing exporter resolves against the exported geometry.
 *
 * Takes no parameters on purpose: all seven kinds ignore the record and the
 * context entirely (their old switch arms were byte-identical), and a
 * zero-argument function is still assignable to `KindLowerer`.
 */
export function lowerVirtualRecord(): LowerOutcome {
  return noShape();
}
