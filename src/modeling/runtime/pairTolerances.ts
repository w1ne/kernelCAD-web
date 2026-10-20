// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/pairTolerances.ts
//
// Per-pair contact and clearance declarations for `Assembly.solvedModel`.
//
// The default interference rule is intentionally strict: any shared volume
// above 0.01 mm³ and thicker than 0.01 mm is an error, and the only escape
// hatch is an all-or-nothing `ignore` pair. Real assemblies also contain
// intended press fits, seated lips and slivers, so this module turns
// "intended contact" into a measured budget:
//
//   contacts:    parts: [a, b], maxVolumeMm3?, maxThicknessMm?
//   clearances:  parts: [a, b], minMm
//
// Contacts accept an overlap only while it stays inside the declared budget;
// an overlap above the budget is still an error and says which limit was
// exceeded. Clearances go the other way: the pair must stay separated by at
// least `minMm`, measured with the same exact BREP distance primitive the
// DFM clearance gate uses. Only declared pairs are measured, so the check is
// O(declarations), not O(parts²).
//
// This module is deliberately pure/stateless. `solvedModel` owns validation
// and reporting; `detectInterferences` owns the incremental pose-sweep
// cache. See `IncrementalInterferenceOptions` there.

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { invalidArgsText } from '../../shared/intent/invalidArgs';
import { pairKey, type InterferencePair } from './detectInterferences';
import { minDistanceBetweenShapes, wrappedShape } from './brepDistance';

/** A pair that is allowed to share a bounded amount of material. At least
 *  one bound should be given; a declaration with neither is the explicit
 *  equivalent of `ignore` (any overlap is accepted). */
export interface PairContactTolerance {
  readonly parts: readonly [string, string];
  /** Largest accepted shared volume in mm³. */
  readonly maxVolumeMm3?: number;
  /** Largest accepted mean shared-region thickness in mm. */
  readonly maxThicknessMm?: number;
  /** Authoring note carried into diagnostics / review metadata. */
  readonly reason?: string;
}

/** A pair that must remain separated by at least `minMm` of air. */
export interface PairClearanceTolerance {
  readonly parts: readonly [string, string];
  /** Minimum surface-to-surface distance in mm (>= 0). */
  readonly minMm: number;
  /** Authoring note carried into diagnostics / review metadata. */
  readonly reason?: string;
}

export interface PairClearanceResult {
  readonly a: string;
  readonly b: string;
  readonly minMm: number;
  /** Measured distance, or NaN when the pair could not be measured. */
  readonly distanceMm: number;
  readonly status: 'ok' | 'violated' | 'unknown';
}

/** The subset of an interference pair this module reads. */
type MeasuredPair = Pick<InterferencePair, 'a' | 'b' | 'volumeMm3' | 'thicknessMm'>;

/** Symmetric lookup table for contact declarations. */
export function contactMap(
  contacts: readonly PairContactTolerance[] | undefined,
): Map<string, PairContactTolerance> {
  const out = new Map<string, PairContactTolerance>();
  for (const contact of contacts ?? []) out.set(pairKey(contact.parts[0], contact.parts[1]), contact);
  return out;
}

/** True when the pair's measured overlap is inside the declared budget. */
export function contactAccepts(
  pair: MeasuredPair,
  contact: PairContactTolerance | undefined,
): boolean {
  if (contact === undefined) return false;
  if (contact.maxVolumeMm3 !== undefined && pair.volumeMm3 > contact.maxVolumeMm3) return false;
  if (
    contact.maxThicknessMm !== undefined
    && pair.thicknessMm !== undefined
    && pair.thicknessMm > contact.maxThicknessMm
  ) {
    return false;
  }
  return true;
}

/** Human-readable budget, used in the "still too much" diagnostic. */
export function describeContactBudget(contact: PairContactTolerance): string {
  const limits: string[] = [];
  if (contact.maxVolumeMm3 !== undefined) limits.push(`max ${contact.maxVolumeMm3} mm³`);
  if (contact.maxThicknessMm !== undefined) limits.push(`max ${contact.maxThicknessMm} mm thick`);
  return limits.length > 0 ? limits.join(' / ') : 'no numeric budget (explicit intentional contact)';
}

