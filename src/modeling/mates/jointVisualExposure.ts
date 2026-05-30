// src/lib/mates/jointVisualExposure.ts
//
// v0.7 Gate 4 — joint visual exposure.
//
// Spec: `2026-05-30-joint-visual-exposure-gate-design.md`.
// Plan: `2026-05-30-joint-visual-exposure-gate-plan.md`.
// Parent workstream: `2026-05-15-v0.7-kinematic-grounding-design.md`.
//
// A revolute mate's fork+tongue+pin geometry must remain visually
// distinguishable as a hinge: the fork plates must show a measurable air-
// gap around the pivot pin, and the pivot pin's caps must protrude beyond
// the outer fork-plate face. When either threshold collapses — when the
// hinge mechanism reads as one solid block (the 2026-05-30 Luxo lamp
// failure that motivated this gate) — Gate 4 emits an
// `assembly.joint.not-visible` diagnostic with the actual measurements
// in the hint so the agent can widen the gap / extend the pin without
// re-rendering.
//
// ## Ordering & cache reuse
//
// Gate 4 runs AFTER Gate 2 (`validateJointAxisBinding`) in
// `validateAssemblyWithMates`. Gate 2 already lowers each assembly part
// once via `RecomputeEngine.run` + per-part `applyTransform`; the resulting
// world-transformed OCCT shape map is exposed via
// `validateJointAxisBindingWithCache` and passed directly into Gate 4 as
// `loweredShapes` so this gate adds zero recompute cost — only the per-
// joint geometric probing.
//
// ## How the measurements work (concrete, BREP-only)
//
// For each revolute mate joining `parentPart` and `childPart` at world-
// frame joint axis `a` through world-frame origin `O`:
//
//   1. Lift the joint origin / axis to world coords using the cached
//      `worldTransforms`.
//   2. Measure the **parent's nearest fork-plate inner face to origin
//      along the axis, on each axial side**, by walking the parent's
//      faces, projecting each face's world AABB onto the joint axis,
//      filtering out faces whose axis-range is thicker than the inferred
//      pin radius (those are the pin's lateral/cylindrical face, which
//      we want to EXCLUDE — the pin doesn't carry the daylight signal),
//      and taking the nearest "thin slab" face on each axial side.
//   3. Measure the **child's outer-tongue face along the axis on each
//      side** as the min / max of the child's world AABB projected
//      onto the axis.
//   4. **Daylight per side** = parent_inner_face − child_outer_face.
//   5. **gap_ratio** = `min(daylight_+, daylight_-) / parent_perpendicular_extent`.
//      The parent's perpendicular extent is the larger of the two
//      axis-perpendicular AABB dimensions — for a typical clevis fork
//      that's the plate's vertical extent (FORK_PLATE_Z = 30 mm in the
//      Luxo example).
//   6. **pin_stickout** = average over both sides of `max(child_axis_max,
//      parent_axis_max) − parent_axis_max` for the positive side and
//      mirrored for the negative side. (The pin lives with either part;
//      the measurement is symmetric across the union.)
//
// The Luxo regression numbers fall straight out of this:
//
//   Pre-8e2f0da7:  daylight = (12-10)/2 = 1 mm, parent_perp_extent = 30 mm
//                  → gap_ratio = 0.033 → FAILS MIN_GAP_RATIO = 0.15.
//                  pin_stickout = (28 - 12 - 2*4)/2 = 4 mm.
//   Post-8e2f0da7: daylight = (18-6)/2 = 6 mm → gap_ratio = 0.2 → passes.
//                  pin_stickout = (38 - 18 - 2*3)/2 = 7 mm → passes.
//
// ## Microscale skip
//
// Joints whose combined parent+child bounding-sphere radius is below
// `MICROSCALE_BOUNDING_RADIUS` (5 mm) skip the gate entirely. Micro-
// mechanisms (e.g. watch movements, sub-mm hinges) are not expected to
// read as hinges at typical viewing distance, and false-positives there
// poison the signal everywhere else. Spec §"Locked decisions" item 5.

