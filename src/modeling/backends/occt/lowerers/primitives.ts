// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { FaceLineage, HistoryMap } from '../../../../kernel/naming/evolutionRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, type LowerContext, type LowerOutcome } from './context';

/** `box(x, y, z, { centered })` — seeds the six canonical face names into the
 *  history map so downstream selectors can name them. */
export function lowerBox(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const x = r.params.x.evaluated;
  const y = r.params.y.evaluated;
  const z = r.params.z.evaluated;
  const centered = (r.params.centered?.evaluated ?? 0) > 0.5;
  const rawBox = OcctBackend.box(x, y, z, centered);
  const boxSeedMap: HistoryMap = new Map();
  const boxFaceNames = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
  for (const name of boxFaceNames) {
    try {
      const hash = rawBox.findCanonicalFaceHash(name);
      const lineage: FaceLineage = { rootHash: hash, canonicalName: name, rootFeatureId: r.id };
      boxSeedMap.set(hash, lineage);
    } catch {
      // defensive: shouldn't happen for box, but skip silently if it does
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxWrapped = (rawBox as OcctBackend).getReplicadShape() as any;
  const shape: ShapeBackend = new OcctBackend(boxWrapped, 'box', boxSeedMap);
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'box',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** `cylinder(h, r)` — seeds the two planar cap names ('top', 'bottom'). */
export function lowerCylinder(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const rawCyl = OcctBackend.cylinder(r.params.h.evaluated, r.params.r.evaluated);
  const cylSeedMap: HistoryMap = new Map();
  const cylinderFaceNames = ['top', 'bottom'] as const;
  for (const name of cylinderFaceNames) {
    try {
      const hash = rawCyl.findCanonicalFaceHash(name);
      cylSeedMap.set(hash, { rootHash: hash, canonicalName: name, rootFeatureId: r.id });
    } catch {
      // defensive: skip if face not found
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cylWrapped = (rawCyl as OcctBackend).getReplicadShape() as any;
  const shape: ShapeBackend = new OcctBackend(cylWrapped, 'cylinder', cylSeedMap);
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'cylinder',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** `sphere(r)`. */
export function lowerSphere(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // Sphere has no canonical planar face names — leave historyMap undefined.
  // Falls back to the legacy !base.kind path in edgeSelection (correct behaviour).
  const shape: ShapeBackend = OcctBackend.sphere(r.params.r.evaluated);
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'sphere',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}
