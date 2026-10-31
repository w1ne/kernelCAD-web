// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/partBackend.ts
//
// A mated part's lowered backend for the checks that only read bounds and
// triangles. `Shape.lower()` refuses a display mesh body (lib.meshFromSTL)
// because it has no BRep; by then the lower has put the mesh in the session's
// shape cache, so those checks take it from there instead of failing the
// whole evaluation.

import type { Assembly } from '../capture/assembly';
import type { Shape } from '../capture/proxy';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { MeshBackend } from '../../kernel/backends/meshBackend';

export async function partBackend(arm: Assembly, shape: Shape): Promise<ShapeBackend> {
  try {
    return await shape.lower();
  } catch (err) {
    if (!/display mesh bod/i.test(err instanceof Error ? err.message : String(err))) throw err;
    const session = arm.__session();
    const mesh = session.cachedShapes.get(shape.id) ?? session.reusableLoweredShape(shape.id);
    if (mesh instanceof MeshBackend) return mesh;
    throw err;
  }
}