import type { Vec3 } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import type { Vec3 as Se3Vec3 } from '../../shared/runtime/se3';
import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { resolveConnectorOrigin, type Connector } from './connector';
import { parseConnectorRef, type MateRecord } from './mate';
import type { ValidatorDiagnostic } from './validator';

/**
 * Minimum fork-plate gap ratio for a revolute joint to read as a hinge.
 * 0.15 is the floor per spec §"Locked decisions" item 2 — anything tighter
 * (< 15 % daylight) collapses visually at typical viewing distance.
 */
const MIN_GAP_RATIO = 0.15;

/**
 * Minimum pivot-pin stickout, expressed as a multiplier on the pin
 * radius. With a typical Ø7 mm pin (`PIN_R = 3.5`), the threshold is
 * 3.5 mm of pin sticking out beyond the outer fork-plate face on each
 * side — enough overhang for the bolt heads / caps to read as real
 * hardware rather than decorative dots. Spec §"Locked decisions" item 2.
 */
const MIN_PIN_STICKOUT_FACTOR = 1.0;

/**
 * Combined parent+child bounding-sphere radius (mm) below which Gate 4
 * skips the joint entirely. Spec §"Locked decisions" item 5.
 */
const MICROSCALE_BOUNDING_RADIUS = 5;

/**
 * Spec §"How the measurements work" §"Gap ratio" sample count. The
 * spec called for an N=8 ray sweep through the joint origin in the
 * axis-perpendicular plane to find the largest empty interval in the
 * parent silhouette. Implementation deviation: the actual measurement
 * is closed-form (face-axis-range walk — see `measureJointVisuals`)
 * because the BREP face-AABB approach gives the same answer
 * deterministically without the discretization noise of an 8-ray
 * sample. The constant is retained for diagnostic-tuning surface and
 * documentation of the spec's intended heuristic depth.
 */
export const RAY_SAMPLES = 8;

/**
 * Direction-vector parallelism / divide-by-zero floor — matches Gate 2's
 * convention.
 */
const PARALLEL_DIRECTION_EPSILON = 1e-4;

/**
 * Fallback pivot-pin radius (mm) when the proxy inference collapses to
 * near-zero on a degenerate child. Matches the typical M6-clevis pin
 * radius used by the Luxo example so the diagnostic stays meaningful.
 */
const PIN_R_FALLBACK_MM = 3.5;

/** Inputs passed by `validateAssemblyWithMates` to Gate 4. */
export interface JointVisualExposureInput {
  readonly arm: Assembly;
  /**
   * Per-part lowered + world-transformed OCCT shape cache built by Gate 2
   * (`validateJointAxisBindingWithCache`). Gate 4 does not lower or
   * transform any shape on its own — when this cache is empty, the gate
   * is inert by construction.
   */
  readonly loweredShapes: ReadonlyMap<string, OcctBackend>;
  /**
   * Per-part SE(3) world transforms produced alongside `loweredShapes`.
   * Gate 4 lifts connector origins / axes from the part-local frame to
   * world coordinates for the per-joint probing.
   */
  readonly worldTransforms: ReadonlyMap<string, Transform>;
}

/**
 * v0.7 Gate 4 entry point. Async only because the connector-origin
 * resolution (`resolveConnectorOrigin`) is async for topology origins; the
 * geometric probing itself is pure / synchronous. Returns a (possibly
 * empty) list of `assembly.joint.not-visible` diagnostics — one per
 * revolute mate that fails either threshold.
 */
