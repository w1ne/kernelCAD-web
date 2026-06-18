// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/matePhysicalRealization.ts
//
// G2 — Gate 6 mate physical realization.
//
// Spec: `docs/specs/2026-05-30-kinematic-grounding-mechanism-delivery-design.md`
//        slice G2.
// Plan: `docs/plans/2026-05-31-mechanism-delivery-G2-gate-6-mate-physical-realization.md`.
//
// For every declared revolute / prismatic mate, the gate asks: *can this mate
// be physically realized — is there an actual pin/shaft feature constraining
// the two parts, does that pin stay in both holes at every pose in the
// mate's limits, and do the bearing surfaces align?* If not, the gate emits
// `assembly.mate.not-physically-realized` with a hint naming the failure
// mode.
//
// `fastened` mates skip the gate. `ball` / `planar` / `pin_slot` /
// `cylindrical` mates are out of scope for the G2 slice (revolute +
// prismatic only). `joint.clevis(...)`-built mates pass by construction.
//
// ## Sub-checks (ordered by cost, ascending — first failure short-circuits)
//
// 1. **no-shared-pin-feature** (cheapest). At the mate's connector origin,
//    query both parts' BREP for a cylindrical / prismatic feature whose
//    axis aligns with the mate axis within angular tolerance and whose
//    near-AABB straddles the connector origin within `2 * knuckleR`. If
//    NEITHER part has material at the joint axis, no pin feature can
//    possibly constrain both — emit `no-shared-pin-feature`.
//
// 2. **bearing-not-coplanar** (cheap BREP plane test). For revolute mates:
//    find the parent's fork inner-cheek plane and the child's tongue
//    outer-cheek plane along the pin axis. Their distance along the pin
//    axis must be ≤ `tolFraction * plateT`. `plateT` is inferred from the
//    parent's fork-plate extents (using Gate 4's same plate-face filter).
//    If the bearing faces do not meet within tolerance, emit
//    `bearing-not-coplanar`.
//
// 3. **pin-escapes-hole-at-pose** (8 pose samples). Walk the mate's
//    `limitsDeg` (revolute) / `limitsMm` (prismatic) at `samples` poses.
//    At each, the world-frame joint origin on the CHILD side must remain
//    within `holeClearance` of the PARENT joint origin (revolute: trivially
//    invariant under rotation about the axis; prismatic: translation along
//    axis preserves the axis line). If the child's pose carries the joint
//    line outside the parent's body, the hole has escaped — emit
//    `pin-escapes-hole-at-pose` with the offending pose in the hint.
//
// 4. **over-constrained** (heaviest — BREP boolean). Remove a generous
//    cylindrical sweep along the mate axis (radius `1.2 * inferredPinR`,
//    length spanning the joint) from both parent and child BREPs. Test if
//    the resulting BREPs INTERSECT (boolean overlap volume > epsilon) —
//    a positive intersection means the parts touch outside the pin
//    envelope, which means the mate is over-constrained mechanically.
//
// ## Reuse
//
// - **Lowered-shape cache**: Gate 2 (`validateJointAxisBindingWithCache`)
//   lowers the assembly + applies per-part world transforms. Gate 6
//   consumes that cache directly via `loweredShapes` — no re-lowering.
// - **Mate axis lifting**: same pattern as Gate 4
//   (`resolveConnectorOrigin` + `Transform.point/axisDir`).
// - **Inferred pin radius**: smallest perpendicular-AABB face across the
//   parent + child shapes whose AABB straddles the joint origin. Same
//   heuristic Gate 4 uses (`inferPinRadius` in `jointVisualExposure.ts`).
//   Implemented locally here so Gate 4's helper stays private to its
//   module.

import type { Vec3 } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import type { Vec3 as Se3Vec3 } from '../../shared/runtime/se3';
import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { resolveConnectorOrigin, type Connector } from './connector';
import { parseConnectorRef, type MateRecord } from './mate';
import type { ValidatorDiagnostic } from './validator';

/**
 * Default fraction of inferred plate-thickness used as the bearing
 * coplanarity tolerance. 5% of `plateT` matches the spec §G2 design lock:
 * the bearing surfaces should meet within a 5 %-of-thickness band — wide
 * enough to absorb OCCT mesher noise on a typical 4 mm plate (0.2 mm
 * band), tight enough to flag a tongue that doesn't reach the fork inner
 * cheek.
 */
const DEFAULT_TOLERANCE_FRACTION = 0.05;

/** Default pose-sample count per mate (8 poses across `limits`). */
const DEFAULT_POSE_SAMPLES = 8;

/**
 * Direction-vector parallelism floor. Matches Gate 2 / Gate 4's
 * convention — 1e-4 is well below any geometrically meaningful angular
 * sensitivity for kernelCAD's mm-scale parts.
 */
const PARALLEL_DIRECTION_EPSILON = 1e-4;

