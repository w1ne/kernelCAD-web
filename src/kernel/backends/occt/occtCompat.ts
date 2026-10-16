// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/occtCompat.ts

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
