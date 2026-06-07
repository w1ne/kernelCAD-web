// src/modeling/runtime/brepDistance.ts
//
// Shared BREP minimum-distance primitives, extracted from
// jointMeshContinuity.ts so the DFM clearance gate (dfm/clearance.ts) and
// the joint-mesh-continuity gate run the exact same OCCT pattern instead
// of duplicating it.

import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';

/** Unwrap an OcctBackend to its raw TopoDS_Shape for direct OCCT calls. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrappedShape(backend: OcctBackend): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (backend as unknown as { shape: { wrapped: any } }).shape.wrapped;
}

/**
 * Run `BRepExtrema_DistShapeShape` between two TopoDS shapes. We use
 * the default-construct + LoadS1 + LoadS2 + Perform pattern rather
 * than the 5-arg constructor — the enum-value globals required for the
 * 5-arg form aren't reliably exposed on the WASM module surface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function brepExtremaDistance(oc: any, shapeA: any, shapeB: any): number | undefined {
  const dist = new oc.BRepExtrema_DistShapeShape_1();
  dist.LoadS1(shapeA);
  dist.LoadS2(shapeB);
  try {
    const ok = dist.Perform(new oc.Message_ProgressRange_1());
    if (!ok || !dist.IsDone()) {
      return undefined;
    }
    return dist.Value();
  } finally {
    dist.delete?.();
  }
}