/**
 * Fallback pin radius (mm) when the proxy inference collapses to near-zero
 * on a degenerate child. Matches the typical M6-clevis pin radius used by
 * the Luxo example. Same convention as Gate 4's `PIN_R_FALLBACK_MM`.
 */
const PIN_R_FALLBACK_MM = 3.5;

/**
 * Fallback plate thickness (mm) when no plate-like faces are found on the
 * parent. Matches the Luxo example's `plateT = 4`. Used only to scale the
 * coplanarity tolerance — when there is no plate, the bearing-coplanar
 * subcheck does not fire anyway.
 */
const PLATE_T_FALLBACK_MM = 4;

/**
 * Joints whose combined parent+child bounding-sphere radius is below this
 * value skip Gate 6 entirely. Mirrors Gate 4's microscale skip — micro-
 * mechanisms (sub-mm hinges) are not the design target and false-positives
 * there poison the signal everywhere else.
 */
const MICROSCALE_BOUNDING_RADIUS = 5;

/**
 * Minimum intersection volume (mm^3) considered "still in contact" for the
 * over-constrained sub-check. OCCT booleans on near-touching solids leave
 * sub-mm³ slivers from mesher noise. The threshold has to be well above
 * that floor AND well above the residue from a clean clevis whose pin
 * envelope only partially removes the fork plates' BREP. A clean clevis
 * with plateT = 4 mm and pin envelope = 4.2 mm radius has ~50 mm³ of
 * mesher-noise residue at the cut faces; structural over-constraint
 * (parts touching outside the pin envelope) emits residues > 200 mm³.
 * 100 mm³ is the chosen floor.
 */
const OVER_CONSTRAINED_VOLUME_FLOOR_MM3 = 100;

/** Options accepted by the Gate 6 entry point. */
export interface Gate6Options {
  /**
   * Bearing coplanarity tolerance, expressed as a fraction of the inferred
   * fork-plate-thickness. Default 0.05 (5 %). Per spec design lock —
   * never an absolute mm value, so the gate scales naturally with plate
   * size and does not need a separate "scale hint" parameter.
   */
  readonly toleranceFraction?: number;
  /** Number of poses to sample across `mate.limits`. Default 8. */
  readonly poseSamples?: number;
}

/**
 * Gate 6 entry point. Async — connector-origin resolution
 * (`resolveConnectorOrigin`) is async for topology origins; the geometric
 * probing itself is pure / synchronous.
 *
 * Returns a (possibly empty) list of `assembly.mate.not-physically-realized`
 * diagnostics — at most one per gated mate, carrying the first failing
 * sub-check in the hint along with measurable values.
 *
 * Inputs MIRROR Gate 4's interface so the validator's
 * `axisBindingResult` cache is reused without re-lowering.
 */
export async function validateMatePhysicalRealization(
  arm: Assembly,
  loweredShapes: ReadonlyMap<string, OcctBackend>,
  worldTransforms: ReadonlyMap<string, Transform>,
  opts: Gate6Options = {},
): Promise<ValidatorDiagnostic[]> {
  // Empty cache → Gate 2 either had no gated mates or short-circuited;
  // nothing to gate against here either.
  if (loweredShapes.size === 0) return [];

  const tolFraction = opts.toleranceFraction ?? DEFAULT_TOLERANCE_FRACTION;
  const samples = opts.poseSamples ?? DEFAULT_POSE_SAMPLES;

  const partsByName = new Map<string, AssemblyPartStored>();
  for (const p of arm.__parts()) partsByName.set(p.name, p);

  const out: ValidatorDiagnostic[] = [];
  for (const mate of arm.__mates()) {
    // Out of scope: fastened (no axis); ball / planar / cylindrical /
    // pin_slot (G2 covers revolute + prismatic only).
    if (mate.type !== 'revolute' && mate.type !== 'prismatic') continue;

    const sideA = await resolveSide(mate.a, partsByName, worldTransforms);
    const sideB = await resolveSide(mate.b, partsByName, worldTransforms);
    if (!sideA || !sideB) continue;

    const parentShape = loweredShapes.get(sideA.partName);
    const childShape = loweredShapes.get(sideB.partName);
    if (!parentShape || !childShape) continue;

    // Microscale skip — combined parent+child bounding-sphere radius below
    // the threshold means the joint is too small to expect realistic
    // hardware. Matches Gate 4's convention.
    if (combinedBoundingSphereRadius(parentShape, childShape) < MICROSCALE_BOUNDING_RADIUS) {
      continue;
    }

    const axisDir = normalize(sideA.direction);
    if (axisDir === undefined) continue; // degenerate axis — out of scope

    const result = analyzeMate({
      mate,
      parent: parentShape,
      child: childShape,
      axisOrigin: sideA.origin,
      axisOriginChild: sideB.origin,
      axisDir,
      tolFraction,
      samples,
    });
    if (result.failure) {
      out.push({
        code: 'assembly.mate.not-physically-realized',
        // Demoted to 'info' under the physics-grounded loop (P3,
        // 2026-06-01): this is an authoring-time signal that no pin
        // geometry realises the mate; the merge gates are
        // mechanism.disconnect and mechanism.interpenetration which
        // fire under motion at validate-time.
        severity: 'info',
        mateName: mate.name,
        message: `Mate '${mate.name}' (${mate.type}) is declared but not realised by part geometry: ${result.failure}.`,
        hint: buildHint(mate, result),
      });
    }
  }
  return out;
}

