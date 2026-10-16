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
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Vec3 } from '../../shared/intent/types';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { overlapThicknessMm } from './jointContactCap';
import { Transform } from '../../shared/runtime/se3';

/** A single (part_a, part_b) pair whose intersection has non-trivial volume. */
export interface InterferencePair {
  readonly a: string;
  readonly b: string;
  /** Intersection volume in mm³. Always > epsilon. */
  readonly volumeMm3: number;
  /** Mean thickness (mm) of the shared region, 2·V/A of the common solid.
   *  Tells face contact from a real overlap (`isActionableOverlap`). */
  readonly thicknessMm?: number;
}

export interface CheckInterferenceResult {
  readonly pairs: InterferencePair[];
  readonly partCount: number;
  readonly comparisonCount: number;
  readonly diagnostics: CompilerDiagnostic[];
  /** Mesh-involving pairs were not checked because exact intersection requires BRep. */
  readonly uncheckedPairs: Array<{ readonly a: string; readonly b: string; readonly reason: 'display-mesh' }>;
  readonly partial: boolean;
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
interface OverlapMetrics { volumeMm3: number; thicknessMm?: number }

const intersectionVolumeMemo = new WeakMap<object, WeakMap<object, Map<string, OverlapMetrics>>>();

function measureOverlap(a: OcctBackend, b: OcctBackend): OverlapMetrics {
  if (typeof a.intersectionMetrics !== 'function') return { volumeMm3: a.intersectionVolume(b) };
  const m = a.intersectionMetrics(b);
  return { volumeMm3: m.volumeMm3, thicknessMm: overlapThicknessMm(m.volumeMm3, m.areaMm2) };
}

/**
 * Overlap of two posed parts. When both are placements of the same
 * underlying shape (pattern instances), one is deep-copied so the boolean
 * never gets two operands that share geometry.
 */
function measureOverlapOfPosed(a: PosedPart, b: PosedPart): OverlapMetrics {
  if (!a.shape.sharesGeometryWith(b.shape)) return measureOverlap(a.shape, b.shape);
  const copy = (b.source as OcctBackend).clone().applyTransform(b.worldTransform);
  try {
    return measureOverlap(a.shape, copy);
  } finally {
    copy.dispose();
  }
}

function memoGet(a: object, b: object, key: string): OverlapMetrics | undefined {
  return intersectionVolumeMemo.get(a)?.get(b)?.get(key);
}

function memoSet(a: object, b: object, key: string, vol: OverlapMetrics): void {
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

/** Pairs involving a non-BRep (display mesh) part: exact intersection needs
 *  BRep, so these are reported as unchecked instead of silently skipped. */
function listDisplayMeshPairs(
  parts: ReadonlyArray<{ readonly name: string; readonly shape: unknown }>,
): CheckInterferenceResult['uncheckedPairs'] {
  const pairs: CheckInterferenceResult['uncheckedPairs'] = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i]!;
      const b = parts[j]!;
      if (!(a.shape instanceof OcctBackend) || !(b.shape instanceof OcctBackend)) {
        pairs.push({ a: a.name, b: b.name, reason: 'display-mesh' });
      }
    }
  }
  return pairs;
}

export function detectInterferences(
  scene: SceneBackend,
  epsilonMm3: number,
  ignored: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[] = [],
): CheckInterferenceResult {
  // Place each part at its worldTransform once, up front, through a
  // location (`OcctBackend.located`): the posed shape shares the part's
  // geometry, so posing costs no copy. A deep copy per part per sampled pose
  // (applyTransform) cost ~8 MB and ~0.15 s for each 7k-face STL part of the
  // SO-100 arm and, with GC-deferred frees, fragmented the WASM heap until
  // OCCT aborted on pose 8 of 14. The originals are never touched.
  const uncheckedPairs = listDisplayMeshPairs(scene.parts);
  const transformed: PosedPart[] = scene.parts.filter((p) => p.shape instanceof OcctBackend).map((p) => {
    const posed = (p.shape as OcctBackend).located(p.worldTransform);
    return {
      name: p.name,
      shape: posed,
      bbox: posed.boundingBox(),
      source: p.shape as object,
      worldTransform: p.worldTransform,
      poseKey: transformKey(p.worldTransform),
      frameBounds: new Map<number, Bounds>(),
    };
  });

  // Free the posed handles when the probe is done rather than leaving them
  // to the GC (they reference the parts' shapes and, after a boolean, any
  // data OCCT attached to them).
  try {
    return probeCandidates(transformed, epsilonMm3, ignored, diagnostics, uncheckedPairs);
  } finally {
    for (const part of transformed) part.shape.dispose();
  }
}

interface PosedPart {
  name: string;
  shape: OcctBackend;
  worldTransform: SceneBackend['parts'][number]['worldTransform'];
  bbox: { min: [number, number, number]; max: [number, number, number] };
  source: object;
  poseKey: string;
  frameBounds: Map<number, Bounds>;
}

function probeCandidates(
  transformed: PosedPart[],
  epsilonMm3: number,
  ignored: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[],
  uncheckedPairs: CheckInterferenceResult['uncheckedPairs'],
): CheckInterferenceResult {
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
            const rotated = part.shape.located(Transform.rotationAxisAngleDeg(basis.axis, basis.degrees));
            try { bounds = paddedBounds(rotated); }
            finally { rotated.dispose(); }
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
    let vol: OverlapMetrics | undefined = memoGet(a.source, b.source, memoKey);
    try {
      if (vol === undefined) {
        vol = measureOverlapOfPosed(a, b);
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
    if (vol.volumeMm3 > epsilonMm3) {
      pairs.push({
        a: a.name, b: b.name, volumeMm3: vol.volumeMm3,
        ...(vol.thicknessMm !== undefined && Number.isFinite(vol.thicknessMm) ? { thicknessMm: vol.thicknessMm } : {}),
      });
    }
  }
  return {
    pairs,
    partCount: transformed.length,
    comparisonCount: candidates.length,
    diagnostics,
    uncheckedPairs,
    partial: uncheckedPairs.length > 0,
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
