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
import type { Vec3 } from '../../shared/intent/types';
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

/** The subset of a transformed part the candidate pass reads: its name (for
 *  the symmetric ignore lookup) and its world-space AABB. */
export interface InterferenceCandidatePart {
  readonly name: string;
  readonly bbox: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * AABB-pruned candidate generation — the cheap pre-filter that keeps the
 * exact boolean-volume probe off every pair whose bounding boxes cannot
 * overlap. This is the same candidate set `detectInterferences` probes; it
 * is exported so the mechanism-truth sweep and tests can exercise the
 * pruning without paying for a BREP boolean.
 *
 * Semantics preserved from the inline loop this replaces:
 *   - ignored pairs are skipped BEFORE the bbox test (an ignored pair never
 *     contributes to `comparisonCount`),
 *   - `bboxesOverlap` is inclusive on the boundary, so face-touching parts
 *     (zero shared volume but coincident planes) stay candidates — the
 *     exact volume > epsilon test still decides whether they clash.
 *
 * Returns `[i, j]` index pairs into `parts` with `i < j`, in the same order
 * the detector probes them (lexicographic over the upper triangle).
 */
export function collectInterferenceCandidates(
  parts: readonly InterferenceCandidatePart[],
  ignored: ReadonlySet<string> = new Set<string>(),
): Array<readonly [number, number]> {
  const candidates: Array<readonly [number, number]> = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      if (ignored.has(pairKey(parts[i].name, parts[j].name))) continue;
      if (!bboxesOverlap(parts[i].bbox, parts[j].bbox)) continue;
      candidates.push([i, j]);
    }
  }
  return candidates;
}

/** Pure detection over an already-resolved SceneBackend. Exposed for tests
 *  and for callers that have a Scene in hand without re-running a script. */
/** Stable key for a world transform: where it sends the origin and the unit
 *  axes, rounded well below any modelling tolerance. */
function transformKey(t: SceneBackend['parts'][number]['worldTransform']): string {
  const probe: Array<[number, number, number]> = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return probe.map((p) => t.point(p).map((c) => Math.round(c * 1e9)).join(',')).join(';');
}

/**
 * Intersection volumes already measured, keyed by the two source part BREPs
 * (object identity) and their world transforms. The exact boolean-volume
 * probe dominates review time on dense parts (gears, threads), and one
 * review asks the same question several times — default pose, mechanical
 * validator, pose envelope, mechanism sweep all re-pose the SAME lowered
 * part BREPs. Weakly keyed, so it lives exactly as long as the shapes.
 */
const intersectionVolumeMemo = new WeakMap<object, WeakMap<object, Map<string, number>>>();

function memoGet(a: object, b: object, key: string): number | undefined {
  return intersectionVolumeMemo.get(a)?.get(b)?.get(key);
}

function memoSet(a: object, b: object, key: string, vol: number): void {
  let inner = intersectionVolumeMemo.get(a);
  if (inner === undefined) {
    inner = new WeakMap();
    intersectionVolumeMemo.set(a, inner);
  }
  let byPose = inner.get(b);
  if (byPose === undefined) {
    byPose = new Map();
    inner.set(b, byPose);
  }
  byPose.set(key, vol);
}

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
    return {
      name: p.name,
      shape: clone,
      bbox: clone.boundingBox(),
      source: p.shape as object,
      poseKey: transformKey(p.worldTransform),
      frameBounds: new Map<number, Bounds>(),
    };
  });

  const pairs: InterferencePair[] = [];
  const candidates = collectInterferenceCandidates(transformed, ignored);
  for (const [i, j] of candidates) {
    const a = transformed[i];
    const b = transformed[j];
    // Conservative rigid-frame bounds prove some candidates cannot exceed the threshold.
    let boundedBelowThreshold = false;
    for (let frame = 0; frame < BOUND_FRAMES.length; frame++) {
      try {
        const boundsFor = (part: typeof a): Bounds => {
          const cached = part.frameBounds.get(frame);
          if (cached) return cached;
          const basis = BOUND_FRAMES[frame];
          let bounds: Bounds;
          if (basis === null) bounds = paddedBounds(part.shape);
          else {
            const rotated = part.shape.clone().rotate(basis.axis, basis.degrees);
            try { bounds = paddedBounds(rotated); }
            finally { rotated.getReplicadShape().delete(); }
          }
          part.frameBounds.set(frame, bounds);
          return bounds;
        };
        const upper = overlapVolumeUpperBound(boundsFor(a), boundsFor(b));
        if (Number.isFinite(upper) && upper <= epsilonMm3) {
          boundedBelowThreshold = true;
          break;
        }
      } catch {
        break;
      }
    }
    if (boundedBelowThreshold) continue;

    const memoKey = `${a.poseKey}|${b.poseKey}`;
    let vol: number | undefined = memoGet(a.source, b.source, memoKey);
    try {
      if (vol === undefined) {
        vol = a.shape.intersectionVolume(b.shape);
        memoSet(a.source, b.source, memoKey, vol);
      }
    } catch (e) {
      diagnostics.push({
        target: 'export-occt', code: 'feature.kernel-failed', severity: 'warn',
        message: `interference probe failed on pair (${a.name}, ${b.name}): ${e instanceof Error ? e.message : String(e)}; overlap not measured.`,
        hint: 'Check both parts for degenerate geometry with evaluate_script, or add the pair to the ignore list if its clearance is established another way.',
      });
      continue;
    }
    if (vol > epsilonMm3) pairs.push({ a: a.name, b: b.name, volumeMm3: vol });
  }
  return {
    pairs,
    partCount: transformed.length,
    comparisonCount: candidates.length,
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
    a.min[0] <= b.max[0] &&
    a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] &&
    a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] &&
    a.max[2] >= b.min[2]
  );
}

interface Bounds {
  min: Vec3;
  max: Vec3;
}
const BOUND_FRAMES: readonly ({ axis: Vec3; degrees: number } | null)[] = [
  null,
  ...[-45, 45].flatMap((degrees) =>
    (
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as Vec3[]
    ).map((axis) => ({ axis, degrees })),
  ),
];

function paddedBounds(shape: OcctBackend): Bounds {
  // Preserve Bnd_Box tolerance padding; boundingBox() removes that gap,
  // and boundingBox({ exact: true }) uses non-conservative tessellation.
  const [min, max] = shape.getReplicadShape().boundingBox.bounds;
  return { min: [...min] as Vec3, max: [...max] as Vec3 };
}

function overlapVolumeUpperBound(a: Bounds, b: Bounds): number {
  return [0, 1, 2].reduce(
    (volume, axis) =>
      volume *
      Math.max(
        0,
        Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]),
      ),
    1,
  );
}
