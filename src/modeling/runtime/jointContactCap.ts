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
// SolidWorks "Ignore" / press-fit escape hatch. The threshold is uniform
// across mate types but not across part sizes: `pairContactCapMm3` lowers it
// for small parts (0.2 % of the smaller part, 1..20 mm³).

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

/**
 * The 20 mm³ cap is sized for arm-class hardware. Across a MOVING joint
 * (revolute, prismatic, cylindrical, planar, ball, pin-slot — a running fit,
 * ~0 overlap per ISO 286) it is a large allowance on a small part: a butt
 * hinge whose 40 × 27 × 2 leaves (~2400 mm³ each) have knuckles overlapping
 * axially by 0.1 mm shares ~10 mm³ — a real interference that the bare 20 mm³
 * cap passed. For a running-fit pair the cap therefore also scales with the
 * SMALLER part: 0.2 % of its volume, never below `CONTACT_NOISE_FLOOR_MM3`
 * and never above `JOINT_CONTACT_NOISE_MM3`. The same hinge with a 0.4 mm
 * gap (leaf plate grazing the other knuckle, 1.13 mm³) or line-to-line
 * knuckles (1.9 mm³) stays contact noise; a 0.05 mm knuckle overlap (~6 mm³)
 * is caught. Fastened and unmated pairs keep the uniform cap: a screw seated
 * in its boss legitimately shares a few mm³ (thread engagement, a modelled
 * shank in a tapped hole), which a running fit never does.
 */
export const CONTACT_NOISE_PART_FRACTION = 0.002;

/** Lower bound of the per-pair cap (mm³), so sub-cm³ parts are not judged on
 *  boolean slivers far below any print or machining tolerance. */
export const CONTACT_NOISE_FLOOR_MM3 = 1;

/** A pair's shared volume plus, when known, the volume of the smaller of
 *  its two parts and whether a moving (running-fit) joint connects them. */
export interface ContactNoisePair {
  readonly volumeMm3: number;
  readonly smallerPartVolumeMm3?: number;
  readonly runningFit?: boolean;
}

/** The contact-noise cap (mm³) for one pair: `jointContactCapMm3()`, scaled
 *  down for small parts across a running-fit joint (see
 *  `CONTACT_NOISE_PART_FRACTION`). Falls back to the uniform cap for other
 *  pairs and when the part volume is unknown. */
export function pairContactCapMm3(pair: Omit<ContactNoisePair, 'volumeMm3'>): number {
  const v = pair.smallerPartVolumeMm3;
  const uniform = jointContactCapMm3();
  if (pair.runningFit !== true || v === undefined || !Number.isFinite(v) || v <= 0) return uniform;
  return Math.min(uniform, Math.max(CONTACT_NOISE_FLOOR_MM3, v * CONTACT_NOISE_PART_FRACTION));
}

/** True when the pair's shared volume is a real interference, not contact noise. */
export function isActionableInterference(pair: ContactNoisePair): boolean {
  return pair.volumeMm3 > pairContactCapMm3(pair);
}