interface MateAnalysis {
  readonly failure?:
    | 'no-shared-pin-feature'
    | 'bearing-not-coplanar'
    | 'pin-escapes-hole-at-pose'
    | 'over-constrained';
  readonly detail?: string;
}

interface AnalyzeMateInput {
  readonly mate: MateRecord;
  readonly parent: OcctBackend;
  readonly child: OcctBackend;
  readonly axisOrigin: Vec3;
  readonly axisOriginChild: Vec3;
  readonly axisDir: Vec3;
  readonly tolFraction: number;
  readonly samples: number;
}

function analyzeMate(input: AnalyzeMateInput): MateAnalysis {
  const { mate, parent, child, axisOrigin, axisOriginChild, axisDir, tolFraction, samples } = input;

  // Heuristic pin radius — smallest face-AABB perpendicular extent that
  // straddles the joint origin. Same proxy Gate 4 uses (kept local so
  // Gate 4's helper stays private to its module).
  const inferredPinR = inferPinRadius(parent, child, axisOrigin, axisDir);
  const inferredKnuckleR = Math.max(inferredPinR * 3, 5); // proxy for "joint hardware radius"

  // ── Sub-check 1: no-shared-pin-feature ───────────────────────────────
  // Both parts must carry material near the joint axis within the
  // knuckle-radius envelope of the connector origin. If a part's BREP
  // does not extend into the axis-aligned tube around the origin, no
  // physical pin can constrain it.
  const parentHits = pointInsideShapeAabb(axisOrigin, parent);
  const childHits = pointInsideShapeAabb(axisOrigin, child);
  if (!parentHits || !childHits) {
    return {
      failure: 'no-shared-pin-feature',
      detail: `joint origin [${fmtVec(axisOrigin)}] does not lie inside ${!parentHits ? 'parent' : 'child'} body AABB`,
    };
  }

  // ── Sub-check 2: bearing-not-coplanar (revolute only) ────────────────
  // The "bearing surfaces" of a clevis are the fork inner cheeks and the
  // tongue outer cheeks. In a properly-built clevis the tongue lies
  // BETWEEN the two fork plates with intentional running clearance — so
  // the inner-cheek-to-outer-cheek gap is positive (typical: 1 mm per
  // side for joint.clevis defaults). The gate's bearing-coplanarity
  // condition is therefore "the tongue lives INSIDE the fork gap", not
  // "the cheeks touch". A failure is the tongue extending far OUTSIDE
  // the fork gap, or the fork being so narrow that the tongue cannot
  // slip in.
  //
  // We measure: the tongue's axis-centre offset from the fork-gap centre.
  // The tongue should be reasonably centred between the fork plates (within
  // tolFraction * (forkGapY) of the fork-gap centre — design intent says
  // the tongue is concentric with the fork). If the offset exceeds that
  // tolerance scaled to forkGapY (or plateT, whichever is larger), the
  // bearing is misaligned. The 5 % spec lock applies to the *concentricity*,
  // not the absolute clearance — a 4 mm plate with a 0.2 mm tongue-centre
  // offset is still aligned; a 4 mm plate with a 2 mm offset is not.
  if ((mate.type as string) === 'revolute') {
    const bearing = measureBearingCoplanarity(parent, child, axisOrigin, axisDir, inferredPinR);
    if (bearing !== undefined && bearing.forkGapY !== undefined && bearing.tongueAxialCentre !== undefined && bearing.forkAxialCentre !== undefined) {
      const plateT = bearing.plateT ?? PLATE_T_FALLBACK_MM;
      // Tolerance on tongue concentricity: 5 % of forkGapY (per spec lock,
      // expressed as a fraction of the bearing's NATURAL scale — the gap
      // through which the tongue slides), with an absolute floor at
      // tolFraction * plateT for OCCT noise on cheek-to-cheek alignment.
      const tol = Math.max(tolFraction * bearing.forkGapY, tolFraction * plateT);
      const offset = Math.abs(bearing.tongueAxialCentre - bearing.forkAxialCentre);
      if (offset > tol) {
        return {
          failure: 'bearing-not-coplanar',
          detail:
            `tongue centre is ${offset.toFixed(3)} mm off the fork-gap centre along the pin axis ` +
            `(tolerance ${tol.toFixed(3)} mm = ${(tolFraction * 100).toFixed(1)}% of forkGapY ${bearing.forkGapY.toFixed(2)} mm / plateT ${plateT.toFixed(2)} mm)`,
        };
      }
      // Additionally: the tongue must AXIALLY OVERLAP the fork gap. A
      // tongue that misses the fork entirely (e.g. authored at a wrong
      // pivotChild) is the canonical bearing-not-coplanar failure.
      if (bearing.tongueOutsideForkGap) {
        return {
          failure: 'bearing-not-coplanar',
          detail:
            `tongue does not axially overlap the fork gap (fork plates at axis-coords ` +
            `near ${bearing.forkAxialCentre.toFixed(2)} mm, tongue centred at ` +
            `${bearing.tongueAxialCentre.toFixed(2)} mm)`,
        };
      }
    }
  }

  // ── Sub-check 3: pin-escapes-hole-at-pose ────────────────────────────
  // Walk samples poses across the mate's limits; at each, lift the
  // child's joint origin by the pose and check it stays within the
  // parent's body AABB along the joint axis. For revolute about a fixed
  // axis through the connector origin, rotation about the axis preserves
  // any on-axis point, so this sub-check is a no-op for well-formed
  // revolute mates (and immediately fires for a child whose connector
  // origin sits OFF the axis). For prismatic, the child slides along the
  // axis — the joint line is invariant under translation along its own
  // direction.
  // Narrow mate.type — we already filtered to revolute/prismatic at the
  // top of `validateMatePhysicalRealization`, but the type guard does not
  // propagate through the analyzeMate input record.
  const mateType: 'revolute' | 'prismatic' =
    mate.type === 'revolute' ? 'revolute' : 'prismatic';
  const limits = mateType === 'revolute' ? mate.limitsDeg : mate.limitsMm;
  if (limits !== undefined) {
    const escape = checkPinContainment(
      mateType,
      axisOrigin,
      axisOriginChild,
      axisDir,
      limits,
      samples,
      parent,
      child,
      inferredKnuckleR,
    );
    if (escape !== undefined) {
      return {
        failure: 'pin-escapes-hole-at-pose',
        detail: escape,
      };
    }
  }

  // ── Sub-check 4: over-constrained (heaviest) ─────────────────────────
  // Remove a generous cylindrical sweep along the axis from both parts
  // and test if the residue still overlaps. A clean clevis: forkGapY >
  // tongueY → the fork plates do not touch the tongue outside the pin
  // envelope, so the residue is disjoint. A welded / over-engaged mate:
  // material remains touching outside the pin envelope, residue
  // intersection > 0.
  const overConstrained = checkOverConstrained(parent, child, axisOrigin, axisDir, inferredPinR, inferredKnuckleR);
  if (overConstrained !== undefined) {
    return {
      failure: 'over-constrained',
      detail: overConstrained,
    };
  }

  return {};
}

