// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/jointContactCap.ts
//
// Shared interference classification for the mechanism-validity harness.
//
// SOTA-grounded model (2026-06-03 research — Onshape `evCollision`
// INTERFERE-vs-ABUT, ISO 286 running fits, MuJoCo/Drake/MoveIt adjacency
// filtering, ForgeCAD's absolute 0.1 mm³ floor; see
// kernelCAD-private/docs/specs/2026-06-03-harness-build-blocking-mechanism-validity-design.md):
//
//   - Interference is judged by an ABSOLUTE shared-volume threshold, NEVER a
//     fraction of part bounding-box. The old 5 %-of-bbox rule scaled the
//     allowance with part SIZE — a 165 000 mm³ beam got an 8253 mm³ free-merge
//     budget, which let a 7103 mm³ shade-fused-into-beam pass as `mechanism:
//     real`.
//   - A correctly-modeled rotating joint is a clearance fit (ISO 286) → ~0
//     shared volume. The clevis primitive now drills a pin clearance bore
//     through BOTH knuckles (decision #2), so the pin floats in air and
//     pin-in-tongue shared volume is ~0 — there is no longer any intended
//     bulk overlap at a revolute joint, so there is no per-mate-type carve-out.
//
// 2026-10-15: the 20 mm³ "contact-noise" volume cap is gone. On small parts
// (3 mm plywood, M2 screws) 10 mm³ is a real collision: the DRAW-01 drawing
// robot had a pencil 0.54 mm deep in its arm (10.0 mm³), a deck 0.41 mm deep
// in its cradle (8.5 mm³) and a 0.044 mm³ tie overlap, all reported clean.
// Touching is now told apart by GEOMETRY: coincident faces give a common
// solid of ~0 volume or a sliver thinner than CONTACT_THICKNESS_MM. Any
// thicker shared region above the volume floor is an interference.
//
// Decision #1 (locked): a SINGLE rule applies UNIFORMLY to
// every pair, regardless of the mate type joining them. Adjacency does NOT
// excuse a real overlap (Onshape: a mate between parts does not auto-classify
// their interference as acceptable; ISO 286: a running fit has ~0 solid
// overlap). The ONLY way to excuse a genuine overlap is the existing per-pair
// user `ignore` list passed to `solvedModel({ ignore: [...] })` — the
// SolidWorks "Ignore" / press-fit escape hatch.

/**
 * Absolute "any overlap at all" floor (mm³). Shared volume at or below this is
 * not even counted as an overlap — it is BREP boolean roundoff, below the
 * resolution of the interference detector.
 */
export const INTERPENETRATION_EPSILON_MM3 = 0.01;

/**
 * Mean thickness (mm) at or below which a shared region is face contact, not
 * an overlap: coincident faces, tessellation slivers on seated parts. Mean
 * thickness of the BREP common solid is 2·V/A (V its volume, A its boundary
 * area) — exact for a thin slab of any orientation.
 */
export const CONTACT_THICKNESS_MM = 0.01;

/** Mean thickness (mm) of a shared region of volume V and boundary area A. */
export function overlapThicknessMm(volumeMm3: number, areaMm2: number): number {
  return areaMm2 > 0 ? (2 * volumeMm3) / areaMm2 : Infinity;
}

/** An overlap as measured: volume, and mean thickness when known. */
export interface MeasuredOverlap {
  readonly volumeMm3: number;
  /** Mean thickness (mm). Absent / null / non-finite = unknown. */
  readonly thicknessMm?: number | null;
  /** World-frame bounds of the shared region, when measured. */
  readonly overlapBounds?: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
  };
}

/**
 * THE interference rule. Every consumer (validator, review summary, pose
 * envelope, mechanism-truth sweep, animation verify, rest-pose check, Studio)
 * calls this, so no path hides an overlap another path reports.
 *
 * An overlap is real when its volume exceeds INTERPENETRATION_EPSILON_MM3 and
 * it is NOT a contact sliver (mean thickness ≤ `contactThicknessMm`). Unknown
 * thickness counts as real: a small volume alone never excuses an overlap.
 * `contactThicknessMm` is raised only by a measurement with a coarser noise
 * floor (the rest-pose mesh voxel integral).
 */
export function isActionableOverlap(
  overlap: MeasuredOverlap,
  contactThicknessMm: number = CONTACT_THICKNESS_MM,
): boolean {
  if (!(overlap.volumeMm3 > INTERPENETRATION_EPSILON_MM3)) return false;
  const t = overlap.thicknessMm;
  if (typeof t !== 'number' || Number.isNaN(t)) return true;
  return t > contactThicknessMm;
}

/** Human-readable statement of the rule, for diagnostics. */
export function overlapRuleText(contactThicknessMm: number = CONTACT_THICKNESS_MM): string {
  return `overlap > ${INTERPENETRATION_EPSILON_MM3} mm³ and thicker than ${contactThicknessMm} mm (thinner = face contact)`;
}

/** Overlap volume (mm³) with enough digits that 0.044 never prints as 0.0. */
export function formatOverlapMm3(volumeMm3: number): string {
  return volumeMm3 >= 1 ? volumeMm3.toFixed(2) : volumeMm3.toPrecision(2);
}

/** "1.43 mm³ (0.21 mm thick)" — volume, plus mean thickness when known. */
export function describeOverlap(overlap: MeasuredOverlap): string {
  const t = overlap.thicknessMm;
  const thick = typeof t === 'number' && Number.isFinite(t) ? ` (${t.toPrecision(2)} mm thick)` : '';
  return `${formatOverlapMm3(overlap.volumeMm3)} mm³${thick}`;
}

/** "near (12.4, -3.0, 44.1)" — the centre of the shared region when known.
 *  Returns an empty string when the probe did not carry bounds, so callers
 *  can append it unconditionally. */
export function describeOverlapLocation(overlap: MeasuredOverlap): string {
  const b = overlap.overlapBounds;
  if (b === undefined) return '';
  const c = [0, 1, 2].map((axis) => (b.min[axis] + b.max[axis]) / 2);
  return ` near (${c.map((v) => v.toFixed(1)).join(', ')})`;
}