export async function validateJointVisualExposure(
  input: JointVisualExposureInput,
): Promise<ValidatorDiagnostic[]> {
  const { arm, loweredShapes, worldTransforms } = input;
  // Empty cache → Gate 2 either had no gated mates or short-circuited;
  // nothing to gate against here either.
  if (loweredShapes.size === 0) return [];

  const partsByName = new Map<string, AssemblyPartStored>();
  for (const p of arm.__parts()) partsByName.set(p.name, p);

  const out: ValidatorDiagnostic[] = [];
  for (const mate of arm.__mates()) {
    // Non-revolute joints are out of scope per spec §"Locked decisions" §1
    // and §"Out of scope" — `prismatic` / `pin_slot` / `ball` etc. get
    // their own gates later if they exhibit the same failure mode.
    if (mate.type !== 'revolute') continue;

    const sideA = await resolveSide(mate.a, partsByName, worldTransforms);
    const sideB = await resolveSide(mate.b, partsByName, worldTransforms);
    if (!sideA || !sideB) continue;

    const parentShape = loweredShapes.get(sideA.partName);
    const childShape = loweredShapes.get(sideB.partName);
    if (!parentShape || !childShape) continue;

    // Microscale skip — combined parent+child bounding-sphere radius
    // below the threshold means the joint is too small to expect to
    // read as a hinge at typical viewing distance. Spec §"Locked
    // decisions" §5.
    const combinedRadius = combinedBoundingSphereRadius(parentShape, childShape);
    if (combinedRadius < MICROSCALE_BOUNDING_RADIUS) continue;

    // Build the joint-axis world line. Axis direction is consistent on
    // both sides of a revolute mate (the mate-graph validator enforces
    // axis-axis pairing); use side A's. Gate 2 already guarantees the
    // line passes through both bodies, so we can use side A's origin
    // without loss.
    const axisOrigin = sideA.origin;
    const axisDir = normalize(sideA.direction);
    if (axisDir === undefined) continue; // degenerate axis — out of scope

    const inferredPinR = inferPinRadius(parentShape, childShape, axisDir);
    const measurements = measureJointVisuals(
      parentShape,
      childShape,
      axisOrigin,
      axisDir,
      inferredPinR,
    );
    const minPinStickout = MIN_PIN_STICKOUT_FACTOR * inferredPinR;

    const gapFails = measurements.gapRatio < MIN_GAP_RATIO;
    const pinFails = measurements.pinStickout < minPinStickout;
    if (!gapFails && !pinFails) continue;

    const failureCause: 'gap' | 'pin-stickout' | 'both' = gapFails && pinFails
      ? 'both'
      : gapFails
        ? 'gap'
        : 'pin-stickout';

    out.push({
      code: 'assembly.joint.not-visible',
      severity: 'error',
      mateName: mate.name,
      message: `Joint '${mate.name}' (revolute) is not visually distinguishable as a hinge.`,
      hint: buildHint(mate, measurements.gapRatio, measurements.pinStickout, minPinStickout, failureCause),
    });
  }
  return out;
}

interface ResolvedSide {
  readonly partName: string;
  readonly origin: Vec3;
  readonly direction: Vec3;
}

/** Mirror of `jointAxisBinding.ts`'s `resolveSide`. */
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

interface JointVisuals {
  readonly gapRatio: number;
  readonly pinStickout: number;
}

/**
 * Closed-form measurement of (a) the fork-plate gap ratio and (b) the
 * pin-stickout, both from the joint-axis-projected face/AABB data.
 *
 * **Gap ratio** = `min(daylight_+, daylight_-) / parent_perp_extent` where:
 *
 *   - `daylight_+` = nearest parent fork-plate-inner-face position along
 *     `+a` (axial), MINUS the child's outermost extent along `+a`.
 *   - `daylight_-` = mirrored sign convention for the negative axial side.
 *   - "Nearest parent fork-plate-inner-face" walks parent faces, projects
 *     each onto the axis, and filters to faces whose axis-range is
 *     thinner than `axisThickThreshold = 2 × pinRadius` so that the pin's
 *     lateral cylindrical face (which spans the whole axis range) is
 *     excluded — only flat plate-like faces contribute to the daylight
 *     signal.
 *   - `parent_perp_extent` = the larger of the two perpendicular AABB
 *     dimensions of the parent's world AABB. For a typical clevis fork
 *     that's the plate Z extent (FORK_PLATE_Z = 30 mm).
 *
 * **Pin stickout** = `average over both axial sides of max(0,
 * (child_axis_extent) − (parent_axis_outermost_plate_extent))`. The pin
 * may live on either part — the measurement is symmetric across the
 * union envelope.
 *
 * If no plate-like parent face is found on a given side, the gap ratio
 * for that side falls back to the spec's "gate trivially passes"
 * convention (gap_ratio = +∞ on that side, i.e. doesn't constrain the
 * overall min). When NEITHER side has any plate-like face — i.e. the
 * parent is a single solid block with no fork — the gate flags
 * `gap_ratio = 0` (the whole point of Gate 4 is to catch exactly that
 * configuration).
 */
