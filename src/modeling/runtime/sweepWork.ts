// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/sweepWork.ts
//
// Deterministic estimate of the mechanism-truth BREP pose sweep (criteria 2
// interpenetration and 3 dof-mismatch), made before the sweep runs.
//
// What the sweep really costs: it lowers the assembly ONCE and re-poses that
// scene per sample (`lowerSceneForSample`), and `detectInterferences`
// memoizes each pair's overlap on the pair's RELATIVE pose. A pair costs an
// exact boolean only when the shared proxy collector says the enclosing
// boxes touch and that relative pose has not been confirmed yet. Parts in
// one rigid cluster keep their relative pose, so a fastened screw costs one
// boolean for the whole sweep, not one per pose.
//
// Work = Σ (analysis-body faces of a + analysis-body faces of b) over those
// unique exact-confirm candidates. The six-face proxy is not booleaned and
// is not the face count. The estimate reads the rest scene, FK transforms
// and the proxy SAT, so it is deterministic and machine-independent.

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { Transform } from '../../shared/runtime/se3';
import { buildSweepProxies, collectSweepProxyCandidates } from './sweepCollisionProxy';

export interface SweepWorkEstimate {
  /** Work units: Σ analysis-body faces(a) + faces(b) over the unique proxy
   *  candidates the sweep will exact-confirm. */
  readonly work: number;
  /** Exact confirms: proxy-touching part pairs at a relative pose not seen
   *  before. */
  readonly candidates: number;
  readonly parts: number;
  /** Rigid clusters: groups of parts that keep their relative pose at every
   *  swept pose. */
  readonly clusters: number;
  /** Scenes counted, the rest scene included. */
  readonly lowers: number;
}

/**
 * Estimate the sweep work over `scenes`: the rest scene first, then every
 * re-posed scene the sweep will check (pose samples and dof micro-poses).
 * Display-mesh parts are skipped, as `detectInterferences` skips them.
 *
 * `ignoredByScene[i]` is the ignore set the runtime probe uses for that
 * scene. Omitted scenes ignore nothing. The candidate pairs are the same
 * ones `collectSweepProxyCandidates` hands to the exact confirm.
 */
export function estimateSweepWork(
  scenes: readonly SceneBackend[],
  ignoredByScene: readonly ReadonlySet<string>[] = [],
): SweepWorkEstimate {
  const rest = scenes[0];
  if (rest === undefined) return { work: 0, candidates: 0, parts: 0, clusters: 0, lowers: 0 };
  const proxies = buildSweepProxies(rest);
  const seen = new Map<string, Set<string>>();
  let work = 0;
  let candidates = 0;
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index]!;
    const ignored = ignoredByScene[index] ?? EMPTY_IGNORED;
    for (const pair of collectSweepProxyCandidates(proxies, scene, ignored)) {
      const id = `${pair.a}\t${pair.b}`;
      let poses = seen.get(id);
      if (poses === undefined) {
        poses = new Set();
        seen.set(id, poses);
      }
      if (poses.has(pair.relativeKey)) continue;
      poses.add(pair.relativeKey);
      candidates++;
      work += pair.faces;
    }
  }
  return { work, candidates, parts: rest.parts.length, clusters: rigidClusterCount(scenes), lowers: scenes.length };
}

const EMPTY_IGNORED: ReadonlySet<string> = new Set<string>();

/** Cluster signature rounding. Coarser than the overlap memo (1e9): it only
 *  groups parts that move together, and matches the previous estimator. */
function clusterMotionKey(t: Transform): string {
  const probe: Array<[number, number, number]> = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return probe.map((p) => t.point(p).map((c) => Math.round(c * 1e6)).join(',')).join(';');
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
      const motion = r === undefined ? `?${p.name}` : clusterMotionKey(p.worldTransform.compose(r.inverse()));
      signature.set(p.name, `${signature.get(p.name) ?? ''}|${motion}`);
    }
  }
  return new Set(signature.values()).size;
}
