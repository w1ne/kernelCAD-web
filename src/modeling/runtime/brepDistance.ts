// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

/** Re-exported from the kernel layer (one implementation for every caller). */
export { brepExtremaDistance } from '../../kernel/backends/occt/brepDistance';