/** Which part of the budget the measured overlap exceeded. */
export function describeContactExcess(pair: MeasuredPair, contact: PairContactTolerance): string {
  const parts: string[] = [];
  if (contact.maxVolumeMm3 !== undefined && pair.volumeMm3 > contact.maxVolumeMm3) {
    parts.push(`volume ${pair.volumeMm3.toPrecision(3)} mm³ > ${contact.maxVolumeMm3} mm³`);
  }
  if (
    contact.maxThicknessMm !== undefined
    && pair.thicknessMm !== undefined
    && pair.thicknessMm > contact.maxThicknessMm
  ) {
    parts.push(`thickness ${pair.thicknessMm.toPrecision(3)} mm > ${contact.maxThicknessMm} mm`);
  }
  return parts.join(', ');
}

/**
 * Measure every declared clearance pair. Declared pairs only, so the cost is
 * proportional to the declarations rather than the full pair matrix.
 *
 * A missing part name yields `unknown` with a warn diagnostic instead of
 * throwing: declarations are validated at capture entry, but a caller may
 * hand this helper a scene from another assembly.
 *
 * Overlap counts as a clearance violation (distance 0) — the interference
 * gate owns the "by how much" evidence for that case, so this helper only
 * classifies the pair.
 */
export function measureDeclaredClearances(
  scene: SceneBackend,
  clearances: readonly PairClearanceTolerance[] | undefined,
  diagnostics: CompilerDiagnostic[] = [],
): PairClearanceResult[] {
  const results: PairClearanceResult[] = [];
  if (clearances === undefined || clearances.length === 0) return results;
  const byName = new Map(scene.parts.map((part) => [part.name, part] as const));

  for (const declaration of clearances) {
    const [aName, bName] = declaration.parts;
    const a = byName.get(aName);
    const b = byName.get(bName);
    if (a === undefined || b === undefined) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        severity: 'warn',
        ...invalidArgsText({
          api: 'assembly.solvedModel({ clearances })',
          path: 'clearances[].parts',
          gotText: `(${aName}, ${bName})`,
          requires: 'two part names present on this assembly',
          hintSlug: 'invalid-args.assembly.pair-tolerance',
          example: "clearances: [{ parts: ['base', 'lid'], minMm: 0.4 }]",
        }),
      });
      results.push({ a: aName, b: bName, minMm: declaration.minMm, distanceMm: Number.NaN, status: 'unknown' });
      continue;
    }
    results.push(measureOnePair(aName, bName, a, b, declaration.minMm, diagnostics));
  }
  return results;
}

function measureOnePair(
  aName: string,
  bName: string,
  a: SceneBackend['parts'][number],
  b: SceneBackend['parts'][number],
  minMm: number,
  diagnostics: CompilerDiagnostic[],
): PairClearanceResult {
  if (!(a.shape instanceof OcctBackend) || !(b.shape instanceof OcctBackend)) {
    return { a: aName, b: bName, minMm, distanceMm: Number.NaN, status: 'unknown' };
  }
  let posedA: OcctBackend | undefined;
  let posedB: OcctBackend | undefined;
  try {
    posedA = (a.shape as OcctBackend).clone().applyTransform(a.worldTransform);
    posedB = (b.shape as OcctBackend).clone().applyTransform(b.worldTransform);
    const lowerBound = bboxGap(posedA.boundingBox(), posedB.boundingBox());
    if (lowerBound >= minMm) {
      return { a: aName, b: bName, minMm, distanceMm: lowerBound, status: 'ok' };
    }
    const measured = minDistanceBetweenShapes(wrappedShape(posedA), wrappedShape(posedB));
    if (measured === undefined || !Number.isFinite(measured)) {
      return { a: aName, b: bName, minMm, distanceMm: Number.NaN, status: 'unknown' };
    }
    return {
      a: aName,
      b: bName,
      minMm,
      distanceMm: measured,
      status: measured + 1e-7 >= minMm ? 'ok' : 'violated',
    };
  } catch (e) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      severity: 'warn',
      message:
        `clearance probe failed on pair (${aName}, ${bName}): `
        + `${e instanceof Error ? e.message : String(e)}; clearance not measured.`,
      hint: 'Repair degenerate geometry, or declare the pair as a contact if the parts are intended to touch.',
    });
    return { a: aName, b: bName, minMm, distanceMm: Number.NaN, status: 'unknown' };
  } finally {
    posedA?.dispose();
    posedB?.dispose();
  }
}

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
