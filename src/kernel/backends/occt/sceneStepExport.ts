// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sceneStepExport.ts
//
// Scene-aware STEP export: a flat named body list, or a product tree when
// the scene repeats a part.

import { resolveColor } from '../../../shared/render/palette';
import { Transform } from '../../../shared/runtime/se3';
import type { SceneBackend, SceneBackendPart } from '../sceneBackend';
import { OcctBackend } from './occtBackend';
import { releaseWorldFrameParts, sceneToWorldFrameParts } from './sceneToWorldFrame';
import { groupStepProducts, writeStepAssembly, writeStepProductTree } from './stepAssemblyExport';

interface StepScenePart { part: SceneBackendPart; name: string; color?: string }

const INSTANCE_MATCH_TOLERANCE_MM = 1e-6;

/** Source-frame bounds and volume of a part: its shape minus its `at` offset. */
function sourceFrameMeasure(part: SceneBackendPart): number[] {
  const { min, max } = part.shape.boundingBox();
  const offset = part.prototype?.offset ?? [0, 0, 0];
  return [...min.map((v, i) => v - offset[i]), ...max.map((v, i) => v - offset[i]), part.shape.volume()];
}

/**
 * Measured check on a product group: an instance stays in the group only when
 * its source-frame bounds and volume match the first part's. A part that does
 * not match is written as its own product, never as a wrong instance.
 */
function splitMismatchedInstances(group: StepScenePart[]): StepScenePart[][] {
  if (group.length < 2) return [group];
  const reference = sourceFrameMeasure(group[0].part);
  const volumeTolerance = Math.max(1, Math.abs(reference[6])) * 1e-6;
  const matched: StepScenePart[] = [group[0]];
  const rest: StepScenePart[][] = [];
  for (const candidate of group.slice(1)) {
    const measure = sourceFrameMeasure(candidate.part);
    const same = measure.every((v, i) => Math.abs(v - reference[i]) <= (i === 6 ? volumeTolerance : INSTANCE_MATCH_TOLERANCE_MM));
    if (same) matched.push(candidate);
    else rest.push([candidate]);
  }
  return [matched, ...rest];
}

/**
 * Write grouped scene parts as a STEP product tree. Each product's geometry
 * is the first part's shape moved back to the source frame (minus its `at`
 * offset); each instance placement is the part's world transform after its
 * own offset.
 */
function writeSceneProductTree(
  assemblyName: string,
  groups: readonly (readonly StepScenePart[])[],
): Uint8Array {
  const owned: OcctBackend[] = [];
  try {
    return writeStepProductTree(assemblyName, groups.map((group) => {
      const first = group[0];
      const [ox, oy, oz] = first.part.prototype?.offset ?? [0, 0, 0];
      // Clone before the transform: replicad's translate consumes its source.
      const local = (first.part.shape as OcctBackend).clone().applyTransform(Transform.translation(-ox, -oy, -oz));
      owned.push(local);
      return {
        shape: local.getReplicadShape().wrapped,
        name: first.name,
        color: first.color,
        instances: group.map(({ part, name }) => {
          const [x, y, z] = part.prototype?.offset ?? [0, 0, 0];
          return { name, transform: part.worldTransform.compose(Transform.translation(x, y, z)).toMat4() };
        }),
      };
    }));
  } finally {
    releaseWorldFrameParts(owned.map((shape) => ({ shape })));
  }
}

/**
 * Scene-aware STEP export. Builds a `replicad.ShapeConfig[]` from the
 * `SceneBackend`'s parts (apply each part's `worldTransform` to a fresh
 * clone of its local-frame OCCT shape), then routes through replicad's
 * XCAF STEP writer (`writeStepAssembly`) so the resulting STEP file ships a
 * separate named body per part with its role color attached via XCAFDoc /
 * STEP layers. (`replicad.exportSTEP` is not used: its GC finalizers
 * double-free the STEP work session and corrupt the wasm heap; see
 * stepAssemblyExport.ts.)
 *
 * Why a free function instead of a `Scene.exportSTEP()` method: the agent-
 * facing Scene surface stays lean (per the kernelCAD product strategy —
 * generic tools, not convenience methods). `runAndExport` calls this
 * directly when the script returns a Scene. Callers outside the runtime
 * (CLI, MCP, future Studio export panel) can import this free function.
 *
 * Lifecycle: clones every part shape before `applyTransform` because
 * replicad's translate/rotate mutate-and-destroy the source OCCT handle
 * (cf. commit 1d597dd). Color tokens (e.g. 'plate', 'gear') are resolved
 * to `#rrggbb` via the role palette before being passed to the writer.
 *
 * Repeated parts: when two or more parts place the same source shape (and
 * colour), the scene is written as a product tree instead — a root assembly,
 * one product per distinct shape, one placed instance per part — so the
 * repeat count and placements survive in the STEP file. Scenes without a
 * repeated shape keep the flat world-frame body list.
 */
export async function exportSceneToSTEPAsync(
  sceneBackend: SceneBackend,
): Promise<Uint8Array> {
  const groups = groupStepProducts(sceneBackend.parts.map((part) => ({
    part,
    name: part.name,
    color: resolveColor(part.color),
    sourceId: part.shape instanceof OcctBackend ? part.prototype?.sourceId : undefined,
  }))).flatMap(splitMismatchedInstances);
  if (groups.some((group) => group.length > 1)) {
    return writeSceneProductTree(sceneBackend.assemblyName, groups);
  }
  // `sceneToWorldFrameParts` enforces the non-empty-scene invariant and
  // owns the clone-before-transform contract for every multi-body exporter.
  const worldParts = sceneToWorldFrameParts(sceneBackend);
  try {
    return await writeStepAssembly(
      worldParts.map((p) => ({
        shape: p.shape.getReplicadShape().wrapped,
        name: p.name,
        color: resolveColor(p.color),
      })),
    );
  } finally {
    releaseWorldFrameParts(worldParts);
  }
}