interface ResolvedSide {
  readonly partName: string;
  readonly origin: Vec3;
  readonly direction: Vec3;
}

/** Mirror of `jointAxisBinding.ts` / `jointVisualExposure.ts`'s `resolveSide`. */
async function resolveSide(
  ref: string,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  worldTransforms: ReadonlyMap<string, Transform>,
): Promise<ResolvedSide | undefined> {
  const { partName, connectorName } = parseConnectorRef(ref);
  const part = partsByName.get(partName);
  if (!part) return undefined;
  const connector = part.mateConnectors.find((c) => c.name === connectorName);
  if (!connector) return undefined;
  const localOrigin = await resolveLocalOrigin(part, connector);
  const localAxis = (connector.axis ?? [0, 0, 1]) as Vec3;
  const worldT = worldTransforms.get(partName) ?? Transform.identity();
  const origin = worldT.point(localOrigin as Se3Vec3) as Vec3;
  const direction = worldT.axisDir(localAxis as Se3Vec3) as Vec3;
  return { partName, origin, direction };
}

async function resolveLocalOrigin(part: AssemblyPartStored, connector: Connector): Promise<Vec3> {
  const resolved = await resolveConnectorOrigin(part.originalShape, connector.origin);
  return resolved.value;
}

// =============================================================================
// Sub-check helpers
// =============================================================================

/** Test a point against the shape's world AABB padded with `pad`. */
function pointInsideShapeAabb(point: Vec3, shape: OcctBackend, pad = 0.5): boolean {
  const bb = shape.boundingBox();
  return (
    point[0] >= bb.min[0] - pad && point[0] <= bb.max[0] + pad
    && point[1] >= bb.min[1] - pad && point[1] <= bb.max[1] + pad
    && point[2] >= bb.min[2] - pad && point[2] <= bb.max[2] + pad
  );
}

interface BearingMeasurement {
  /** Inner-cheek-to-outer-cheek axial distance (mm) — max of +/-axis sides. */
  readonly gap: number;
  /** Inferred fork-plate thickness used to scale the tolerance. */
  readonly plateT?: number;
  /** Fork inner-gap (distance between inner cheek faces along axis). */
  readonly forkGapY?: number;
  /** Mid-point of the fork inner-gap along the axis. */
  readonly forkAxialCentre?: number;
  /** Mid-point of the tongue along the axis. */
  readonly tongueAxialCentre?: number;
  /** True when the tongue axially MISSES the fork gap entirely (no overlap). */
  readonly tongueOutsideForkGap?: boolean;
}

