// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { makeCompound, type AnyShape } from 'replicad';
import { partCentroids } from './drawingExplode';
import type { WorldFramePart } from './sceneToWorldFrame';
import type { SvgDrawingOptions } from './exportSvgDrawing';

/**
 * Resolve the lowered shape(s) and the part centroids the overlays need.
 *
 * Centroids must be read BEFORE makeCompound / getReplicadShape: those
 * consume the replicad handles, and a later boundingBox would throw
 * "This object has been deleted". Skip the read unless balloons,
 * parts-list, or an exploded iso actually need them — exact bbox
 * tessellation would otherwise perturb the automatic dimensions.
 */
export function resolveDrawingBodies(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
): {
  explodedParts: readonly WorldFramePart[] | undefined;
  assembledCentroids: Map<string, [number, number, number]>;
  explodedCentroids: Map<string, [number, number, number]>;
  shape: AnyShape;
  explodedShape: AnyShape | undefined;
} {
  const explodedParts = options.explodedParts;
  const needCentroids =
    options.balloons === true || options.partsList === true || explodedParts !== undefined;
  const assembledCentroids = needCentroids ? partCentroids(parts) : new Map();
  const explodedCentroids = explodedParts !== undefined
    ? partCentroids(explodedParts)
    : assembledCentroids;
  const shape: AnyShape =
    parts.length === 1
      ? parts[0].shape.getReplicadShape()
      : makeCompound(parts.map(p => p.shape.getReplicadShape()));
  const explodedShape: AnyShape | undefined =
    explodedParts === undefined || explodedParts.length === 0
      ? undefined
      : explodedParts.length === 1
        ? explodedParts[0]!.shape.getReplicadShape()
        : makeCompound(explodedParts.map(p => p.shape.getReplicadShape()));
  return { explodedParts, assembledCentroids, explodedCentroids, shape, explodedShape };
}

