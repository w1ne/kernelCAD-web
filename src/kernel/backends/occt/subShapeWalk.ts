// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Leak-free `TopExp_Explorer` walk for hot bounds loops. `exp.Current()` and
// `TopoDS.Face_1` / `Edge_1` / `Vertex_1` each return a JS-owned copy. Left
// undeleted, the GC safety net (occtFinalizers.ts) holds a registration for
// each until a finalizer task runs, and none runs inside a synchronous kernel
// call: the SO-100 arm scene summary held about 260 MB of them and aborted at
// the hosted 768 MB heap.

import { untracked } from './occtFinalizers';

export type SubShapeType = 'FACE' | 'EDGE' | 'VERTEX';

const DOWNCAST = { FACE: 'Face_1', EDGE: 'Edge_1', VERTEX: 'Vertex_1' } as const;

/**
 * Call `visit` with each `type` sub-shape of the raw `TopoDS_Shape` `shape`,
 * downcast. The handle is deleted after `visit` returns; do not keep it.
 * Runs `untracked`, so `visit` must delete every OCCT handle it creates.
 * `visit` returning `false` stops the walk.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function forEachSubShape(oc: any, shape: unknown, type: SubShapeType, visit: (sub: unknown) => boolean | void): void {
  untracked(() => {
    const exp = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum[`TopAbs_${type}`], oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    try {
      for (; exp.More(); exp.Next()) {
        const current = exp.Current();
        try {
          const sub = oc.TopoDS[DOWNCAST[type]](current);
          try {
            if (visit(sub) === false) return;
          } finally {
            sub.delete();
          }
        } finally {
          current.delete();
        }
      }
    } finally {
      exp.delete();
    }
  });
}
