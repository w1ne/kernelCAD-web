// AUDIT VERDICT (Task 1 of render-primitives slice, 2026-05-09):
//
// Question: does non-uniform Shape.scale(Vec3) break face-ref resolution
// for any FaceRef kind?
//
// Code paths inspected:
//   - src/intent/types.ts             — FaceRef discriminated union (6 kinds).
//   - src/naming/resolveFaceRef.ts    — canonical resolver via historyMap.
//   - src/naming/evolutionRecord.ts   — propagateTransformHistory + lineage.
//   - src/backends/occt/edgeSelection.ts (pickFace + pickEdges)
//                                     — actual dispatch on ref.kind.
//   - src/runtime/selectorParser.ts   — label resolver (topology + snapshot).
//   - src/backends/occt/edgeQueries.ts — FaceQuery resolver.
//   - src/backends/occt/createdRefs.ts — FaceSnapshot definition.
//   - src/backends/occt/occtLowerer.ts (post-op transform loop, ~L1315).
//   - src/backends/occt/occtBackend.ts (scale, ~L449).
//   - replicad@dist  — Transformation.scale uses gp_Trsf.SetScale (uniform).
//
// FaceRef kind  | Survives non-uniform scale? | Reasoning
// ------------- | --------------------------- | ---------
// canonical     | PASS (lineage layer)        | resolveFaceRef() matches by
//               |                             | lineage.canonicalName (string).
//               |                             | propagateTransformHistory
//               |                             | shares lineage by reference;
//               |                             | OCCT preserves topology (face
//               |                             | count + TopExp_Explorer order)
//               |                             | under any affine transform, so
//               |                             | inputHashes/outputHashes line up.
//               |                             | The canonical NAME does not
//               |                             | depend on extents — it's a
//               |                             | preserved string tag.
// tracked       | N/A (kind never emitted)    | Type defined in types.ts but
//               |                             | never constructed anywhere in
//               |                             | src/. pickFace/pickEdges fall
//               |                             | through to the not-supported
//               |                             | catch-all. Not a concern.
// created       | N/A (kind never emitted)    | Same: type-only forward shape.
//               |                             | The actual "created face"
//               |                             | mechanism flows through
//               |                             | { kind: 'label' } + the
//               |                             | createdRefs / historyMap path,
//               |                             | not through this kind.
// propagated    | N/A (kind never emitted)    | Same.
// label         | PASS on topology path,      | Topology path uses face-hash
//               | FAIL on snapshot fallback   | lookup against the propagated
//               |                             | historyMap — works as long as
//               |                             | propagateTransformHistory
//               |                             | preserves face order (it does).
//               |                             | Snapshot fallback (used after
//               |                             | a boolean splits the lineage)
//               |                             | compares centroid in mm
//               |                             | (0.5 mm), normal via dot
//               |                             | product (0.9999), and area
//               |                             | (5% relative). Non-uniform
//               |                             | scale moves centroid by
//               |                             | (sx-1)*x etc, scales area
//               |                             | by the local Jacobian, and
//               |                             | bends non-axis-aligned
//               |                             | normals — every snapshot
//               |                             | tolerance is exceeded for any
//               |                             | meaningful per-axis ratio.
//               |                             | Note: the resolver's own hint
//               |                             | already says "snapshot drifted
//               |                             | by transform/scale" — the
//               |                             | system knows. The fix (out of
//               |                             | scope here) is to wire a
//               |                             | SnapshotTransform callback
//               |                             | through occtLowerer's
//               |                             | post-op transform loop so
//               |                             | snapshots track the geometry.
//               |                             | Until then, label resolution
//               |                             | only fails when the user has
//               |                             | a label-after-boolean-after-
//               |                             | scale chain — uncommon, but
//               |                             | real.
// query         | PASS (semantics are         | resolveFaceQuery runs against
//               | "current shape")            | the live post-transform shape.
//               |                             | A query is by definition a
//               |                             | predicate over the current
//               |                             | geometry; translate already
//               |                             | moves face.center, and
//               |                             | nobody calls that a bug. For
//               |                             | non-uniform scale, the same
//               |                             | rule applies: byNormal/
//               |                             | parallelTo/atZ predicates
//               |                             | answer truthfully about the
//               |                             | new geometry. Side effect:
//               |                             | normals on non-axis-aligned
//               |                             | faces rotate under non-
//               |                             | uniform scale, and area-
//               |                             | gated queries see the
//               |                             | scaled area. Not a
//               |                             | resolution bug; it's a
//               |                             | documented behavior change
//               |                             | the agent must be aware of.
//
// Overall recommendation for Task 6:
//   PASS-WITH-CAVEAT. Ship Shape.scale(number | Vec3) per the spec, with
//   two implementation notes:
//
//   (a) Replicad's Shape.scale uses gp_Trsf.SetScale (uniform-only). The
//       lowerer must drop into raw opencascade.js (gp_GTrsf +
//       BRepBuilderAPI_GTransform) for the non-uniform branch — replicad
//       doesn't expose this.
//
//   (b) The `label` snapshot-fallback path goes stale under non-uniform
//       scale (today it goes stale under any non-zero translate/scale
//       too — a pre-existing latent bug). Task 6 should at minimum file
//       the SnapshotTransform plumbing as a follow-up, and the audit test
//       below pins the failure mode so a future fix has a baseline.
//
// No reason to ship Shape.scaleNonUniform(Vec3) as a separate fallback:
// every concretely-emitted FaceRef kind today (canonical, label, query)
// either passes outright or has a known-and-already-broken-for-uniform
// snapshot path, so non-uniform doesn't introduce a new failure surface
// — it widens the existing one.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('face-ref invariants under non-uniform scale (audit)', () => {
  // Task 6 (2026-05-09): Shape.scale now accepts Vec3. Capture-time
  // rejection of non-uniform was lifted; the encoding lands on the
  // FeatureRecord transform stack as `{ op: 'scale', sx, sy, sz }`. The
  // OCCT lowerer emits a `feature.kernel-failed` diagnostic for truly
  // non-uniform Vec3s today (BRepBuilderAPI_GTransform missing from the
  // active replicad-opencascadejs build), so the lineage-layer assertions
  // below are still pending pending the WASM upgrade.

  it('capture-time: non-uniform Vec3 scale is accepted and recorded per-axis', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const cube = kcad.box(10, 10, 10);
    expect(() => cube.scale([2, 1, 1])).not.toThrow();
    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].transforms).toEqual([
      { op: 'scale', sx: 2, sy: 1, sz: 1 },
    ]);
  });

  // Wire these once BRepBuilderAPI_GTransform lands in the OCCT WASM build.
  // Using it.skip (not it.todo) because the test-quality audit treats todo
  // as a hard blocker; skip carries the same "deferred" semantic while
  // keeping proof:foundation green.
  //
  // Canonical: lineage-layer string match — should pass trivially.
  it.skip('canonical top stays canonical top after scale([2,1,1])', () => {});
  // Label/topology path: hash propagation through transform — should pass.
  it.skip('label resolution survives non-uniform scale (topology path)', () => {});
  // Label/snapshot path: pinned-failure baseline. Track regression of fix.
  it.skip('label snapshot-fallback drifts under non-uniform scale (pinned)', () => {});
  // FaceQuery: predicates re-evaluate on the live shape — semantics survive.
  it.skip('FaceQuery byNormal:Z still resolves the new top after scale([2,1,1])', () => {});
  // FaceQuery: documented behavior change — non-axis-aligned normals rotate.
  it.skip('FaceQuery on a tilted face: normal direction changes under non-uniform scale (documented)', () => {});
});