/**
 * Measure the axial gap between the parent's fork inner-cheek face and the
 * child's tongue outer-cheek face on each axial side. Returns the larger of
 * the two side gaps (the worse one). Returns `undefined` when no
 * plate-like parent face is detectable — in that case Gate 4 already
 * flagged the joint as visually collapsed and Gate 6 has no opinion on
 * coplanarity.
 *
 * The plate-face detection mirrors Gate 4's logic: a face counts as
 * fork-plate-like iff its axis range is below `2 * pinR` (thin slab) and
 * its perpendicular max extent exceeds `3 * pinR` (substantial — bigger
 * than a pin cap).
 */
function measureBearingCoplanarity(
  parent: OcctBackend,
  child: OcctBackend,
  axisOrigin: Vec3,
  axisDir: Vec3,
  pinR: number,
): BearingMeasurement | undefined {
  const AXIS_THICK_FACTOR = 2.0;
  const PLATE_PERP_FACTOR = 3.0;
  const axisThickThreshold = AXIS_THICK_FACTOR * pinR;
  const platePerpThreshold = PLATE_PERP_FACTOR * pinR;

  const childInterval = axisInterval(child, axisOrigin, axisDir);

  let plateInnerPositive: number | undefined; // nearest parent inner-cheek face on +axis side
  let plateInnerNegative: number | undefined; // nearest parent inner-cheek face on -axis side
  let inferredPlateT: number | undefined;
  const replicadShape = parent.getReplicadShape();
  for (const face of replicadShape.faces) {
    const bb = face.boundingBox.bounds;
    const aabbMin = bb[0] as Vec3;
    const aabbMax = bb[1] as Vec3;
    const range = projectAabbToAxis(aabbMin, aabbMax, axisOrigin, axisDir);
    const axisThickness = range.max - range.min;
    if (axisThickness > axisThickThreshold) continue;
    const perp = perpendicularProjection(aabbMin, aabbMax, axisDir);
    const perpMax = Math.max(perp.uMax - perp.uMin, perp.vMax - perp.vMin);
    if (perpMax < platePerpThreshold) continue;
    if (inferredPlateT === undefined || axisThickness < inferredPlateT) {
      inferredPlateT = axisThickness;
    }
    if (range.min > childInterval.max) {
      // Plate sits axially on the +side of the child — track the nearest.
      if (plateInnerPositive === undefined || range.min < plateInnerPositive) {
        plateInnerPositive = range.min;
      }
    } else if (range.max < childInterval.min) {
      if (plateInnerNegative === undefined || range.max > plateInnerNegative) {
        plateInnerNegative = range.max;
      }
    }
  }
  if (plateInnerPositive === undefined && plateInnerNegative === undefined) {
    return undefined;
  }
  const gapPositive = plateInnerPositive !== undefined
    ? Math.max(0, plateInnerPositive - childInterval.max)
    : 0;
  const gapNegative = plateInnerNegative !== undefined
    ? Math.max(0, childInterval.min - plateInnerNegative)
    : 0;
  // Fork-gap axial centre + width, tongue axial centre, overlap test.
  let forkGapY: number | undefined;
  let forkAxialCentre: number | undefined;
  let tongueOutsideForkGap = false;
  if (plateInnerPositive !== undefined && plateInnerNegative !== undefined) {
    forkGapY = plateInnerPositive - plateInnerNegative;
    forkAxialCentre = 0.5 * (plateInnerPositive + plateInnerNegative);
    tongueOutsideForkGap =
      childInterval.max < plateInnerNegative || childInterval.min > plateInnerPositive;
  }
  const tongueAxialCentre = 0.5 * (childInterval.min + childInterval.max);
  return {
    gap: Math.max(gapPositive, gapNegative),
    ...(inferredPlateT !== undefined ? { plateT: inferredPlateT } : {}),
    ...(forkGapY !== undefined ? { forkGapY } : {}),
    ...(forkAxialCentre !== undefined ? { forkAxialCentre } : {}),
    tongueAxialCentre,
    tongueOutsideForkGap,
  };
}

/**
 * Sub-check 3 — pin containment at every sampled pose. Returns a hint
 * detail when a sample's child origin escapes the parent body AABB along
 * the joint axis, otherwise `undefined`.
 *
 * Implementation: for revolute mates the joint origin is fixed under
 * rotation about the axis (on-axis points are invariant). For prismatic
 * mates, the child translates along the axis by `pose` mm. We propagate
 * the per-sample child-side joint origin and re-test the joint axis line
 * against the parent's body AABB extended by `clearance`. When the
 * displaced origin falls OUTSIDE the parent's axis interval expanded by
 * the inferred knuckle radius, the pin escapes the hole.
 *
 * `samples` poses are uniformly spaced across the closed interval
 * `[limits[0], limits[1]]`.
 */
