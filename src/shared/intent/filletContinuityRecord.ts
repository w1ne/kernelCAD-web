/**
 * Discriminator for the per-group continuity grade on `Shape.fillet` and
 * `Shape.chamfer` requests. Threaded through to the OCCT backend in Task 6
 * where it dispatches to `BRepFilletAPI_MakeFillet`:
 *
 * - `'G1'` (default): tangent-continuous blend surface.
 *   Maps to `ChFi3d_Polynomial` at construction + no
 *   `SetContinuity` call (OCCT's default internal continuity is already G1).
 * - `'G2'`: curvature-continuous blend surface.
 *   Maps to `ChFi3d_Rational` at construction +
 *   `SetContinuity(GeomAbs_G2, 1e-6)` to force the internal blend surface
 *   to G2.
 *
 * The 2026-05-18 audit (`docs/audit/2026-05-18-slice-c-occt-symbols.md`)
 * confirmed that both `ChFi3d_Rational` and the `GeomAbs_G2` enum value
 * are exposed by the current `replicad-opencascadejs` bundle, so the plan's
 * "downgrade-with-warning" contingency is not needed — Slice C ships full
 * G2 by direct OCCT dispatch.
 *
 * The matching diagnostic code `feature.fillet.continuity-not-applicable`
 * (Task 2) is reserved for a different failure: requesting `'G2'` on an
 * edge whose adjacent faces are themselves only G1-continuous (e.g. a
 * polygonal extrusion edge), where the kernel can construct the blend
 * surface but the geometric outcome is no smoother than G1.
 */
export type FilletContinuity = 'G1' | 'G2';

export function isFilletContinuity(value: unknown): value is FilletContinuity {
  return value === 'G1' || value === 'G2';
}
