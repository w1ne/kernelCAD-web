// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/clearance.ts
//
// W3 Task 4 — part-pair clearance check, the enforcement primitive behind
// `dfmSpec({ minClearance })`. For every unordered part pair of an
// already-resolved SceneBackend it reports the minimum surface-to-surface
// distance and whether it clears the declared threshold.
//
// Division of labour with the interference gate:
//   - OVERLAP (intersection volume > epsilon) belongs to
//     `detectInterferences` — this check tags such pairs 'interfering' and
//     emits NO clearance violation for them, so one defect never produces
//     two findings.
//   - Pairs the DFM orchestrator explicitly marks as mate-exempt and `ignore`d
//     pairs are design-intent contacts: recorded with their status, never
//     measured. The orchestrator keeps fastened mates exempt and may include
//     articulated mates in measurement when the declaration requests it.
//   - Pairs the kernel cannot measure are NOT silently passed: they are
//     recorded as 'unknown' so downstream consumers filtering on status see
//     them and can route the pair for manual attention.
//
// Enumeration idiom mirrors `detectInterferences`: clone each part's
// local-frame OCCT shape and apply its FK worldTransform once, up front
// (replicad transforms mutate-and-destroy the source handle, so the
// originals are never touched). Pair lookups use the same `pairKey`
// encoding.
//
// Diagnostics seam (consumed by the Task 7 orchestrator): a mutable
// `diagnostics` out-param appended in place — the same convention
// `detectInterferences` uses — so the orchestrator threads ONE array
// through every DFM check and returns it on the combined result. A kernel
// failure on a pair (BRepExtrema or the volume probe) records that pair as
// 'unknown' with `distanceMm: NaN` plus a warn-severity
// `feature.kernel-failed` diagnostic; the sweep never aborts. The up-front
// clone/applyTransform stage is guarded per part with the same stance: a
// part whose clone or transform throws gets ONE warn diagnostic and every
// pair touching it (after ignore/mate precedence) is recorded 'unknown' —
// the remaining pairs are still measured.

