// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { Transform } from '../../shared/runtime/se3';
import type { Assembly } from '../capture/assembly';
import { matedPartNames, resolvedPartAt, sceneMotion } from './partFrame';

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
 * Build a new scene with cached local BREPs posed by `solveMates` placements
 * (`transforms`, where each part's own frame sits). The cached shapes already
 * carry each part's `at`, so a mated part's motion is `sceneMotion(placement,
 * at)`, the same transform the lowerer's `mateFk` emits for that pose.
 * Returns undefined rather than guessing if either cache or pose coverage is
 * incomplete.
 */
export function reposedLoweredAssemblyScene(
  arm: Assembly,
  candidate: unknown,
  transforms: ReadonlyMap<string, Transform>,
): SceneBackend | undefined {
  const scene = matchingLoweredAssemblyScene(arm, candidate);
  if (scene === undefined) return undefined;

  const mated = matedPartNames(arm.__mates());
  const atByName = new Map(arm.__parts().map((part) => [part.name, part.at]));
  const table = arm.__session().paramTable;
  const parts = [] as SceneBackend['parts'][number][];
  for (const part of scene.parts) {
    const placement = transforms.get(part.name);
    if (placement === undefined) return undefined;
    const worldTransform = mated.has(part.name)
      ? sceneMotion(placement, resolvedPartAt(atByName.get(part.name), table))
      : placement;
    parts.push({ ...part, worldTransform });
  }
  return { ...scene, parts };
}