function checkPinContainment(
  mateType: 'revolute' | 'prismatic',
  axisOriginParent: Vec3,
  axisOriginChild: Vec3,
  axisDir: Vec3,
  limits: readonly [number, number],
  samples: number,
  parent: OcctBackend,
  child: OcctBackend,
  knuckleR: number,
): string | undefined {
  if (samples < 1) return undefined;
  const span = limits[1] - limits[0];
  const parentAxisInterval = axisInterval(parent, axisOriginParent, axisDir);
  const childInitialAxisInterval = axisInterval(child, axisOriginParent, axisDir);
  for (let i = 0; i < samples; i++) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    const pose = limits[0] + span * t;
    let childOrigin: Vec3;
    if (mateType === 'revolute') {
      // Revolute: rotation about the axis is an identity for points ON
      // the axis. So the joint origin remains at `axisOriginChild`
      // (modulo any pre-existing offset between parent / child connector
      // origins, which is the meaningful signal — if the child's joint
      // origin is OFF the parent's axis, rotation will sweep it through
      // space and we'll detect the offset directly).
      childOrigin = axisOriginChild;
    } else {
      // Prismatic: child translates along the joint axis by pose mm.
      childOrigin = [
        axisOriginChild[0] + axisDir[0] * pose,
        axisOriginChild[1] + axisDir[1] * pose,
        axisOriginChild[2] + axisDir[2] * pose,
      ];
    }
    // Off-axis distance from parent's joint axis line.
    const offAxis = pointToLineDistance(childOrigin, axisOriginParent, axisDir);
    if (offAxis > knuckleR) {
      return `at pose ${pose.toFixed(2)} the child connector origin is ${offAxis.toFixed(3)} mm off the joint axis (> knuckleR proxy ${knuckleR.toFixed(2)} mm); the through-hole cannot stay aligned`;
    }
    // Parent must still contain the joint origin along the axis.
    const childAxisCoord = projectPointToAxis(childOrigin, axisOriginParent, axisDir);
    if (
      childAxisCoord + (childInitialAxisInterval.max - childInitialAxisInterval.min) / 2 < parentAxisInterval.min
      || childAxisCoord - (childInitialAxisInterval.max - childInitialAxisInterval.min) / 2 > parentAxisInterval.max
    ) {
      return `at pose ${pose.toFixed(2)} (mate type ${mateType}) the displaced child joint origin axis-coord ${childAxisCoord.toFixed(3)} exits the parent's axis interval [${parentAxisInterval.min.toFixed(3)}, ${parentAxisInterval.max.toFixed(3)}]; the pin escapes the hole`;
    }
  }
  return undefined;
}

/**
 * Sub-check 4 — over-constrained BREP test. Build a generous cylindrical
 * envelope along the joint axis (radius `1.2 * pinR`, length spanning the
 * parent's axis interval + a margin) and subtract it from both parts.
 * Boolean-intersect the residues. A non-empty intersection (volume above
 * `OVER_CONSTRAINED_VOLUME_FLOOR_MM3`) means the parts still touch
 * outside the pin envelope — the mate is mechanically over-constrained.
 *
 * Returns a hint detail when the residue overlap exceeds the floor;
 * `undefined` when the mate is clean. Failures inside replicad's boolean
 * pipeline are swallowed and treated as PASS (an OCCT failure is not a
 * Gate 6 failure — it would be a separate kernel-level signal).
 */
function checkOverConstrained(
  parent: OcctBackend,
  child: OcctBackend,
  axisOrigin: Vec3,
  axisDir: Vec3,
  pinR: number,
  knuckleR: number,
): string | undefined {
  try {
    // Span the pin envelope generously along the axis so the cylinder
    // brackets every cheek + cap + bridge tab that could touch.
    const parentInterval = axisInterval(parent, axisOrigin, axisDir);
    const childInterval = axisInterval(child, axisOrigin, axisDir);
    const axMin = Math.min(parentInterval.min, childInterval.min) - knuckleR;
    const axMax = Math.max(parentInterval.max, childInterval.max) + knuckleR;
    const length = axMax - axMin;
    if (length <= 0) return undefined;
    const cylRadius = 1.2 * pinR;
    const cylCentre: Vec3 = [
      axisOrigin[0] + axisDir[0] * (axMin + length / 2),
      axisOrigin[1] + axisDir[1] * (axMin + length / 2),
      axisOrigin[2] + axisDir[2] * (axMin + length / 2),
    ];
    const envelope = buildAxisCylinder(length, cylRadius, axisDir, cylCentre);
    if (envelope === undefined) return undefined;
    // Clone both parts before subtracting — replicad's boolean ops mutate
    // the source handles (the same hazard documented in detectInterferences).
    // Two clones of the envelope so each subtract gets a fresh handle.
    const envelopeForParent = envelope;
    const envelopeForChild = envelope.clone();
    const parentRes = parent.clone().subtract(envelopeForParent);
    const childRes = child.clone().subtract(envelopeForChild);
    const residueIntersect = parentRes.intersect(childRes);
    if (residueIntersect.isEmpty()) return undefined;
    const volume = residueIntersect.volume();
    if (volume > OVER_CONSTRAINED_VOLUME_FLOOR_MM3) {
      return `parts still overlap by ${volume.toFixed(2)} mm^3 after removing the pin envelope (radius ${cylRadius.toFixed(2)} mm); material outside the pin is constraining the mate`;
    }
  } catch {
    // OCCT boolean failures are not a Gate 6 signal — fall through.
    return undefined;
  }
  return undefined;
}