import { getOC } from 'replicad';
import type { SceneBackend } from '../../../kernel/backends/sceneBackend';
import { analysisBodyOf, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { isMeshBackend } from '../../../kernel/backends/meshBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { Transform } from '../../../shared/runtime/se3';
import { pairKey } from '../detectInterferences';
import { brepExtremaDistance, wrappedShape } from '../brepDistance';
import { extractPosedWorldMesh, measureMeshPairDistance, meshPairWorkWithinBudget, type PosedWorldMesh } from '../meshPairCheck';

export interface ClearancePairReport {
  a: string;
  b: string;
  /** Measured (or bbox-lower-bound) distance in mm. NaN for skipped pairs
   *  ('ignored' / 'mated') and for kernel-failed ('unknown') pairs. Note
   *  that NaN serializes to null in JSON — consumers must key off `status`,
   *  not the distance value. */
  distanceMm: number;
  /** 'unknown' = the distance measurement failed (kernel error); the pair
   *  needs manual attention. Precedence: ignored > mated > measurement
   *  outcome (bbox pass-through / exact classification). */
  status: 'ok' | 'violated' | 'ignored' | 'mated' | 'interfering' | 'unknown';
  /** false when the bbox lower bound already cleared the threshold (no
   *  BRepExtrema run), and on skipped / kernel-failed pairs. */
  exact: boolean;
  /** Intersection volume when `status` is `'interfering'`, so callers can
   *  preserve the shared interference evidence without repeating the BREP
   *  boolean operation. */
  interferenceVolumeMm3?: number;
}

export interface ClearanceCheckOptions {
  /** Measure every non-exempt pair with BRepExtrema, including pairs whose
   *  bbox lower bound already clears the threshold. Rest-pose DFM keeps the
   *  default false; sampled pose envelopes require exact distances. */
  forceExact?: boolean;
  /** Omit overlap volume when the caller only needs contact edges. */
  distanceOnly?: boolean;
}

/** One scene part, posed into the world frame for measurement. `shape` is
 *  the cloned BRep; `mesh` is the posed display-mesh triangle set. Both are
 *  undefined when the up-front pose stage failed for the part — its pairs are
 *  recorded as 'unknown'. */
export interface TransformedPart {
  name: string;
  shape?: OcctBackend;
  mesh?: PosedWorldMesh;
  bbox?: { min: [number, number, number]; max: [number, number, number] };
}

/** Distances below this are "surfaces touch or cross" — disambiguated by a
 *  boolean-intersection volume probe. */
const CONTACT_EPS_MM = 1e-7;

/** Intersection volume above this is real overlap (the `detectInterferences`
 *  default epsilon); at or below is numerical-artifact touching. */
const OVERLAP_EPSILON_MM3 = 0.01;

/**
 * Check every unordered part pair of `scene` against `minClearance` (mm).
 *
 * Status precedence: ignored > mated > measurement outcome — a pair listed
 * in `ignoredPairs` is 'ignored' even if it would otherwise classify as
 * 'interfering' or 'violated'; same for 'mated'.
 *
 * - `ignoredPairs` / `matedPairs` are `pairKey()`-encoded part-name pairs
 *   (from `dfmSpec.ignore` and the DFM orchestrator's mate-exemption policy
 *   respectively); both are recorded with their status and skipped without measurement
 *   (`distanceMm: NaN`, `exact: false`).
 * - Unless `options.forceExact` is set, pairs whose per-axis bbox gap (Euclidean lower bound on the true
 *   distance) already meets the threshold are passed through as
 *   `{ status: 'ok', exact: false }` with the bound as `distanceMm` — no
 *   BRepExtrema run.
 * - Touching/crossing pairs (distance < 1e-7 mm) are volume-probed: real
 *   overlap (> 0.01 mm³) ⇒ 'interfering' (owned by the interference gate,
 *   NOT a clearance violation); surface contact ⇒ 'violated' at 0 mm.
 * - Kernel failures (BRepExtrema or the volume probe) append a warn
 *   `feature.kernel-failed` diagnostic to `diagnostics` and record the pair
 *   as 'unknown' with `distanceMm: NaN` — the measurement failed and the
 *   pair needs manual attention; the sweep never aborts.
 */
export function checkClearance(
  scene: SceneBackend,
  minClearance: number,
  ignoredPairs: ReadonlySet<string>,
  matedPairs: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[] = [],
  options: ClearanceCheckOptions = {},
): ClearancePairReport[] {
  return Array.from(iterateClearance(scene, minClearance, ignoredPairs, matedPairs, diagnostics, options));
}

/** Stream reports so a caller can skip pairs using evidence from earlier measurements. */
export function* iterateClearance(
  scene: SceneBackend,
  minClearance: number,
  ignoredPairs: ReadonlySet<string>,
  matedPairs: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[] = [],
  options: ClearanceCheckOptions = {},
  includePair?: (a: string, b: string) => boolean,
): IterableIterator<ClearancePairReport> {
  // Clone + apply each part's worldTransform once, up front (the
  // detectInterferences / STEP-exporter pattern). Guarded per part: a
  // clone/transform kernel failure leaves `shape` undefined — every pair
  // touching that part is recorded 'unknown' below; the sweep continues.
  // An imported assembly larger than the mesh-probe budget is declined up
  // front for the same reason: every pair touching it stays 'unknown'
  // rather than being measured for an arbitrary prefix of pairs.
  const withinBudget = meshPairWorkWithinBudget(scene.parts.map((p) => p.shape));
  const transformed: TransformedPart[] = scene.parts.map((p) =>
    (isMeshBackend(p.shape) && !withinBudget ? { name: p.name } : transformScenePart(p, diagnostics)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  for (let i = 0; i < transformed.length; i++) {
    for (let j = i + 1; j < transformed.length; j++) {
      const a = transformed[i];
      const b = transformed[j];
      if (includePair && !includePair(a.name, b.name)) continue;
      const key = pairKey(a.name, b.name);

      if (ignoredPairs.has(key)) {
        yield { a: a.name, b: b.name, distanceMm: NaN, status: 'ignored', exact: false };
        continue;
      }
      if (matedPairs.has(key)) {
        yield { a: a.name, b: b.name, distanceMm: NaN, status: 'mated', exact: false };
        continue;
      }

      // Either side failed the up-front clone/transform stage (warn
      // diagnostic already emitted, once per part): nothing to measure.
      if (!hasMeasurableGeometry(a) || !hasMeasurableGeometry(b)) {
        yield { a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false };
        continue;
      }

      yield classifyMeasuredPair(a, b, minClearance, options, oc, diagnostics);
    }
  }
}

/** One scene part whose pose stage succeeded: BRep geometry or a display
 *  mesh is present, plus its world AABB. */
interface MeasuredPart extends TransformedPart {
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

function hasMeasurableGeometry(part: TransformedPart): part is MeasuredPart {
  return part.bbox !== undefined && (part.shape !== undefined || part.mesh !== undefined);
}

/** Transform one part into the world frame. Display meshes (KiCad / LabWired
 *  GLB hardware, STL boards) are posed as triangles; BRep parts keep the
 *  clone + applyTransform path. A failure emits ONE warn diagnostic and leaves
 *  the part unmeasurable. */
export function transformScenePart(
  p: SceneBackend['parts'][number],
  diagnostics: CompilerDiagnostic[],
): TransformedPart {
  if (isMeshBackend(p.shape)) return transformDisplayMeshPart(p, diagnostics);
  try {
    const clone = (analysisBodyOf(p.shape) as OcctBackend).clone().applyTransform(p.worldTransform);
    return { name: p.name, shape: clone, bbox: clone.boundingBox() };
  } catch (e) {
    diagnostics.push(poseFailure(p.name, e));
    return { name: p.name };
  }
}

function transformDisplayMeshPart(
  p: SceneBackend['parts'][number],
  diagnostics: CompilerDiagnostic[],
): TransformedPart {
  const mesh = extractPosedWorldMesh(p.shape, p.worldTransform);
  if (mesh === undefined) {
    diagnostics.push(poseFailure(p.name, new Error('display mesh has no triangles')));
    return { name: p.name };
  }
  return { name: p.name, mesh, bbox: { min: mesh.min, max: mesh.max } };
}

function poseFailure(name: string, error: unknown): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    severity: 'warn',
    message:
      `dfm.clearance: clone/transform failed for part '${name}' ` +
      `(${error instanceof Error ? error.message : String(error)}); its pairs are recorded as 'unknown'.`,
    hint:
      'The OCCT kernel could not clone or transform this part — check it for degenerate ' +
      'geometry with evaluate; pairs not touching it were still measured.',
  };
}

/** Measure one non-exempt pair with measurable geometry: bbox pre-filter,
 *  BRepExtrema, and the volume probe for touching pairs. */
function classifyMeasuredPair(
  a: MeasuredPart,
  b: MeasuredPart,
  minClearance: number,
  options: ClearanceCheckOptions,
  oc: unknown,
  diagnostics: CompilerDiagnostic[],
): ClearancePairReport {
  if (a.mesh !== undefined || b.mesh !== undefined) {
    return classifyMeshPair(a, b, minClearance, options, diagnostics);
  }
  const shapeA = a.shape;
  const shapeB = b.shape;
  if (shapeA === undefined || shapeB === undefined) {
    return { a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false };
  }
  const lowerBound = bboxGap(a.bbox, b.bbox);
  if (!options.forceExact && lowerBound >= minClearance) {
    return { a: a.name, b: b.name, distanceMm: lowerBound, status: 'ok', exact: false };
  }

  let d: number | undefined;
  try {
    d = brepExtremaDistance(oc, wrappedShape(shapeA), wrappedShape(shapeB));
  } catch {
    d = undefined;
  }
  if (d === undefined) {
    // Never abort the sweep on a kernel failure (same resilience stance
    // as detectInterferences' per-pair try/catch).
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      severity: 'warn',
      message: `dfm.clearance: BRepExtrema_DistShapeShape failed on pair (${a.name}, ${b.name}); distance not measured.`,
      hint: 'The OCCT distance kernel could not process this part pair — check both parts for degenerate geometry with evaluate, or list the pair in dfmSpec.ignore if its clearance is established another way.',
    });
    return { a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false };
  }

  if (d < CONTACT_EPS_MM) {
    if (options.distanceOnly) return { a: a.name, b: b.name, distanceMm: 0, status: 'violated', exact: true };
    // Touching or crossing: a boolean-intersection volume probe decides
    // which (volume-only; neither operand is consumed).
    let volume: number | undefined;
    try {
      volume = shapeA.intersectionVolume(shapeB);
    } catch {
      volume = undefined;
    }
    if (volume === undefined) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        severity: 'warn',
        message: `dfm.clearance: boolean-intersection volume probe failed on touching pair (${a.name}, ${b.name}); contact vs overlap not resolved.`,
        hint: 'The OCCT boolean kernel could not probe this part pair — check both parts for degenerate geometry with evaluate, or list the pair in dfmSpec.ignore if its clearance is established another way.',
      });
      return { a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false };
    }
    if (volume > OVERLAP_EPSILON_MM3) {
      return {
        a: a.name,
        b: b.name,
        distanceMm: 0,
        status: 'interfering',
        exact: true,
        interferenceVolumeMm3: volume,
      };
    }
    return { a: a.name, b: b.name, distanceMm: 0, status: 'violated', exact: true };
  }

  return {
    a: a.name,
    b: b.name,
    distanceMm: d,
    status: d < minClearance ? 'violated' : 'ok',
    exact: true,
  };
}