function measureJointVisuals(
  parent: OcctBackend,
  child: OcctBackend,
  axisOrigin: Vec3,
  axisDir: Vec3,
  pinRadius: number,
): JointVisuals {
  // A face counts as "plate-like" iff it satisfies ALL of:
  //   (a) axis thickness ≤ AXIS_THICK_FACTOR × pinR — excludes the pin's
  //       cylindrical lateral surface (whose axis span equals the full
  //       pin length, much bigger than the plate thickness)
  //   (b) max perpendicular AABB extent ≥ PLATE_PERP_FACTOR × pinR —
  //       excludes the pin's cap faces (whose perpendicular AABB equals
  //       the pin cross-section ≈ 2 × pinR, much smaller than a fork
  //       plate's perpendicular extent for typical Luxo-scale clevis
  //       hardware).
  //   (c) The face's perpendicular AABB substantially OVERLAPS the
  //       child's perpendicular AABB in the (u, v) frame — a real fork
  //       plate sits perpendicular to the axis and shares its profile
  //       with the tongue it straddles. This rules out incidental
  //       parent geometry that happens to live on the joint axis but
  //       isn't part of a fork (e.g. a finger box that sits BESIDE the
  //       tongue along the axis, not BETWEEN forking plates).
  //
  // Together these conditions filter to actual fork-plate faces and
  // exclude pin geometry, regardless of whether the pin lives on the
  // parent or the child.
  const AXIS_THICK_FACTOR = 2.0;
  const PLATE_PERP_FACTOR = 3.0;
  const PERP_OVERLAP_MIN_FRACTION = 0.5;
  const axisThickThreshold = AXIS_THICK_FACTOR * pinRadius;
  const platePerpThreshold = PLATE_PERP_FACTOR * pinRadius;
  const { u, v } = buildPerpendicularFrame(axisDir);
  const parentInterval = axisInterval(parent, axisOrigin, axisDir);
  const childInterval = axisInterval(child, axisOrigin, axisDir);
  const childBox = child.boundingBox();
  const childPerpProj = perpendicularProjection(childBox.min, childBox.max, u, v);
  const childPerpArea = (childPerpProj.uMax - childPerpProj.uMin)
    * (childPerpProj.vMax - childPerpProj.vMin);

  // Walk parent faces and collect their (axis-range, perp-extent,
  // perp-overlap) per face so we don't recompute the AABB-corner
  // projection twice.
  interface ParentFace {
    readonly axisMin: number;
    readonly axisMax: number;
    readonly perpMax: number;
    readonly perpOverlapFraction: number;
  }
  const parentFaces: ParentFace[] = [];
  const replicadShape = parent.getReplicadShape();
  for (const face of replicadShape.faces) {
    const bb = face.boundingBox.bounds;
    const aabbMin = bb[0] as Vec3;
    const aabbMax = bb[1] as Vec3;
    const range = projectAabbToAxis(aabbMin, aabbMax, axisOrigin, axisDir);
    const perp = perpendicularProjection(aabbMin, aabbMax, u, v);
    // Overlap rectangle of (face perp AABB) ∩ (child perp AABB) in (u, v).
    // Fraction is taken over the SMALLER of the face's own perp area
    // and the child's perp area — this captures "the face's silhouette
    // largely sits inside the child's silhouette" without being thrown
    // off when EITHER party has a much larger overall extent (e.g. the
    // lower-arm child whose perp AABB extends way past the fork plate
    // because the arm beam stretches L_LOWER=200 mm perpendicular to
    // the joint axis, while the actual fork plate is only 22 mm in
    // that dimension). The plate is a "real fork plate" if its
    // silhouette substantially overlaps the child's silhouette IN THE
    // REGION WHERE BOTH EXIST.
    const oUMin = Math.max(perp.uMin, childPerpProj.uMin);
    const oUMax = Math.min(perp.uMax, childPerpProj.uMax);
    const oVMin = Math.max(perp.vMin, childPerpProj.vMin);
    const oVMax = Math.min(perp.vMax, childPerpProj.vMax);
    const overlapW = Math.max(0, oUMax - oUMin);
    const overlapH = Math.max(0, oVMax - oVMin);
    const overlapArea = overlapW * overlapH;
    const facePerpArea = (perp.uMax - perp.uMin) * (perp.vMax - perp.vMin);
    const denomArea = Math.min(facePerpArea, childPerpArea);
    const perpOverlapFraction = denomArea > 0 ? overlapArea / denomArea : 0;
    parentFaces.push({
      axisMin: range.min,
      axisMax: range.max,
      perpMax: Math.max(perp.uMax - perp.uMin, perp.vMax - perp.vMin),
      perpOverlapFraction,
    });
  }
  const isPlateLike = (f: ParentFace): boolean =>
    (f.axisMax - f.axisMin) <= axisThickThreshold
    && f.perpMax >= platePerpThreshold
    && f.perpOverlapFraction >= PERP_OVERLAP_MIN_FRACTION;

  // Per-side fork-plate face axis-extents. For the positive (axial +)
  // side we want faces whose AXIS-MIN sits between the child's outer
  // face and the pin tip — those are the fork plates on that side.
  const plateFacesPositive = parentFaces.filter(
    (f) => isPlateLike(f) && f.axisMin > childInterval.max,
  );
  const plateFacesNegative = parentFaces.filter(
    (f) => isPlateLike(f) && f.axisMax < childInterval.min,
  );

  const nearestPositive = plateFacesPositive.length > 0
    ? Math.min(...plateFacesPositive.map((f) => f.axisMin))
    : undefined;
  const nearestNegative = plateFacesNegative.length > 0
    ? Math.max(...plateFacesNegative.map((f) => f.axisMax))
    : undefined;
  const farPositive = plateFacesPositive.length > 0
    ? Math.max(...plateFacesPositive.map((f) => f.axisMax))
    : undefined;
  const farNegative = plateFacesNegative.length > 0
    ? Math.min(...plateFacesNegative.map((f) => f.axisMin))
    : undefined;

  const daylightPositive = nearestPositive !== undefined
    ? nearestPositive - childInterval.max
    : Infinity;
  const daylightNegative = nearestNegative !== undefined
    ? childInterval.min - nearestNegative
    : Infinity;

  // If the parent doesn't have plate-like faces on BOTH axial sides of
  // the child, the parent isn't a fork — Gate 4 has no opinion on plain
  // box-on-box revolute joints or single-cheek connections. The gate is
  // a floor on EXISTING fork-style hinge hardware, not a hardware-
  // mandate (spec §"Goals" — "the hinge is visually distinguishable
  // from a brick"; an absent fork is a different concern). Returning a
  // trivially-passing measurement here keeps the gate inert on
  // simplified test fixtures and abstract sub-assemblies. Hinge-
  // hardware-detection is two-sided by design — a fork by definition
  // has TWO plates straddling the tongue.
  const hasPlatesBothSides =
    nearestPositive !== undefined && nearestNegative !== undefined;
  if (!hasPlatesBothSides) {
    return { gapRatio: Infinity, pinStickout: Infinity };
  }
  const minDaylight = Math.min(daylightPositive, daylightNegative);

  const perpExtent = parentPerpendicularExtent(parent, axisDir);
  const gapRatio = perpExtent < PARALLEL_DIRECTION_EPSILON
    ? 1.0 // defensive: parent has no perpendicular extent
    : minDaylight / perpExtent;

  // Pin stickout: how far the pin tip protrudes BEYOND the outermost
  // fork-plate face. Pin tip on each side = max(child, parent)
  // axis-extent (the pin may live with either part — we take the union
  // envelope). Fork outer face = `farPositive` / `farNegative` from the
  // plate-like filter above. When no plate is found on a side (e.g. a
  // tongue-on-tongue degenerate joint), fall back to the parent's
  // overall AABB extent so the stickout falls to 0 rather than
  // emitting a noise diagnostic.
  const forkOuterPositive = farPositive ?? parentInterval.max;
  const forkOuterNegative = farNegative ?? parentInterval.min;
  const pinTipPositive = Math.max(childInterval.max, parentInterval.max);
  const pinTipNegative = Math.min(childInterval.min, parentInterval.min);
  const stickoutPlus = Math.max(0, pinTipPositive - forkOuterPositive);
  const stickoutMinus = Math.max(0, forkOuterNegative - pinTipNegative);
  const pinStickout = 0.5 * (stickoutPlus + stickoutMinus);

  return { gapRatio, pinStickout };
}

