// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { Transform } from '../../shared/runtime/se3';
import type { Assembly } from '../capture/assembly';
import { partAtFor, sceneMotion } from './partFrame';

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

  const atOf = partAtFor(arm.__mates(), arm.__parts(), arm.__session().paramTable);
  const parts = [] as SceneBackend['parts'][number][];
  for (const part of scene.parts) {
    const placement = transforms.get(part.name);
    if (placement === undefined) return undefined;
    const at = atOf(part.name);
    const worldTransform = at === undefined ? placement : sceneMotion(placement, at);
    parts.push({ ...part, worldTransform });
  }
  return { ...scene, parts };
}

/**
 * The last fully lowered rest scene of each assembly, so the checks that run
 * after the mechanism probe (motion-load, ...) re-pose it instead of lowering
 * the whole assembly again. A lower is new OCCT geometry, and the WASM heap
 * keeps its high-water mark for the life of the process.
 */
const restScenes = new WeakMap<Assembly, SceneBackend>();

export function rememberRestScene(arm: Assembly, scene: SceneBackend): void {
  restScenes.set(arm, scene);
}

/** The remembered rest scene, if it still matches the assembly's parts. */
export function rememberedRestScene(arm: Assembly): SceneBackend | undefined {
  return matchingLoweredAssemblyScene(arm, restScenes.get(arm));
}