/** Display-mesh pair (or a BRep paired with a display mesh): the triangle
 *  BVH engine measures the exact surface distance and overlap. The exact
 *  BRep-vs-BRep path above is never used here, so its semantics stay intact. */
function classifyMeshPair(
  a: MeasuredPart,
  b: MeasuredPart,
  minClearance: number,
  options: ClearanceCheckOptions,
  diagnostics: CompilerDiagnostic[],
): ClearancePairReport {
  const lowerBound = bboxGap(a.bbox, b.bbox);
  if (!options.forceExact && lowerBound >= minClearance) {
    return { a: a.name, b: b.name, distanceMm: lowerBound, status: 'ok', exact: false };
  }
  const meshA = posedMeshOf(a);
  const meshB = posedMeshOf(b);
  if (meshA === undefined || meshB === undefined) {
    diagnostics.push(meshPoseFailure(a.name, b.name));
    return { a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false };
  }
  const measured = measureMeshPairDistance(meshA, meshB, minClearance, options);
  if (!Number.isFinite(measured.distanceMm)) {
    diagnostics.push(meshPoseFailure(a.name, b.name));
    return { a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false };
  }
  if (measured.overlapping) {
    return {
      a: a.name,
      b: b.name,
      distanceMm: 0,
      status: 'interfering',
      exact: true,
      interferenceVolumeMm3: measured.overlapVolumeMm3 ?? 0,
    };
  }
  return {
    a: a.name,
    b: b.name,
    distanceMm: measured.distanceMm,
    status: measured.distanceMm < minClearance ? 'violated' : 'ok',
    exact: true,
  };
}