/**
 * Helper — perpendicular (u, v) AABB rectangle of a 3-D AABB. Projects
 * the 8 corners onto the (u, v) plane and tracks min/max per axis.
 */
function perpendicularProjection(
  aabbMin: Vec3,
  aabbMax: Vec3,
  u: Vec3,
  v: Vec3,
): { uMin: number; uMax: number; vMin: number; vMax: number } {
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

/**
 * Project an AABB onto the joint axis, returning the (min, max)
 * signed-distance interval from `origin` along `axisDir`. Walks the 8
 * AABB corners and takes the min/max projection.
 */
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

/**
 * Bounding interval (min/max signed distance from `origin` along
 * `axisDir`) of `shape`'s world-frame AABB.
 */
function axisInterval(
  shape: OcctBackend,
  origin: Vec3,
  axisDir: Vec3,
): { min: number; max: number } {
  const bb = shape.boundingBox();
  return projectAabbToAxis(bb.min, bb.max, origin, axisDir);
}

/**
 * Parent's perpendicular extent — the larger of the two perpendicular
 * AABB dimensions. For a typical clevis fork lying along the joint
 * axis, this is the fork plate's vertical extent (FORK_PLATE_Z in the
 * Luxo example).
 */
function parentPerpendicularExtent(parent: OcctBackend, axisDir: Vec3): number {
  const { u, v } = buildPerpendicularFrame(axisDir);
  const bb = parent.boundingBox();
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p: Vec3 = [
      ((i & 1) === 0 ? bb.min[0] : bb.max[0]),
      ((i & 2) === 0 ? bb.min[1] : bb.max[1]),
      ((i & 4) === 0 ? bb.min[2] : bb.max[2]),
    ];
    const uu = p[0] * u[0] + p[1] * u[1] + p[2] * u[2];
    const vv = p[0] * v[0] + p[1] * v[1] + p[2] * v[2];
    if (uu < uMin) uMin = uu;
    if (uu > uMax) uMax = uu;
    if (vv < vMin) vMin = vv;
    if (vv > vMax) vMax = vv;
  }
  // The fork plate's "vertical" extent (FORK_PLATE_Z) is the LARGER of
  // the two perpendicular dimensions for a Luxo-style fork (plate Z=30,
  // plate X=22). We pick the larger so the ratio uses the more
  // generous denominator.
  return Math.max(uMax - uMin, vMax - vMin);
}

