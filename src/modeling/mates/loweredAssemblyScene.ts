// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { recordById } from '../../shared/intent/recordIndex';
import { Transform } from '../../shared/runtime/se3';
import { partPlacementTransform } from '../backends/occt/lowerers/partPlacement';
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
 * transforms. Each part keeps its placement (`at:`), which the lowered
 * worldTransform composes after the solved frame. Returns undefined rather
 * than guessing if either cache or pose coverage is incomplete.
 */
export function reposedLoweredAssemblyScene(
  arm: Assembly,
  candidate: unknown,
  transforms: ReadonlyMap<string, Transform>,
): SceneBackend | undefined {
  const scene = matchingLoweredAssemblyScene(arm, candidate);
  if (scene === undefined) return undefined;

  const placements = partPlacements(arm);
  const parts = [] as SceneBackend['parts'][number][];
  for (const part of scene.parts) {
    const solved = transforms.get(part.name);
    if (solved === undefined) return undefined;
    const placement = placements.get(part.name) ?? Transform.identity();
    parts.push({ ...part, worldTransform: solved.compose(placement) });
  }
  return { ...scene, parts };
}

/** Part name -> placement transform from its param-resolved part record. */
function partPlacements(arm: Assembly): Map<string, Transform> {
  const session = arm.__session();
  const records = session.getRecords();
  const out = new Map<string, Transform>();
  for (const part of arm.__parts()) {
    const rec = recordById(records, part.id);
    if (rec !== undefined) out.set(part.name, partPlacementTransform(rec, session.paramTable));
  }
  return out;
}
