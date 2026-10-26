// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/assemblyPartCollision.ts
//
// The part-ref `collision(shapes)` chain method (convex collision pieces).

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';
import { Shape } from './proxy';
import type { AssemblyPartRef } from './assemblyTypes';

/** Build the part-ref `collision` chain method: validate, append to the
 *  shared `collisionShapes` array, return the ref. */
export function createPartCollision(
  id: FeatureId,
  getRef: () => AssemblyPartRef,
): Pick<AssemblyPartRef, 'collisionShapes' | 'collision'> {
  const collisionShapes: Shape[] = [];
  const collision = (shapes: Shape[]): AssemblyPartRef => {
    const bad = !Array.isArray(shapes) || shapes.length === 0
      ? -1
      : shapes.findIndex((s) => !(s instanceof Shape));
    if (!Array.isArray(shapes) || shapes.length === 0 || bad >= 0) {
      invalidArgs({
        api: 'part.collision(shapes)',
        path: bad >= 0 ? `shapes[${bad}]` : 'shapes',
        got: bad >= 0 ? shapes[bad] : shapes,
        showType: true,
        requires: 'a non-empty array of Shapes (convex pieces in the part\'s own frame)',
        example: "part.collision([box(40, 10, 10), box(10, 10, 30).translate(15, 0, 10)])",
        featureId: id,
      });
    }
    collisionShapes.push(...shapes);
    return getRef();
  };
  return { collisionShapes, collision };
}
