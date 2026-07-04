// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Deterministic geometric contact graph over a lowered BREP scene.
//
// The design-loop's visual-review checks `main-object-count` and
// `no-stray-or-floating-geometry` were previously graded by regex over the
// agent's own prose findings — an agent could pass them by writing the right
// keywords whether or not the geometry was sound. This computes the same
// facts from the scene itself: two bodies are "in contact" when their true
// surface distance is at or below a small gap, connected components of that
// contact relation are the distinct physical objects, and any component that
// is not the largest is floating/disconnected geometry.
//
// Reuses the exact OCCT surface-distance sweep in `checkClearance`
// (dfm/clearance.ts) rather than approximating with bounding boxes. Mated and
// ignored pair-lists are deliberately NOT passed in: a part that is
// mate-connected in the assembly graph but geometrically floating (an air gap)
// is exactly the defect this gate exists to catch, so every pair is measured
// on pure geometry.

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { checkClearance } from './dfm/clearance';

/** Default contact gap (mm). Surfaces within this of each other count as
 *  touching. Small enough to reject real air gaps, loose enough to absorb
 *  tessellation/placement noise between parts meant to abut. */
export const DEFAULT_CONTACT_GAP_MM = 0.5;

export interface ContactGraphResult {
  /** Number of connected bodies under the contact relation. */
  readonly objectCount: number;
  /** Part-name groups, one per connected body, largest (most parts) first. */
  readonly components: readonly string[][];
  /** Parts not in the largest component — floating / stray islands. Empty
   *  when the whole scene is a single connected body. */
  readonly floatingParts: readonly string[];
  /** The gap threshold used, for reproducibility in review output. */
  readonly gapMm: number;
}

export function analyzeContactGraph(
  scene: SceneBackend,
  opts: { gapMm?: number } = {},
): ContactGraphResult {
  const gapMm = opts.gapMm ?? DEFAULT_CONTACT_GAP_MM;
  const names = scene.parts.map((p) => p.name);

  const reports = checkClearance(scene, gapMm, new Set(), new Set());
  const adj = new Map<string, Set<string>>();
  for (const name of names) adj.set(name, new Set());
  for (const r of reports) {
    // 'violated' = measured surface distance below the gap (incl. contact);
    // 'interfering' = overlapping volume. Both mean the bodies touch.
    if (r.status !== 'violated' && r.status !== 'interfering') continue;
    adj.get(r.a)?.add(r.b);
    adj.get(r.b)?.add(r.a);
  }

  const components = connectedComponents(names, adj)
    .map((set) => [...set].sort())
    .sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));

  const floatingParts = components.slice(1).flat();

  return { objectCount: components.length, components, floatingParts, gapMm };
}

function connectedComponents(
  nodes: readonly string[],
  adj: Map<string, Set<string>>,
): Set<string>[] {
  const visited = new Set<string>();
  const out: Set<string>[] = [];
  for (const start of nodes) {
    if (visited.has(start)) continue;
    const component = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const n = stack.pop()!;
      if (visited.has(n)) continue;
      visited.add(n);
      component.add(n);
      for (const nb of adj.get(n) ?? []) {
        if (!visited.has(nb)) stack.push(nb);
      }
    }
    out.push(component);
  }
  return out;
}
