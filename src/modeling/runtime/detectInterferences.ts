// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/detectInterferences.ts
//
// Pure pairwise BREP interference detection over an already-resolved
// SceneBackend. The Scene-aware script-running wrapper that produces a
// SceneBackend from script source lives in `agent/script-runtime/
// checkInterference.ts`; it imports from this file. This split keeps the
// pure detection routine in the modeling/ layer (kernel + capture deps
// only) while the script wrapper lives one tier up where authoring/Scene
// is reachable.
//
// Pattern: for each part pair:
//   - bounding-box overlap pre-filter (cheap),
//   - clone each part's local-frame OCCT shape, apply its FK worldTransform,
//   - boolean intersect + volume measurement.
//
// Industry-standard clash detection — same primitive Fusion / Onshape /
// SolidWorks / CATIA expose under "Interference Detection". Output is a
// list of (part_a, part_b, volume_mm3) tuples; agents read it directly
// instead of inferring overlap visually from a render.

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

/** A single (part_a, part_b) pair whose intersection has non-trivial volume. */
export interface InterferencePair {
  readonly a: string;
  readonly b: string;
  /** Intersection volume in mm³. Always > epsilon. */
  readonly volumeMm3: number;
}

export interface CheckInterferenceResult {
  readonly pairs: InterferencePair[];
  readonly partCount: number;
  readonly comparisonCount: number;
  readonly diagnostics: CompilerDiagnostic[];
}

/** Pure detection over an already-resolved SceneBackend. Exposed for tests
 *  and for callers that have a Scene in hand without re-running a script. */
export function detectInterferences(
  scene: SceneBackend,
  epsilonMm3: number,
  ignored: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[] = [],
): CheckInterferenceResult {
  // Clone + apply each part's worldTransform once, up front. The same
  // pattern the STEP exporter uses (`exportSceneToSTEPAsync`) — replicad's
  // translate / rotate mutate-and-destroy the source OCCT handle, so we
  // never touch the originals.
  const transformed = scene.parts.map((p) => {
    const clone = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform);
    return { name: p.name, shape: clone, bbox: clone.boundingBox() };
  });

  const pairs: InterferencePair[] = [];
  let comparisons = 0;
  for (let i = 0; i < transformed.length; i++) {
    for (let j = i + 1; j < transformed.length; j++) {
      const a = transformed[i];
      const b = transformed[j];
      const key = pairKey(a.name, b.name);
      if (ignored.has(key)) continue;
      if (!bboxesOverlap(a.bbox, b.bbox)) continue;
      comparisons++;
      // Boolean intersect can throw on degenerate inputs; treat as "no
      // detectable clash" rather than aborting the whole sweep.
      let inter: OcctBackend;
      try {
        inter = a.shape.clone().intersect(b.shape.clone());
      } catch {
        continue;
      }
      if (inter.isEmpty()) continue;
      const vol = inter.volume();
      if (vol > epsilonMm3) {
        pairs.push({ a: a.name, b: b.name, volumeMm3: vol });
      }
    }
  }
  return {
    pairs,
    partCount: transformed.length,
    comparisonCount: comparisons,
    diagnostics,
  };
}

/** `${a}\t${b}` with the names sorted, so the ignore-set lookup is symmetric. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}\t${b}` : `${b}\t${a}`;
}

function bboxesOverlap(
  a: { min: [number, number, number]; max: [number, number, number] },
  b: { min: [number, number, number]; max: [number, number, number] },
): boolean {
  return (
    a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
  );
}
