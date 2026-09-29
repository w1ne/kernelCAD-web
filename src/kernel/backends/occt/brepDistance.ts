// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/brepDistance.ts
//
// BREP minimum distance between two raw TopoDS shapes. Lives in the kernel
// layer so kernel lowerers (hole entry checks) and the modeling-layer gates
// (DFM clearance, joint-mesh continuity, via modeling/runtime/brepDistance)
// run the exact same OCCT pattern.

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