/** World-space mesh of one measured part: the pre-posed display mesh, or the
 *  already-world BRep clone (identity transform). */
function posedMeshOf(part: MeasuredPart): PosedWorldMesh | undefined {
  if (part.mesh !== undefined) return part.mesh;
  if (part.shape === undefined) return undefined;
  return extractPosedWorldMesh(part.shape, Transform.identity());
}

function meshPoseFailure(a: string, b: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    severity: 'warn',
    message: `dfm.clearance: mesh distance could not be measured on pair (${a}, ${b}); distance not measured.`,
    hint: 'Check the display mesh for empty or degenerate triangles, or list the pair in dfmSpec.ignore if its clearance is established another way.',
  };
}

/** Euclidean lower bound on the distance between two parts from their
 *  axis-aligned bboxes: per-axis `max(0, gap)`, combined. 0 when the
 *  bboxes overlap on every axis. */
export function bboxGap(
  a: { min: [number, number, number]; max: [number, number, number] },
  b: { min: [number, number, number]; max: [number, number, number] },
): number {
  let sq = 0;
  for (let axis = 0; axis < 3; axis++) {
    const gap = Math.max(0, b.min[axis] - a.max[axis], a.min[axis] - b.max[axis]);
    sq += gap * gap;
  }
  return Math.sqrt(sq);
}
