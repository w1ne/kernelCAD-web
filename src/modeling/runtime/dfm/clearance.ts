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
//   - Mated pairs (joined by a declared mate) and `ignore`d pairs are
//     design-intent contacts: recorded with their status, never measured.
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
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { pairKey } from '../detectInterferences';
import { brepExtremaDistance, wrappedShape } from '../brepDistance';

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
}

/** One scene part, cloned into the world frame for measurement. `shape` and
 *  `bbox` are undefined when the up-front clone/applyTransform stage failed
 *  for the part — its pairs are recorded as 'unknown'. */
interface TransformedPart {
  name: string;
  shape?: OcctBackend;
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
 *   (from `dfmSpec.ignore` and `Assembly.__mates()` respectively); both are
 *   recorded with their status and skipped without measurement
 *   (`distanceMm: NaN`, `exact: false`).
 * - Pairs whose per-axis bbox gap (Euclidean lower bound on the true
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
): ClearancePairReport[] {
  // Clone + apply each part's worldTransform once, up front (the
  // detectInterferences / STEP-exporter pattern). Guarded per part: a
  // clone/transform kernel failure leaves `shape` undefined — every pair
  // touching that part is recorded 'unknown' below; the sweep continues.
  const transformed: TransformedPart[] = scene.parts.map((p) => {
    try {
      const clone = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform);
      return { name: p.name, shape: clone, bbox: clone.boundingBox() };
    } catch (e) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        severity: 'warn',
        message:
          `dfm.clearance: clone/transform failed for part '${p.name}' ` +
          `(${e instanceof Error ? e.message : String(e)}); its pairs are recorded as 'unknown'.`,
        hint:
          'The OCCT kernel could not clone or transform this part — check it for degenerate ' +
          'geometry with evaluate; pairs not touching it were still measured.',
      });
      return { name: p.name };
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const reports: ClearancePairReport[] = [];

  for (let i = 0; i < transformed.length; i++) {
    for (let j = i + 1; j < transformed.length; j++) {
      const a = transformed[i];
      const b = transformed[j];
      const key = pairKey(a.name, b.name);

      if (ignoredPairs.has(key)) {
        reports.push({ a: a.name, b: b.name, distanceMm: NaN, status: 'ignored', exact: false });
        continue;
      }
      if (matedPairs.has(key)) {
        reports.push({ a: a.name, b: b.name, distanceMm: NaN, status: 'mated', exact: false });
        continue;
      }

      // Either side failed the up-front clone/transform stage (warn
      // diagnostic already emitted, once per part): nothing to measure.
      if (a.shape === undefined || a.bbox === undefined
        || b.shape === undefined || b.bbox === undefined) {
        reports.push({ a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false });
        continue;
      }

      const lowerBound = bboxGap(a.bbox, b.bbox);
      if (lowerBound >= minClearance) {
        reports.push({ a: a.name, b: b.name, distanceMm: lowerBound, status: 'ok', exact: false });
        continue;
      }

      let d: number | undefined;
      try {
        d = brepExtremaDistance(oc, wrappedShape(a.shape), wrappedShape(b.shape));
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
        reports.push({ a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false });
        continue;
      }

      if (d < CONTACT_EPS_MM) {
        // Touching or crossing: a boolean-intersection volume probe decides
        // which. Clones — .intersect consumes its operands.
        let volume: number | undefined;
        try {
          const inter = a.shape.clone().intersect(b.shape.clone());
          volume = inter.isEmpty() ? 0 : inter.volume();
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
          reports.push({ a: a.name, b: b.name, distanceMm: NaN, status: 'unknown', exact: false });
          continue;
        }
        if (volume > OVERLAP_EPSILON_MM3) {
          reports.push({ a: a.name, b: b.name, distanceMm: 0, status: 'interfering', exact: true });
        } else {
          reports.push({ a: a.name, b: b.name, distanceMm: 0, status: 'violated', exact: true });
        }
        continue;
      }

      reports.push({
        a: a.name,
        b: b.name,
        distanceMm: d,
        status: d < minClearance ? 'violated' : 'ok',
        exact: true,
      });
    }
  }
  return reports;
}

/** Euclidean lower bound on the distance between two parts from their
 *  axis-aligned bboxes: per-axis `max(0, gap)`, combined. 0 when the
 *  bboxes overlap on every axis. */
function bboxGap(
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