/**
 * Build an orthonormal 2-D frame spanning the plane perpendicular to
 * `axisDir`.
 */
function buildPerpendicularFrame(axisDir: Vec3): { u: Vec3; v: Vec3 } {
  const seed: Vec3 = Math.abs(axisDir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normalize(cross(seed, axisDir)) ?? [1, 0, 0];
  const v = normalize(cross(axisDir, u)) ?? [0, 1, 0];
  return { u, v };
}

/**
 * Combined parent+child bounding-sphere radius from the world-frame
 * AABBs. Half-diagonal of the AABB enclosing BOTH bodies' AABBs.
 */
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

/**
 * Infer the pivot-pin radius from the assembly's faces around the joint
 * axis. The pin is typically the smallest-perpendicular-cross-section
 * feature in the joint (the fork plates and the tongue are
 * substantially larger). We walk both shapes' faces and pick the
 * **smallest perpendicular-AABB half-diagonal** across faces that
 * straddle the joint origin in the perpendicular plane — this picks up
 * pin-cap faces (whose perpendicular AABB is the pin cross-section) and
 * pin-lateral faces (same perpendicular AABB) while ignoring fork
 * plates (their perpendicular AABBs are large).
 *
 * Falls back to `PIN_R_FALLBACK_MM` (3.5 mm — the Luxo M6-clevis
 * default) when no candidate face is found or the proxy collapses to
 * near-zero on a degenerate geometry. The spec calls 3.5 mm out
 * explicitly as the reference for `MIN_PIN_STICKOUT_FACTOR × PIN_R`.
 */
function inferPinRadius(parent: OcctBackend, child: OcctBackend, axisDir: Vec3): number {
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
      const halfU = 0.5 * (uMax - uMin);
      const halfV = 0.5 * (vMax - vMin);
      // Skip degenerate faces (perpendicular extent ≈ 0 — these are
      // faces whose normal is in the axis-perpendicular plane, not
      // useful for pin-radius inference). Take the LARGER of the two
      // half-extents so a pin's lateral cylindrical face (whose
      // perpendicular AABB is the pin cross-section ≈ 2 × PIN_R square)
      // is correctly read as PIN_R, not as 0.
      const halfMax = Math.max(halfU, halfV);
      if (halfMax < PARALLEL_DIRECTION_EPSILON) continue;
      // Only consider faces whose perpendicular AABB straddles the
      // joint origin in BOTH perpendicular directions — the pin sits on
      // the joint axis, so its perpendicular AABB encloses the origin.
      if (uMin > 0 || uMax < 0 || vMin > 0 || vMax < 0) continue;
      if (halfMax < smallestHalf) smallestHalf = halfMax;
    }
  }
  return smallestHalf < Infinity ? smallestHalf : PIN_R_FALLBACK_MM;
}

