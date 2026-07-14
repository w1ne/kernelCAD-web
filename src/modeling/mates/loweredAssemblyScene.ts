// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { Transform } from '../../shared/runtime/se3';
import type { Assembly } from '../capture/assembly';

/**
 * Accept only a complete evaluated scene for this exact assembly. A scene's
 * part BREPs are local-frame geometry, so a valid match can be reused at a
 * different solved pose without lowering the source feature tree again.
 */
export function matchingLoweredAssemblyScene(
  arm: Assembly,
  candidate: unknown,
): SceneBackend | undefined {
  if (!isSceneBackend(candidate) || candidate.assemblyName !== arm.name) return undefined;

  const expectedNames = arm.__parts().map((part) => part.name);
  const actualNames = new Set(candidate.parts.map((part) => part.name));
  if (
    candidate.parts.length !== expectedNames.length
    || actualNames.size !== expectedNames.length
    || expectedNames.some((name) => !actualNames.has(name))
  ) {
    return undefined;
  }
  return candidate;
}

/**
 * Build a new scene with cached local BREPs and the requested solved world
 * transforms. Returns undefined rather than guessing if either cache or pose
 * coverage is incomplete.
 */
export function reposedLoweredAssemblyScene(
  arm: Assembly,
  candidate: unknown,
  transforms: ReadonlyMap<string, Transform>,
): SceneBackend | undefined {
  const scene = matchingLoweredAssemblyScene(arm, candidate);
  if (scene === undefined) return undefined;

  const parts = [] as SceneBackend['parts'][number][];
  for (const part of scene.parts) {
    const worldTransform = transforms.get(part.name);
    if (worldTransform === undefined) return undefined;
    parts.push({ ...part, worldTransform });
  }
  return { ...scene, parts };
}
