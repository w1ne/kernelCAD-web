// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/occtCompat.ts
import { BoundingBox, Shape } from 'replicad';

/**
 * Restore `TopoDS_Shape.HashCode(upperBound)` on an OCCT 8 module.
 *
 * OCCT 7.8 removed `TopoDS_Shape::HashCode` in favour of `std::hash`; the
 * replicad-opencascadejs OCCT 8 build exposes the same bounded identity hash
 * as `ReplicadShapeHasher.HashCode(shape, upperBound)`. kernelCAD hashes
 * sub-shapes in many places (face/edge refs, history maps), all of which are
 * per-process identity keys, never persisted values, so routing the method
 * through the hasher keeps every call site and its semantics unchanged.
 * Embind subclasses (TopoDS_Face, TopoDS_Edge, ...) inherit the method.
 *
 * Idempotent; a module that still has a native HashCode is left untouched.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installOcctCompat(oc: any): void {
  installReplicadCompat();
  const proto = oc?.TopoDS_Shape?.prototype;
  const hasher = oc?.ReplicadShapeHasher;
  if (!proto || !hasher || typeof proto.HashCode === 'function') return;
  Object.defineProperty(proto, 'HashCode', {
    configurable: true,
    writable: true,
    value(this: unknown, upperBound: number): number {
      return hasher.HashCode(this, upperBound);
    },
  });
}

/**
 * Restore replicad <1.0's `Shape.boundingBox`: `BRepBndLib::Add` with the
 * triangulation, padded by the shape tolerance.
 *
 * replicad 1.x computes it with `AddOptimal` (exact geometry, no
 * triangulation). That is slower (~11 ms per curved face) and gives
 * different per-face boxes, and kernelCAD's geometric heuristics are
 * calibrated on the old boxes: joint visibility, for one, classifies a
 * pin's end cap as a fork plate under the exact box. Callers that want an
 * exact box ask for it (`OcctBackend.boundingBox({ exact: true })`, the
 * viewer-dimension AddOptimal pass).
 */
export function installReplicadCompat(): void {
  const proto = Shape.prototype as unknown as Record<string, unknown>;
  const current = Object.getOwnPropertyDescriptor(proto, 'boundingBox');
  if ((current?.get as { kcCompat?: boolean } | undefined)?.kcCompat) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- replicad wrapper internals
  const get = function (this: any): BoundingBox {
    const bbox = new BoundingBox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.oc as any).BRepBndLib.Add(this.wrapped, (bbox as any).wrapped, true);
    return bbox;
  };
  (get as { kcCompat?: boolean }).kcCompat = true;
  Object.defineProperty(proto, 'boundingBox', { configurable: true, get });
}
