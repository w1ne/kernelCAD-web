// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Extract one solid from an imported STEP compound. Lives in the OCCT backend
// folder because it reaches replicad / OCCT directly; the parts layer calls it
// through `OcctBackend` so the kernel seam stays intact.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from './occtBackend';

const RETAIN_SOURCE = Symbol('stepSource');

export interface PickedSolid {
  /** The selected solid, or null when `index` is out of range. */
  solid: OcctBackend | null;
  /** Number of solids the source shape holds. */
  count: number;
}

/**
 * Zero-based pick of one TopoDS_SOLID from `backend`.
 *
 * The source backend is retained on the returned solid so its OCCT handle
 * cannot be collected out from under the child.
 */
export function pickSolid(backend: OcctBackend, index: number): PickedSolid {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (backend.getReplicadShape() as any).wrapped;
  const explorer = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let solid: OcctBackend | null = null;
  let count = 0;
  try {
    while (explorer.More()) {
      if (count === index) {
        const picked = oc.TopoDS.Solid_1(explorer.Current());
        solid = new OcctBackend(replicad.cast(picked) as replicad.Shape3D);
        (solid as unknown as Record<symbol, OcctBackend>)[RETAIN_SOURCE] = backend;
      }
      count += 1;
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return { solid, count };
}
