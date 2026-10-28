// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Drop OCCT handles the moment a solid stops being the live baseline.
// V8 finalizers run on JS heap pressure, not wasm RSS, and the wasm Memory
// buffer never shrinks — so a handle left for GC ratchets the evaluator.

import type { ShapeBackend } from '../../kernel/backends/backend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { approxOcctBytes } from '../../kernel/backends/occt/shapeWeight';

export interface SessionGeometry {
  cachedShapes: {
    values(): Iterable<ShapeBackend>;
    clear(): void;
  };
  importedGeometry?: {
    values(): Iterable<ShapeBackend>;
    clear(): void;
  };
  cachedFeatureMeshes?: { clear(): void };
  cachedAssemblyPartMeshes?: { clear(): void };
  lastFullLower?: unknown;
  cleanScriptLower?: unknown;
}

function freeHandle(shape: object): void {
  const handle = shape as { dispose?: () => void; delete?: () => void; isDeleted?: () => boolean };
  try {
    if (typeof handle.isDeleted === 'function' && handle.isDeleted()) return;
    if (typeof handle.dispose === 'function') handle.dispose();
    else handle.delete?.();
  } catch {
    // A failed lower, or a second release, may already have freed this handle.
  }
}

function keepTree(shape: object, kept: Set<object>): void {
  if (kept.has(shape)) return;
  kept.add(shape);
  if (isSceneBackend(shape)) {
    for (const part of shape.parts) keepTree(part.shape, kept);
  }
}

const retainedSources: Array<() => Iterable<object>> = [];

/** A host that still serves solids (the local MCP viewer) registers them
 *  here. `releaseReplacedShapes` will not dispose a shape the source returns. */
export function registerRetainedShapeSource(source: () => Iterable<object>): () => void {
  retainedSources.push(source);
  return () => {
    const index = retainedSources.indexOf(source);
    if (index >= 0) retainedSources.splice(index, 1);
  };
}

function retainRegistered(kept: Set<object>): void {
  for (const source of retainedSources) {
    for (const shape of source()) keepTree(shape, kept);
  }
}

function disposeShape(shape: object, seen: Set<object>, kept?: Set<object>): void {
  if (seen.has(shape) || kept?.has(shape)) return;
  seen.add(shape);
  if (isSceneBackend(shape)) {
    for (const part of shape.parts) disposeShape(part.shape, seen, kept);
    return;
  }
  freeHandle(shape);
}

/** Free `shape` and, for a scene, each part solid that nobody is still using. */
export function disposeShapeTree(shape: object, seen = new Set<object>()): void {
  disposeShape(shape, seen);
}

/**
 * Free solids that were in `previous` and are not the live object anymore.
 * Scene parts that the new scene still references are kept.
 */
export function releaseReplacedShapes(
  previous: Iterable<ShapeBackend>,
  live: Iterable<ShapeBackend>,
): void {
  const kept = new Set<object>();
  for (const shape of live) keepTree(shape, kept);
  retainRegistered(kept);
  const seen = new Set<object>();
  for (const shape of previous) disposeShape(shape, seen, kept);
}

/** Free every solid the session still owns, then drop the JS caches that point at them. */
export function disposeSessionGeometry(session: SessionGeometry, seen = new Set<object>()): void {
  for (const shape of session.cachedShapes.values()) disposeShape(shape, seen);
  if (session.importedGeometry) {
    for (const shape of session.importedGeometry.values()) disposeShape(shape, seen);
    session.importedGeometry.clear();
  }
  session.cachedShapes.clear();
  session.cachedFeatureMeshes?.clear();
  session.cachedAssemblyPartMeshes?.clear();
  session.lastFullLower = undefined;
  session.cleanScriptLower = undefined;
}

export function disposeModelShapes(model: {
  shapes?: { values(): Iterable<ShapeBackend> };
  session?: SessionGeometry;
}): void {
  const seen = new Set<object>();
  if (model.shapes) {
    for (const shape of model.shapes.values()) disposeShape(shape, seen);
  }
  if (model.session) disposeSessionGeometry(model.session, seen);
}

/** Charged native bytes of the solids a built model still owns. */
export function retainedShapeBytes(model: {
  shapes: { values(): Iterable<ShapeBackend> };
  session: { cachedShapes: { values(): Iterable<ShapeBackend> } };
}): number {
  const seen = new Set<object>();
  let total = 0;
  const add = (shape: object) => {
    if (seen.has(shape)) return;
    seen.add(shape);
    if (isSceneBackend(shape)) {
      for (const part of shape.parts) add(part.shape);
      return;
    }
    total += approxOcctBytes(shape);
  };
  for (const shape of model.shapes.values()) add(shape);
  for (const shape of model.session.cachedShapes.values()) add(shape);
  return total;
}
