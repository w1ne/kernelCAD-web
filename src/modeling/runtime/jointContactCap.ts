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
// Decision #1 (locked): a SINGLE absolute noise threshold applies UNIFORMLY to
// every pair, regardless of the mate type joining them. Adjacency does NOT
// excuse a real overlap (Onshape: a mate between parts does not auto-classify
// their interference as acceptable; ISO 286: a running fit has ~0 solid
// overlap). The ONLY way to excuse a genuine overlap is the existing per-pair
// user `ignore` list passed to `solvedModel({ ignore: [...] })` — the
// SolidWorks "Ignore" / press-fit escape hatch.

/**
 * Absolute "any overlap at all" floor (mm³). Shared volume at or below this is
 * not even counted as an overlap — it is BREP boolean / tessellation roundoff,
 * below the resolution of the interference detector.
 */
export const INTERPENETRATION_EPSILON_MM3 = 0.01;

/**
 * The single uniform contact-noise threshold (mm³). Shared volume in the band
 * (`INTERPENETRATION_EPSILON_MM3`, `JOINT_CONTACT_NOISE_MM3`] is treated as
 * coincident-face touching / coarse-mesh tessellation slivers (ISO-grounded:
 * a clearance-fit joint tolerates ~20 mm³ of tessellation noise on arm-class
 * hardware). Anything STRICTLY ABOVE 20 mm³ is a real interference and marks
 * the mechanism broken — for ALL pairs, adjacent or not (decision #1). Tighten
 * to ~5 mm³ with fine tessellation; target is 0.
 */
export const JOINT_CONTACT_NOISE_MM3 = 20;

/**
 * The absolute shared-volume cap (mm³) below which an overlap between two parts
 * is touching / tessellation noise rather than a real interference. The cap is
 * UNIFORM across all pairs regardless of the mate type joining them (decision
 * #1: no per-mate-type carve-out; a revolute joint is a clearance fit with ~0
 * overlap, not a bulk-contact one). Exposed as a function (rather than the bare
 * `JOINT_CONTACT_NOISE_MM3` constant) so the interference classifiers in
 * `mechanismTruth.ts` (criterion 2) and `validator.ts` share one definition of
 * the threshold.
 */
export function jointContactCapMm3(): number {
  return JOINT_CONTACT_NOISE_MM3;
}
