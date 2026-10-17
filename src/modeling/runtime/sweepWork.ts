// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/sweepWork.ts
//
// Deterministic estimate of the mechanism-truth BREP pose sweep (criteria 2
// interpenetration and 3 dof-mismatch), made before the sweep runs.
//
// What the sweep really costs: it lowers the assembly ONCE and re-poses that
// scene per sample (`lowerSceneForSample`), and `detectInterferences`
// memoizes each pair's overlap on the pair's RELATIVE pose. So a pair costs
// a boolean only when
//   - the two parts' bounding boxes touch at that pose, and
//   - the two parts sit at a relative pose not measured before.
// Parts in one rigid cluster (joined by fastened mates, or by joints a pose
// leaves alone) keep their relative pose, so a fastened screw costs one
// boolean for the whole sweep, not one per pose. The boolean's own cost
// grows with the faces of its two operands.
//
// Work = sum over those (pair, new relative pose) candidates of
// faces(a) + faces(b). Read from the rest scene the sweep already lowered:
// the part BREPs are local-frame geometry, so posing a bounding box costs
// eight point transforms, no BREP work. Same geometry, same number on every
// machine.

import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { Transform } from '../../shared/runtime/se3';

export interface SweepWorkEstimate {
  /** Work units: Σ faces(a) + faces(b) over the (pair, relative pose)
   *  candidates the sweep would measure. */
  readonly work: number;
  /** Candidate booleans: part pairs whose boxes touch at a relative pose
   *  not seen before. */
  readonly candidates: number;
  readonly parts: number;
  /** Rigid clusters: groups of parts that keep their relative pose at every
   *  swept pose. */
  readonly clusters: number;
  /** Scenes counted, the rest scene included. */
  readonly lowers: number;
}

interface Box { readonly lo: [number, number, number]; readonly hi: [number, number, number] }

/** Where `t` sends the origin and the unit axes, rounded to `1/scale` mm.
 *  1e9 is the overlap memo key's rounding (`detectInterferences`). */
function transformKey(t: Transform, scale = 1e9): string {
  const probe: Array<[number, number, number]> = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return probe.map((p) => t.point(p).map((c) => Math.round(c * scale)).join(',')).join(';');
}

function worldBox(local: { min: readonly number[]; max: readonly number[] }, t: Transform): Box {
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const x of [local.min[0], local.max[0]]) {
    for (const y of [local.min[1], local.max[1]]) {
      for (const z of [local.min[2], local.max[2]]) {
        const q = t.point([x, y, z]);
        for (let i = 0; i < 3; i++) {
          if (q[i] < lo[i]) lo[i] = q[i];
          if (q[i] > hi[i]) hi[i] = q[i];
        }
      }
    }
  }
  return { lo, hi };
}

function boxesTouch(a: Box, b: Box): boolean {
  return a.lo[0] <= b.hi[0] && a.hi[0] >= b.lo[0]
    && a.lo[1] <= b.hi[1] && a.hi[1] >= b.lo[1]
    && a.lo[2] <= b.hi[2] && a.hi[2] >= b.lo[2];
}

/**
 * Estimate the sweep work over `scenes`: the rest scene first, then every
 * re-posed scene the sweep will check (pose samples and dof micro-poses).
 * Display-mesh parts are skipped, as `detectInterferences` skips them.
 */
export function estimateSweepWork(scenes: readonly SceneBackend[]): SweepWorkEstimate {
  const rest = scenes[0];
  if (rest === undefined) return { work: 0, candidates: 0, parts: 0, clusters: 0, lowers: 0 };
  const geometry = new Map<string, { box: { min: readonly number[]; max: readonly number[] }; faces: number }>();
  for (const p of rest.parts) {
    if (!(p.shape instanceof OcctBackend)) continue;
    geometry.set(p.name, { box: p.shape.boundingBox(), faces: p.shape.getReplicadShape().faces.length });
  }

  const seen = new Map<string, Set<string>>();
  let work = 0;
  let candidates = 0;
  for (const scene of scenes) {
    const posed = scene.parts
      .filter((p) => geometry.has(p.name))
      .map((p) => ({ name: p.name, t: p.worldTransform, box: worldBox(geometry.get(p.name)!.box, p.worldTransform) }));
    for (let i = 0; i < posed.length; i++) {
      for (let j = i + 1; j < posed.length; j++) {
        const a = posed[i]!;
        const b = posed[j]!;
        if (!boxesTouch(a.box, b.box)) continue;
        const pair = `${a.name}\t${b.name}`;
        const relative = transformKey(a.t.inverse().compose(b.t));
        let poses = seen.get(pair);
        if (poses === undefined) {
          poses = new Set();
          seen.set(pair, poses);
        }
        if (poses.has(relative)) continue;
        poses.add(relative);
        candidates++;
        work += geometry.get(a.name)!.faces + geometry.get(b.name)!.faces;
      }
    }
  }
  return { work, candidates, parts: rest.parts.length, clusters: rigidClusterCount(scenes), lowers: scenes.length };
}

/** Parts that keep one relative pose to each other at every scene form one
 *  rigid cluster. Grouped by each part's motion from the rest scene. */
function rigidClusterCount(scenes: readonly SceneBackend[]): number {
  const rest = scenes[0]!;
  const restT = new Map(rest.parts.map((p) => [p.name, p.worldTransform]));
  const signature = new Map<string, string>(rest.parts.map((p) => [p.name, '']));
  for (const scene of scenes.slice(1)) {
    for (const p of scene.parts) {
      const r = restT.get(p.name);
      const motion = r === undefined ? `?${p.name}` : transformKey(p.worldTransform.compose(r.inverse()), 1e6);
      signature.set(p.name, `${signature.get(p.name) ?? ''}|${motion}`);
    }
  }
  return new Set(signature.values()).size;
}
