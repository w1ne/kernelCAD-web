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
  const dist = new oc.BRepExtrema_DistShapeShape();
  dist.LoadS1(shapeA);
  dist.LoadS2(shapeB);
  try {
    const ok = dist.Perform(new oc.Message_ProgressRange());
    if (!ok || !dist.IsDone()) {
      return undefined;
    }
    return dist.Value();
  } finally {
    dist.delete?.();
  }
}

export interface BrepClosest {
  distance: number;
  /** Closest point on `shapeA`, then on `shapeB`. */
  onA: [number, number, number];
  onB: [number, number, number];
}

/**
 * `brepExtremaDistance` plus the first pair of closest points, for gates
 * that report where the two shapes come nearest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function brepExtremaClosest(oc: any, shapeA: any, shapeB: any): BrepClosest | undefined {
  const dist = new oc.BRepExtrema_DistShapeShape();
  dist.LoadS1(shapeA);
  dist.LoadS2(shapeB);
  try {
    const ok = dist.Perform(new oc.Message_ProgressRange());
    if (!ok || !dist.IsDone() || dist.NbSolution() < 1) return undefined;
    const a = dist.PointOnShape1(1);
    const b = dist.PointOnShape2(1);
    try {
      return { distance: dist.Value(), onA: [a.X(), a.Y(), a.Z()], onB: [b.X(), b.Y(), b.Z()] };
    } finally {
      a.delete?.();
      b.delete?.();
    }
  } finally {
    dist.delete?.();
  }
}

/** Closest-point pair, in the shape the joint-continuity gate reads. */
export function brepExtremaContact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shapeA: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shapeB: any,
): { distanceMm: number; pointA: readonly [number, number, number]; pointB: readonly [number, number, number] } | undefined {
  const c = brepExtremaClosest(oc, shapeA, shapeB);
  return c && { distanceMm: c.distance, pointA: c.onA, pointB: c.onB };
}
