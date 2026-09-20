// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const FEATURE_SURFACES_CODES = {
  // NURBS surfaces (2) — W1.3
  'feature.nurbs.degenerate-controls': {
    hintTemplate:
      'NURBS surface control-net must be a non-empty rectangular Vec3 grid spanning a 2D extent. Fix the controls grid shape (every row must have the same length; every point must be a finite Vec3).',
    nextAction: { kind: 'fix-arg', field: 'controls' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A NURBS surface received a degenerate or non-rectangular control-point grid.',
  },
  'feature.nurbs.degree-mismatch': {
    hintTemplate:
      'NURBS degree must satisfy 1 <= degree.u <= controls.length - 1 and 1 <= degree.v <= controls[0].length - 1. Reduce degree, or add control points.',
    nextAction: { kind: 'fix-arg', field: 'degree' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A NURBS surface degree is incompatible with its control-net dimensions.',
  },
  'feature.nurbs.bridge-conversion-failed': {
    hintTemplate:
      'nurbs.bridge: JS→kernel conversion failed (the kernel rejected the curve knot vector). Re-author with explicit knots the kernel accepts (non-decreasing; interior multiplicity <= degree+1; clamped ends multiplicity = degree+1). The default clamped-uniform knot vector always works.',
    nextAction: { kind: 'rewrite-feature', guidance: 'rebuild the curve with the default clamped-uniform knot vector or hand-author a monotonic knot sequence' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Bridge could not reconstruct a Geom_BSplineCurve from the analytics-side NURBS data; the kernel rejected the knot vector as ill-formed.',
  },
  // Edge-feature partial success (1) — M2
  'feature.edge-feature.short-edges-skipped': {
    hintTemplate:
      'OCCT blend solver rejects fillet/chamfer radii larger than half the target edge length. Some edges were below 2 × radius and got skipped so the rest could chamfer. Either reduce the radius, refactor upstream booleans so target edges are longer, or scope your fillet/chamfer to a face/edge query that only matches the long edges.',
    nextAction: { kind: 'fix-arg', field: 'radius-or-distance' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A fillet/chamfer skipped one or more target edges that were shorter than 2 × radius; sometimes a partial-success warn, sometimes a full-fail error.',
  },
  // NURBS Slice B (5) — Curve3D / nurbsCurve capture-time validation.
  'feature.curve3d.degenerate-controls': {
    hintTemplate:
      'nurbsCurve needs at least degree+1 control points. Add more control points or reduce the degree.',
    nextAction: { kind: 'fix-arg', field: 'controlPoints' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve received fewer than degree+1 control points.',
  },
  'feature.curve3d.weights-length-mismatch': {
    hintTemplate:
      'nurbsCurve weights array must match controlPoints length. Pass one weight per control point.',
    nextAction: { kind: 'fix-arg', field: 'weights' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve weights array length does not match controlPoints length.',
  },
  'feature.curve3d.weights-non-positive': {
    hintTemplate:
      'nurbsCurve weights must all be strictly positive (zero collapses the basis; negative is undefined for B-splines).',
    nextAction: { kind: 'fix-arg', field: 'weights' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve weights array contains zero or negative values.',
  },
  'feature.curve3d.knots-length-mismatch': {
    hintTemplate:
      'nurbsCurve knot vector length must equal controlPoints.length + degree + 1.',
    nextAction: { kind: 'fix-arg', field: 'knots' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve knot vector length is not controlPoints.length + degree + 1.',
  },
  'feature.curve3d.closed-endpoints-mismatch': {
    hintTemplate:
      'nurbsCurve closed=true but first and last control points differ; OCCT will close internally but the user-visible control net is misleading. Match the endpoints or drop closed.',
    nextAction: { kind: 'fix-arg', field: 'controlPoints' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'nurbsCurve was authored with closed=true but the first and last control points are not coincident.',
  },
  // V slice — Curve3D analytics (JS-side computed-query layer).
  'feature.curve3d.analytics.degenerate-arclength': {
    hintTemplate:
      'Curve3D.analytics.divideBy*: requested n or arcLength is out of range. Pass a positive integer for n (or a positive arcLength less than the curve total length()).',
    nextAction: { kind: 'fix-arg', field: 'n' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'divideByEqualArcLength or divideByArcLength received an invalid n / arcLength input, or the curve is degenerate (length < 1e-9 mm).',
  },
  'feature.curve3d.analytics.closest-point-no-converge': {
    hintTemplate:
      'Curve3D.analytics.closestPoint: solver did not converge to tolerance after the maximum iterations. The curve may be degenerate or the query point may be far outside the curve domain. Sample via .tessellate() and pick the nearest polyline vertex as a coarse fallback; or loosen tolerance.',
    nextAction: { kind: 'fix-arg', field: 'opts.tolerance' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'closestPoint / closestParam Newton-Raphson did not converge within tolerance.',
  },
  'feature.curve3d.analytics.derivatives-out-of-range': {
    hintTemplate:
      'Curve3D.analytics.derivatives: requested derivative order exceeds the curve degree; derivatives above order=degree are zero by construction. Lower numDerivs to <= degree (typically 1 for tangent, 2 for curvature).',
    nextAction: { kind: 'fix-arg', field: 'numDerivs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'derivatives() called with numDerivs > curve.degree.',
  },
  'feature.curve3d.analytics.tessellation-tolerance-invalid': {
    hintTemplate:
      'Curve3D.analytics.tessellate: tolerance must be a positive finite number in mm. Default 0.05 mm; viewport-grade typically 0.01–0.5 mm. Export tessellation uses the kernel mesher independently.',
    nextAction: { kind: 'fix-arg', field: 'opts.tolerance' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'tessellate() called with tolerance <= 0 or non-finite.',
  },
  'feature.curve3d.analytics.kernel-failed': {
    hintTemplate:
      'Curve3D.analytics: solver threw on this curve (NaN propagation or degenerate input). Inspect the curve via .sample(10) and .length(); if the curve is degenerate (length ~ 0, control points coincident), re-author it. If the curve is valid, file an issue with the .kcad.ts repro.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A non-intersect analytics method (closestPoint, divide*, derivatives, tessellate) raised an internal solver error.',
  },
  // V slice — Task V3: curve-curve and curve-surface geometric intersection
  // on the analytics namespace (instance method, NOT a kc.q.* set-theoretic
  // verb; see spec §3.2). intersect-no-intersection rides at info severity
  // because the no-hit case is data — the call returns [] rather than throws.
  'feature.curve3d.analytics.intersect-kernel-failed': {
    hintTemplate:
      'Curve3D.analytics.intersect: solver threw on the operand pair. Loosen tolerance (default 1e-3; try 1e-2 for visibly-crossing curves with rough endpoints); or inspect both operands via .sample(20) to verify they are well-formed. For the curve-surface overload, the surface must be authored via nurbsSurface() — Coons-patch and lofted surfaces do not yet expose JS-side NURBS data.',
    nextAction: { kind: 'fix-arg', field: 'opts.tolerance' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Curve-curve or curve-surface geometric intersection solver raised an error, or the surface operand kind is not supported by the JS-side intersect path.',
  },
  'feature.curve3d.analytics.intersect-no-intersection': {
    hintTemplate:
      'Curve3D.analytics.intersect: no intersection found within tolerance (operands are skew or non-intersecting at this tolerance). If you expect an intersection, loosen tolerance and re-run; check operand bounding boxes via .sample(10) to verify spatial proximity.',
    nextAction: { kind: 'fix-arg', field: 'opts.tolerance' },
    defaultSeverity: 'info',
    group: 'feature',
    description: 'intersect(other) returned zero hits within the requested tolerance; surfaced as a catalog entry rather than thrown so callers can treat empty results as data.',
  },
  // NURBS Slice B — variableSweep PipeShell validation.
  'feature.variable-sweep.sections-out-of-order': {
    hintTemplate:
      'variableSweep sections must be strictly increasing in t. Sort sections by t ascending.',
    nextAction: { kind: 'fix-arg', field: 'sections' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep received sections whose t values are not strictly increasing.',
  },
  'feature.variable-sweep.sections-not-spanning': {
    hintTemplate:
      'variableSweep sections must span the full spine: first section at t=0 and last section at t=1 are required.',
    nextAction: { kind: 'fix-arg', field: 'sections' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep sections do not include t=0 or t=1.',
  },
  'feature.variable-sweep.spine-too-short': {
    hintTemplate:
      'variableSweep spine is shorter than the smallest profile bounding diameter, so the sweep would self-intersect. Lengthen the spine or shrink the profiles.',
    nextAction: { kind: 'fix-arg', field: 'spine' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep spine length is below the smallest profile bounding diameter.',
  },
  'feature.variable-sweep.profile-not-planar': {
    hintTemplate:
      'variableSweep profiles must be planar sketches. Use a 2D path()/close() chain (or surfaceFromBoundary for non-planar sections in a later slice).',
    nextAction: { kind: 'rewrite-feature', guidance: 'use a planar path().close() sketch for each section' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep received a non-planar profile sketch.',
  },
  'feature.variable-sweep.profile-empty': {
    hintTemplate:
      'variableSweep profile sketch is empty. Close the path() before passing it as a profile.',
    nextAction: { kind: 'rewrite-feature', guidance: 'close the path() before passing as a profile' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep received an empty/unclosed profile sketch.',
  },
  'feature.variable-sweep.frenet-degenerate': {
    hintTemplate:
      'Frenet orientation is undefined where the spine curvature vanishes (straight segments). Pass orientation: { up: Vec3 } or "corrected-frenet" for spines with straight stretches.',
    nextAction: { kind: 'fix-arg', field: 'orientation' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep with Frenet orientation hit a zero-curvature span on the spine.',
  },
  // NURBS Slice C (6) — surfaceFromBoundary (Coons patch) + G2 fillet.
  'feature.surface-from-boundary.corner-mismatch': {
    hintTemplate:
      'surfaceFromBoundary requires adjacent boundary curves to share endpoints within 1e-6 mm (c1.end == c2.start, c2.end == c3.start, c3.end == c4.start, c4.end == c1.start). Snap the endpoints or rebuild the boundary curves so they form a closed loop.',
    nextAction: { kind: 'fix-arg', field: 'curveRefs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary boundary curves do not share corner endpoints within tolerance.',
  },
  'feature.surface-from-boundary.too-few-curves': {
    hintTemplate:
      'surfaceFromBoundary requires exactly 4 boundary curves. Pass an array of 4 Curve3D refs in walk order (bottom, right, top, left).',
    nextAction: { kind: 'fix-arg', field: 'curveRefs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary received fewer than 4 boundary curves.',
  },
  'feature.surface-from-boundary.too-many-curves': {
    hintTemplate:
      'surfaceFromBoundary requires exactly 4 boundary curves. Pass an array of 4 Curve3D refs in walk order — if the loop has more than 4 sides, split the patch into adjacent quads.',
    nextAction: { kind: 'fix-arg', field: 'curveRefs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary received more than 4 boundary curves.',
  },
  'feature.surface-from-boundary.continuity-orphan': {
    hintTemplate:
      "surfaceFromBoundary continuity 'C1' / 'C2' requires the neighbors map to identify which existing surface to be tangent (or curvature-continuous) to on each side. Either drop the continuity flag or supply opts.neighbors so the kernel can resolve the tangency target.",
    nextAction: { kind: 'fix-arg', field: 'neighbors' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary requested C1/C2 continuity without a neighbors map identifying the tangency target.',
  },
  'feature.surface-from-boundary.degenerate-patch': {
    hintTemplate:
      'BRepOffsetAPI_MakeFilling could not produce a face. The boundary curves are likely coincident, self-intersecting, or topologically invalid. Inspect the curve sequence with list_features and visualize each Curve3D before retrying.',
    nextAction: { kind: 'rewrite-feature', guidance: 'rebuild the 4 boundary curves so they form a non-self-intersecting closed loop, then retry surfaceFromBoundary' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'BRepOffsetAPI_MakeFilling returned no face for the supplied boundary curves.',
  },
  // NURBS Slice E/F — surfaceTrim / split.
  'feature.surface-trim.no-intersection': {
    hintTemplate:
      'Surface trim found no intersection between the surface and the cutter. Ensure they actually cross.',
    nextAction: { kind: 'fix-arg', field: 'by' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A surface trim/split produced no section curve — surfaces do not intersect.',
  },
  'feature.surface-trim.non-planar': {
    hintTemplate:
      'Legacy surface trim refused a non-planar base or cutter. Current curved trim uses BRepFeat_SplitShape; if you still see this diagnostic, refresh the runtime bundle and retry with cleanly intersecting single-face surfaces.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use cleanly intersecting single-face surfaces, or refresh to the curved-trim runtime bundle' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Legacy diagnostic for the former planar-only surface trim path.',
  },
  'feature.surface-trim.split-deferred': {
    hintTemplate:
      'Legacy surface.split(by) warning from the former one-piece split path. Current split returns both halves as [Surface, Surface]; refresh the runtime bundle if this appears in new work.',
    nextAction: { kind: 'rewrite-feature', guidance: 'refresh to the curved-trim runtime bundle and destructure the two returned split surfaces' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'Legacy diagnostic for the former one-piece split path.',
  },
  // NURBS Slice E (2) — sew() surface stitching.
  'feature.surface-sew.open-shell': {
    hintTemplate:
      'sew() produced an open shell (some edges have no matching neighbour within tolerance). Either increase opts.tolerance so adjacent edge pairs close, add the missing patch to seal the gap, or set requireClosed: false to accept an open shell.',
    nextAction: { kind: 'fix-arg', field: 'surfaces' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'BRepBuilderAPI_Sewing produced an open shell — one or more boundary edges are unmatched within the stitching tolerance.',
  },
  'feature.fillet.continuity-not-applicable': {
    hintTemplate:
      "continuity: 'G2' was requested but the adjacent faces along the target edge are themselves only G1-continuous, so the resulting blend can be no smoother than G1. Either accept the G1 result, refit the upstream faces as NURBS so they are G2 internally, or apply a smaller fillet that fits inside a single smooth region.",
    nextAction: { kind: 'rewrite-feature', guidance: "drop continuity: 'G2' (adjacent faces are only G1) or refit the upstream faces as NURBS surfaces" },
    defaultSeverity: 'warn',
    group: 'feature',
    description: "fillet requested G2 continuity but adjacent faces are only G1.",
  },
  // NURBS Slice C — hermiteG2 quintic transition curve (pure-JS solver).
  'feature.hermite-g2.degenerate-tangent': {
    hintTemplate:
      'hermiteG2 received a tangent with zero magnitude on one or both endpoints. The quintic Hermite scales the tangent into the inner control points; a zero tangent collapses two control points onto the endpoint, producing a cusp rather than a smooth transition. Supply a non-zero tangent (magnitude in the order of the chord length between the endpoints).',
    nextAction: { kind: 'fix-arg', field: 'tangent' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'hermiteG2 received a zero-magnitude tangent on one or both endpoints.',
  },
  'feature.hermite-g2.non-finite-input': {
    hintTemplate:
      'hermiteG2 received NaN / Infinity in one of point, tangent, or curvature. Validate the endpoints upstream — typically caused by a divide-by-zero in a normal/curvature derivation. Recompute the endpoint with finite inputs before retrying.',
    nextAction: { kind: 'fix-arg', field: 'see-message' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'hermiteG2 received NaN or Infinity in an endpoint argument.',
  },
  // NURBS Slice D (4) — 2D path NURBS authoring (PathBuilder .spline / .nurbsSegment / .hermiteG2).
  'feature.path.spline.degenerate-points': {
    hintTemplate:
      'path().spline expects at least 2 distinct finite Vec2 waypoints, with points[0] at the current pen position (within 1e-6 mm); the curve interpolates through every one. Remove duplicate consecutive points (closer than 1e-9 mm), replace any NaN / Infinity coords with finite values, ensure the array has length >= 2, and make points[0] equal the previous segment endpoint (or add a lineTo bridging the gap).',
    nextAction: { kind: 'fix-arg', field: 'points' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().spline received fewer than 2 distinct finite waypoints, or points[0] does not start at the current pen position.',
  },
  // V slice Task V4 (2) — path().spline tangent extension.
  'feature.path.spline.tangent-zero-magnitude': {
    hintTemplate:
      'path().spline: startTangent / endTangent has magnitude < 1e-9 (zero-magnitude tangents are undefined). Pass a non-zero 2D direction vector; magnitude is normalised internally, [1, 0] and [100, 0] produce the same curve.',
    nextAction: { kind: 'fix-arg', field: 'opts.startTangent' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().spline received a startTangent or endTangent with magnitude below 1e-9; the curve fit cannot use a zero-direction constraint.',
  },
  'feature.path.spline.tangent-on-2d-only': {
    hintTemplate:
      'path().spline: startTangent / endTangent must be a 2D [x, y] tuple; got a 3-element vector. The z component is ignored. For 3D NURBS curves with tangent control, use nurbsCurve(controlPoints, opts) and compose hermiteG2 for endpoint G2 instead.',
    nextAction: { kind: 'fix-arg', field: 'opts.startTangent' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'A 3-element tangent was passed to the 2D path().spline extension; only the x/y components are used.',
  },
  'feature.path.nurbs-segment.degenerate-controls': {
    hintTemplate:
      'path().nurbsSegment expects at least degree+1 finite Vec2 control points, with the first control point matching the current pen position within 1e-6 mm. Add more control points or reduce the degree, and align controlPoints[0] with the current position (or call moveTo first).',
    nextAction: { kind: 'fix-arg', field: 'controlPoints' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().nurbsSegment received fewer than degree+1 finite control points or the first control did not match the pen position.',
  },
  'feature.path.nurbs-segment.weights-non-positive': {
    hintTemplate:
      'path().nurbsSegment weights must all be strictly positive (zero collapses the basis; negative is undefined for B-splines). Replace any zero / negative weight with a positive value, and ensure the array length matches controlPoints.',
    nextAction: { kind: 'fix-arg', field: 'weights' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().nurbsSegment weights contain zero or negative values, or length does not match controlPoints.',
  },
  'feature.path.hermite-g2.start-mismatch': {
    hintTemplate:
      "path().hermiteG2 requires `a.point` to match the path's current pen position within 1e-6 mm. Either align a.point with the prior segment's endpoint, or call moveTo(a.point.x, a.point.y) before hermiteG2.",
    nextAction: { kind: 'fix-arg', field: 'a.point' },
    defaultSeverity: 'error',
    group: 'feature',
    description: "path().hermiteG2 received `a.point` not matching the current pen position within tolerance.",
  },
  'feature.curve-bridge.degenerate-end': {
    hintTemplate:
      'curveBridge / Curve3D.bridge could not infer a join: the chosen ends coincide (chord < 1e-9 mm) or a tangent vanished. Pick different `ends` (`end-start` / `end-end` / `start-start` / `start-end`), separate the curves, or supply a non-zero tension.',
    nextAction: { kind: 'fix-arg', field: 'ends' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'curveBridge could not build a Hermite blend because the chosen endpoints coincide or a tangent has vanishing magnitude.',
  },
  'feature.surface-intersection.none': {
    hintTemplate:
      'surfaceIntersection found no curve: the two faces/solids do not meet. Translate one operand so they cut, or pick different faces. A miss is not a tangent-grazing "almost" — the solids must actually cross.',
    nextAction: { kind: 'rewrite-feature', guidance: 'move the operands so their faces cut, then retry surfaceIntersection' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'BRepAlgoAPI_Section returned no edges — the two surfaces or solids do not intersect.',
  },
  'feature.loft.rail-miss': {
    hintTemplate:
      'A loft rail does not pass near every section (or more than two rails were given). OCCT MakePipeShell accepts one spine plus one auxiliary spine; each rail must come within 1 mm of every section wire. Shorten the gap, add a section on the rail, or drop extra rails.',
    nextAction: { kind: 'fix-arg', field: 'opts.rails' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A guide rail missed a loft section, or more than two rails were supplied (OCCT supports one spine plus one auxiliary spine).',
  },
} as const satisfies Record<`feature.${string}`, DiagnosticCodeSpec>;
