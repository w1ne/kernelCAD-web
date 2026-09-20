// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `importedStep` / `importedBrep` / `importedStl` — one arm for all three. */
export function lowerImported(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // `lib.fromSTEP` / `lib.fromBREP` / `lib.fromSTL` all ran their import
  // at capture time (host-side fs read + the format's OCCT reader); the
  // resulting OcctBackend was parked in `lowerer.importedGeometry` keyed
  // by feature id. Lowering is a hand-back — the geometry is already a
  // Shape3D, so all three formats share one arm.
  const backend = ctx.importedGeometry.get(r.id);
  if (!backend) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `${r.kind} record '${r.id}' has no pre-lowered geometry registered on the lowerer.`,
      hint: `invalid-args.${r.kind}.missing-backend — wire the session's importedGeometry map into the lowerer before calling engine.run().`,
    });
    return noShape();
  }
  // Hand back a clone, never the parked backend itself: replicad's
  // translate/rotate/mirror/scale destroy their source OCCT handle, so
  // the post-hoc `r.transforms` loop below (or any destructive
  // downstream consumer) would invalidate the map entry and the next
  // lowering pass would throw "This object has been deleted".
  const shape: ShapeBackend = (backend as OcctBackend).clone();
  return built(shape);
}

/** `sdf.materialize(field, opts?)` — hand back the parked marching-cubes solid. */
export function lowerSdfMaterialize(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // `sdf.materialize(field, opts?)` ran the marching-cubes sweep at
  // capture time (host-side pure JS + OCCT sewing); the resulting
  // OcctBackend was parked in `session.importedGeometry` keyed by
  // feature id. Lowering is a hand-back — geometry is already built.
  const backend = ctx.importedGeometry.get(r.id);
  if (!backend) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sdfMaterialize record '${r.id}' has no pre-lowered geometry registered on the lowerer.`,
      hint: "invalid-args.sdfMaterialize.missing-backend — wire the session's importedGeometry map into the lowerer before calling engine.run().",
    });
    return noShape();
  }
  // Clone for the same reason as `importedStep` above: keep the parked
  // backend alive across repeated lowering passes.
  const shape: ShapeBackend = (backend as OcctBackend).clone();
  return built(shape);
}