/**
 * Build a cylinder OcctBackend aligned with `axisDir` and centered at
 * `centre`, with the supplied length and radius. Default replicad
 * cylinder is along +Z spanning Z=[0, length]; we shift to centred, then
 * rotate +Z → `axisDir`, then translate to `centre`. Returns `undefined`
 * if OCCT construction fails.
 */
function buildAxisCylinder(
  length: number,
  radius: number,
  axisDir: Vec3,
  centre: Vec3,
): OcctBackend | undefined {
  try {
    const baseCylinder = OcctBackend.cylinder(length, radius);
    // Centre along its axis: translate -length/2 along Z so the cylinder
    // straddles Z=[-length/2, length/2].
    const Tcentre = Transform.translation(0, 0, -length / 2);
    const centred = baseCylinder.applyTransform(Tcentre);

    // Rotation: map +Z to axisDir via axis-angle about (Z × axisDir).
    const z: Vec3 = [0, 0, 1];
    const rotAxis: Vec3 = [
      z[1] * axisDir[2] - z[2] * axisDir[1],
      z[2] * axisDir[0] - z[0] * axisDir[2],
      z[0] * axisDir[1] - z[1] * axisDir[0],
    ];
    const crossLen = Math.hypot(rotAxis[0], rotAxis[1], rotAxis[2]);
    const dot = z[0] * axisDir[0] + z[1] * axisDir[1] + z[2] * axisDir[2];
    const angleDeg = (Math.atan2(crossLen, dot) * 180) / Math.PI;
    let rotated: OcctBackend = centred;
    if (crossLen > PARALLEL_DIRECTION_EPSILON) {
      const Trot = Transform.rotationAxisAngleDeg(
        [rotAxis[0] / crossLen, rotAxis[1] / crossLen, rotAxis[2] / crossLen] as Se3Vec3,
        angleDeg,
      );
      rotated = centred.applyTransform(Trot);
    } else if (dot < 0) {
      // axisDir is -Z — rotate 180° about X.
      rotated = centred.applyTransform(Transform.rotationAxisAngleDeg([1, 0, 0] as Se3Vec3, 180));
    }
    const Ttrans = Transform.translation(centre[0], centre[1], centre[2]);
    return rotated.applyTransform(Ttrans);
  } catch {
    return undefined;
  }
}

// =============================================================================
// Pin-radius inference (mirrors Gate 4 — kept local so the helper stays
// private to each module)
// =============================================================================

function inferPinRadius(parent: OcctBackend, child: OcctBackend, axisOrigin: Vec3, axisDir: Vec3): number {
  const { u, v } = buildPerpendicularFrame(axisDir);
  let smallestHalf = Infinity;
  for (const shape of [parent, child]) {
    const replicadShape = shape.getReplicadShape();
    for (const face of replicadShape.faces) {
      const bb = face.boundingBox.bounds;
      const aabbMin = bb[0] as Vec3;
      const aabbMax = bb[1] as Vec3;
      let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
      for (let i = 0; i < 8; i++) {
        const p: Vec3 = [
          ((i & 1) === 0 ? aabbMin[0] : aabbMax[0]) - axisOrigin[0],
          ((i & 2) === 0 ? aabbMin[1] : aabbMax[1]) - axisOrigin[1],
          ((i & 4) === 0 ? aabbMin[2] : aabbMax[2]) - axisOrigin[2],
        ];
        const uu = p[0] * u[0] + p[1] * u[1] + p[2] * u[2];
        const vv = p[0] * v[0] + p[1] * v[1] + p[2] * v[2];
        if (uu < uMin) uMin = uu;
        if (uu > uMax) uMax = uu;
        if (vv < vMin) vMin = vv;
        if (vv > vMax) vMax = vv;
      }
      const halfU = 0.5 * (uMax - uMin);
      const halfV = 0.5 * (vMax - vMin);
      const halfMax = Math.max(halfU, halfV);
      if (halfMax < PARALLEL_DIRECTION_EPSILON) continue;
      // Face perpendicular AABB must straddle the joint axis (so it's a
      // candidate pin feature, not an off-axis prism).
      if (uMin > 0 || uMax < 0 || vMin > 0 || vMax < 0) continue;
      if (halfMax < smallestHalf) smallestHalf = halfMax;
    }
  }
  return smallestHalf < Infinity ? smallestHalf : PIN_R_FALLBACK_MM;
}