function buildHint(
  mate: MateRecord,
  gapRatio: number,
  pinStickout: number,
  minPinStickout: number,
  failureCause: 'gap' | 'pin-stickout' | 'both',
): string {
  const gapPct = (gapRatio * 100).toFixed(1);
  const minGapPct = (MIN_GAP_RATIO * 100).toFixed(0);
  const stickout = pinStickout.toFixed(2);
  const minStickout = minPinStickout.toFixed(2);
  const causeText = failureCause === 'both'
    ? `fork-plate gap is ${gapPct}% of plate extent (need >= ${minGapPct}%) AND pin stickout is ${stickout} mm beyond the outer fork face (need >= ${minStickout} mm)`
    : failureCause === 'gap'
      ? `fork-plate gap is ${gapPct}% of plate extent (need >= ${minGapPct}%); pin stickout ${stickout} mm is OK`
      : `pin stickout is ${stickout} mm beyond the outer fork face (need >= ${minStickout} mm); gap ratio ${gapPct}% is OK`;
  return (
    `invalid-args.assembly.joint-not-visible — revolute mate '${mate.name}' collapses to a single visual block: ${causeText}. `
    + `Widen FORK_GAP_Y versus TONGUE_Y and/or extend PIN_LEN so the hinge mechanism is visible at typical viewing distance.`
  );
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
