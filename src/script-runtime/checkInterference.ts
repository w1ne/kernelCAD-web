// src/script-runtime/checkInterference.ts
//
// Pairwise BREP interference detection over an assembly Scene. Reuses the
// existing capture+lower pipeline (runScript → RecomputeEngine → OcctLowerer)
// to resolve the SceneBackend, then for each pair of parts:
//   - bounding-box overlap pre-filter (cheap),
//   - clone each part's local-frame OCCT shape, apply its FK worldTransform,
//   - boolean intersect + volume measurement.
//
// Industry-standard clash detection — same primitive Fusion / Onshape /
// SolidWorks / CATIA expose under "Interference Detection". Output is a
// list of (part_a, part_b, volume_mm3) tuples; agents read it directly
// instead of inferring overlap visually from a render.

import { runScript } from './runScript';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../backends/sceneBackend';
import type { OcctBackend } from '../backends/occt/occtBackend';
import { Shape } from '../capture/proxy';
import { Scene } from '../intent/scene';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';

/** A single (part_a, part_b) pair whose intersection has non-trivial volume. */
export interface InterferencePair {
  readonly a: string;
  readonly b: string;
  /** Intersection volume in mm³. Always > epsilon. */
  readonly volumeMm3: number;
}

export interface CheckInterferenceInput {
  readonly code: string;
  readonly fileName: string;
  /** Absolute directory of the source script. Threaded so `lib.fromSTEP`
   *  resolves relative paths. */
  readonly scriptDir?: string;
  /** Volume threshold below which an intersection is treated as "touching"
   *  rather than "interfering". Default 0.01 mm³ — small enough to surface
   *  any meaningful overlap, large enough to ignore numerical artifacts on
   *  faces that share a plane. */
  readonly epsilonMm3?: number;
  /** Optional ignore-list of `${a}\t${b}` (sorted lexicographically) strings.
   *  Pairs in this set are skipped — useful for parts that touch by design. */
  readonly ignorePairs?: ReadonlySet<string>;
}

export interface CheckInterferenceResult {
  readonly pairs: InterferencePair[];
  readonly partCount: number;
  readonly comparisonCount: number;
  readonly diagnostics: CompilerDiagnostic[];
}

const DEFAULT_EPSILON_MM3 = 0.01;

/** Resolve the script to a SceneBackend, then detect interferences. Returns
 *  an empty `pairs` array when the script doesn't produce a Scene. */
export async function checkInterference(
  input: CheckInterferenceInput,
): Promise<CheckInterferenceResult> {
  const epsilon = input.epsilonMm3 ?? DEFAULT_EPSILON_MM3;
  const ignored = input.ignorePairs ?? new Set<string>();

  const run = await runScript({
    code: input.code,
    fileName: input.fileName,
    scriptDir: input.scriptDir,
  });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const fatal = r.diagnostics.filter((d) => d.severity === 'error');
  if (fatal.length > 0) {
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics };
  }

  // Resolve the target feature id the same way runAndExport does for STEP.
  let targetId: string | undefined;
  const ret = run.returnValue;
  if (ret instanceof Shape) targetId = ret.id;
  else if (ret instanceof Scene) targetId = ret.__sourceFeatureId();
  else if (run.records.length > 0) targetId = run.records[run.records.length - 1].id;

  if (!targetId) {
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics };
  }

  const lowered = r.shapes.get(targetId);
  if (!lowered || !isSceneBackend(lowered)) {
    // Not an assembly — nothing to clash. Caller decides whether this is an
    // error or a no-op via the empty `pairs` array + `partCount: 0`.
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics };
  }
  return detectInterferences(lowered, epsilon, ignored, r.diagnostics);
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