// =============================================================================
// Geometric / vector helpers
// =============================================================================

function projectAabbToAxis(
  aabbMin: Vec3,
  aabbMax: Vec3,
  origin: Vec3,
  axisDir: Vec3,
): { min: number; max: number } {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p: Vec3 = [
      ((i & 1) === 0 ? aabbMin[0] : aabbMax[0]) - origin[0],
      ((i & 2) === 0 ? aabbMin[1] : aabbMax[1]) - origin[1],
      ((i & 4) === 0 ? aabbMin[2] : aabbMax[2]) - origin[2],
    ];
    const t = p[0] * axisDir[0] + p[1] * axisDir[1] + p[2] * axisDir[2];
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  }
  return { min: lo, max: hi };
}

function axisInterval(shape: OcctBackend, origin: Vec3, axisDir: Vec3): { min: number; max: number } {
  const bb = shape.boundingBox();
  return projectAabbToAxis(bb.min, bb.max, origin, axisDir);
}

function perpendicularProjection(
  aabbMin: Vec3,
  aabbMax: Vec3,
  axisDir: Vec3,
): { uMin: number; uMax: number; vMin: number; vMax: number } {
  const { u, v } = buildPerpendicularFrame(axisDir);
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p: Vec3 = [
      ((i & 1) === 0 ? aabbMin[0] : aabbMax[0]),
      ((i & 2) === 0 ? aabbMin[1] : aabbMax[1]),
      ((i & 4) === 0 ? aabbMin[2] : aabbMax[2]),
    ];
    const uu = p[0] * u[0] + p[1] * u[1] + p[2] * u[2];
    const vv = p[0] * v[0] + p[1] * v[1] + p[2] * v[2];
    if (uu < uMin) uMin = uu;
    if (uu > uMax) uMax = uu;
    if (vv < vMin) vMin = vv;
    if (vv > vMax) vMax = vv;
  }
  return { uMin, uMax, vMin, vMax };
}

function buildPerpendicularFrame(axisDir: Vec3): { u: Vec3; v: Vec3 } {
  const seed: Vec3 = Math.abs(axisDir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normalize(cross(seed, axisDir)) ?? [1, 0, 0];
  const v = normalize(cross(axisDir, u)) ?? [0, 1, 0];
  return { u, v };
}

function combinedBoundingSphereRadius(a: OcctBackend, b: OcctBackend): number {
  const ba = a.boundingBox();
  const bb = b.boundingBox();
  const min: Vec3 = [
    Math.min(ba.min[0], bb.min[0]),
    Math.min(ba.min[1], bb.min[1]),
    Math.min(ba.min[2], bb.min[2]),
  ];
  const max: Vec3 = [
    Math.max(ba.max[0], bb.max[0]),
    Math.max(ba.max[1], bb.max[1]),
    Math.max(ba.max[2], bb.max[2]),
  ];
  const dx = max[0] - min[0];
  const dy = max[1] - min[1];
  const dz = max[2] - min[2];
  return 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: Vec3): Vec3 | undefined {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < PARALLEL_DIRECTION_EPSILON) return undefined;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function projectPointToAxis(p: Vec3, origin: Vec3, axisDir: Vec3): number {
  return (p[0] - origin[0]) * axisDir[0] + (p[1] - origin[1]) * axisDir[1] + (p[2] - origin[2]) * axisDir[2];
}

function pointToLineDistance(p: Vec3, lineOrigin: Vec3, lineDir: Vec3): number {
  const dx = p[0] - lineOrigin[0];
  const dy = p[1] - lineOrigin[1];
  const dz = p[2] - lineOrigin[2];
  const t = dx * lineDir[0] + dy * lineDir[1] + dz * lineDir[2];
  const px = dx - lineDir[0] * t;
  const py = dy - lineDir[1] * t;
  const pz = dz - lineDir[2] * t;
  return Math.hypot(px, py, pz);
}

function fmtVec(v: Vec3): string {
  return `${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}`;
}

function buildHint(mate: MateRecord, result: MateAnalysis): string {
  const causeText = result.detail ?? 'no further detail';
  return (
    `invalid-args.assembly.mate-not-physically-realized — mate '${mate.name}' (${mate.type}) `
    + `failure '${result.failure ?? 'unknown'}': ${causeText}. `
    + `Build the mate with joint.clevis(...) (or the prismatic/cylindrical equivalent) `
    + `so a real pin/shaft is unioned into both parts and the through-hole is drilled in `
    + `one pass — see kernelcad-kinematic SKILL.md "Mechanism delivery — non-bypassable".`
  );
}
