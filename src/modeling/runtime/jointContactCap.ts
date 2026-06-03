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
//     shared volume. The ONE forced exception is the clevis pin embedded in the
//     SOLID tongue: the locked joint-mesh-gap gate (criterion 7) requires the
//     child tongue to stay solid at the pivot, so the parent pin embeds by
//     `π·pinR²·tongueY` (e.g. 3.5 mm pin × 14 mm tongue = 539 mm³). That contact
//     is between ADJACENT jointed links — the case MuJoCo/Drake/MoveIt exempt
//     structurally. We exempt it too, but with an absolute cap sized to a clevis
//     pin-in-tongue (size-independent), not a bbox fraction.
//
// FOLLOW-UP: plumb the exact `π·pinR²·tongueY` per mate from the clevis
// primitive so the revolute cap is exact rather than a conservative flat value.

/**
 * Absolute volume cap (mm³) for the intended pin-in-tongue contact at an
 * adjacent revolute / prismatic / cylindrical mate. 700 covers arm-class clevis
 * pins (pinR ≤ ~4, tongueY ≤ ~14 → ≤ ~539 mm³) with margin, while still failing
 * the order-of-magnitude gross merges a broken mechanism produces (the
 * shade-in-beam was 7103 mm³).
 */
// NOTE: the clevis primitive's inherent joint overlap is pin-in-tongue
// (π·pinR²·tongueY) PLUS the child link body near the fork; for a canonical
// arm-class clevis this reaches ~2 000 mm³. A flat cap cannot perfectly separate
// a legit clevis from a small real merge (their volumes overlap) — the proper
// fix is a PER-MATE cap computed from each clevis's pin geometry (FOLLOW-UP,
// see the spec). Until then 2 500 is the tightest flat cap that passes a
// correctly-built clevis while still failing the order-of-magnitude gross merges
// and swing collisions a broken mechanism produces (shade-in-beam 7103;
// elbow-fold collision 3450).
export const ADJACENT_REVOLUTE_CONTACT_CAP_MM3 = 2500;

/**
 * Absolute volume cap (mm³) for fastened mates and non-mated pairs. Neither
 * carries a pin, so a correct model has ~0 shared volume (ISO 286 / Onshape
 * ABUT). Use ForgeCAD's absolute 0.1 mm³ floor — flag essentially any real
 * overlap (a spring fastened through an arm body — PR #341 — or two non-mated
 * parts sharing volume), regardless of part size.
 */
export const FASTENED_CONTACT_CAP_MM3 = 0.1;
export const NON_MATED_CONTACT_CAP_MM3 = 0.1;

/**
 * The absolute shared-volume cap (mm³) below which an overlap between two parts
 * is intended joint contact / tessellation noise rather than a real
 * interference. `mateType` is the kind of mate joining the pair, or `undefined`
 * when the pair is not joined by any mate.
 */
export function jointContactCapMm3(mateType: string | undefined): number {
  if (mateType === 'revolute' || mateType === 'prismatic' || mateType === 'cylindrical') {
    return ADJACENT_REVOLUTE_CONTACT_CAP_MM3;
  }
  if (mateType === 'fastened') {
    return FASTENED_CONTACT_CAP_MM3;
  }
  return NON_MATED_CONTACT_CAP_MM3;
}
