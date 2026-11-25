// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { makeCompound, type AnyShape } from 'replicad';
import { partCentroids } from './drawingExplode';
import { deleteReplicadShape } from './occtDispose';
import type { WorldFramePart } from './sceneToWorldFrame';
import type { SvgDrawingOptions } from './exportSvgDrawing';

export interface ResolvedDrawingBodies {
  explodedParts: readonly WorldFramePart[] | undefined;
  assembledCentroids: Map<string, [number, number, number]>;
  explodedCentroids: Map<string, [number, number, number]>;
  shape: AnyShape;
  explodedShape: AnyShape | undefined;
  dispose: () => void;
}

function buildCompoundFromParts(
  group: readonly WorldFramePart[],
  owned: AnyShape[],
): AnyShape {
  if (group.length === 1) return group[0]!.shape.getReplicadShape();
  // replicad's makeCompound() calls delete() on every input shape wrapper
  // after adding its TopoDS_Shape to the compound. Clone each wrapper first
  // so per-part OcctBackend handles stay alive for datum, tolerance, and
  // annotation queries after projection.
  const clones: AnyShape[] = [];
  try {
    for (const part of group) {
      clones.push(part.shape.getReplicadShape().clone());
    }
    const compound = makeCompound(clones);
    owned.push(compound);
    return compound;
  } catch (error) {
    for (const clone of clones) deleteReplicadShape(clone);
    throw error;
  }
}

/**
 * Resolve the lowered shape(s) and the part centroids the overlays need.
 *
 * Skip the centroid read unless balloons, parts-list, or an exploded iso
 * actually need them — exact bbox tessellation would otherwise perturb the
 * automatic dimensions. Call `dispose()` after rendering completes so temporary
 * multi-part compound wrappers do not leak WASM memory.
 */
export function resolveDrawingBodies(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
): ResolvedDrawingBodies {
  const explodedParts = options.explodedParts;
  const needCentroids =
    options.balloons === true || options.partsList === true || explodedParts !== undefined;
  const assembledCentroids = needCentroids ? partCentroids(parts) : new Map();
  const explodedCentroids = explodedParts !== undefined
    ? partCentroids(explodedParts)
    : assembledCentroids;
  const owned: AnyShape[] = [];
  const dispose = (): void => {
    for (const s of owned) deleteReplicadShape(s);
    owned.length = 0;
  };
  try {
    const shape = buildCompoundFromParts(parts, owned);
    const explodedShape = explodedParts !== undefined && explodedParts.length > 0
      ? buildCompoundFromParts(explodedParts, owned)
      : undefined;
    return { explodedParts, assembledCentroids, explodedCentroids, shape, explodedShape, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
