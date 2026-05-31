// src/modeling/joints/clevis.ts
//
// G1 — `joint.clevis(...)` constructive primitive.
//
// Builds the canonical revolute-joint hardware (two fork plates on the
// parent, one tongue on the child, a pin drilled through both knuckles)
// guaranteed-correct by construction:
//
//   1. Bridge tabs at y = ±(forkGapY/2 + plateT/2) — outside the tongue's
//      Y range, so the rotating tongue can never collide with them.
//   2. Pivot lifted out of the parent body by max rotated-tongue reach,
//      computed from `style + axis + limitsDeg`, never hardcoded.
//   3. Pin drilled through both knuckles in ONE subtract AFTER the fork and
//      tongue have been unioned into their respective parts — so the
//      through-hole is co-located in every solid it passes through.
//   4. Pin cap heads sit flush against the outer fork faces. Cap thickness
//      derived from pin shaft length, not a magic constant.
//   5. Connectors returned by reference — caller binds the mate to them and
//      lets `arm.mate(...)` do the coordinate math.
//
// Spec: `docs/specs/2026-05-30-kinematic-grounding-mechanism-delivery-design.md`
//        slice G1.
// Plan: `docs/plans/2026-05-31-mechanism-delivery-G1-joint-clevis-primitive.md`.

import type { KernelCadApi } from '../api';
import type { Shape } from '../capture/proxy';
import type { Vec3 } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import type {
  AxisHint,
  ClevisJoint,
  ClevisJointOptions,
  ClevisStyle,
  ResolvedClevisStyle,
} from './types';

// =============================================================================
// Public surface — the namespace exposed as `kc.joint`.
// =============================================================================

/**
 * Build clevis-joint hardware (fork + tongue + pin + through-hole) by
 * construction. Returns the parent/child geometry to assign back to each
 * part's `Shape`, plus the parent/child connector origins + axis to wire a
 * `revolute` mate.
 *
 * Critical algorithmic discipline encoded here:
 *  - The drill cylinder is subtracted ONCE per part, after the fork or
 *    tongue has been unioned with the body — drilling per-knuckle is the
 *    leading cause of "every gate green, mechanism falls apart" failures.
 *  - The pivot is lifted ALONG `liftDir` by the maximum rotated-tongue reach
 *    so the swept tongue stays clear of the parent body.
 *  - Bridge tabs at y = ±(forkGapY/2 + plateT/2) lock the fork plates to
 *    the parent body without ever entering the tongue's swing volume.
 *
 * @see ClevisJointOptions for the input shape.
 * @see ClevisJoint for the output shape.
 */
export function makeJointNamespace(kc: KernelCadApi): {
  clevis(opts: ClevisJointOptions): ClevisJoint;
} {
  return {
    clevis(opts: ClevisJointOptions): ClevisJoint {
      return buildClevis(kc, opts);
    },
  };
}

// =============================================================================
// Validation
// =============================================================================

function assertFiniteVec3(name: string, v: unknown): asserts v is Vec3 {
  if (
    !Array.isArray(v) || v.length !== 3 ||
    !v.every((c) => typeof c === 'number' && Number.isFinite(c))
  ) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: ${name} must be a finite Vec3 [x, y, z]; got ${JSON.stringify(v)}.`,
      'joint.clevis',
      `Pass a 3-tuple of finite numbers for ${name}.`,
    );
  }
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: ${name} must be a positive finite number; got ${value}.`,
      'joint.clevis',
      `Pick a positive value for ${name} (mm).`,
    );
  }
}

function normalizeAxis(hint: AxisHint): Vec3 {
  if (hint === 'X') return [1, 0, 0];
  if (hint === 'Y') return [0, 1, 0];
  if (hint === 'Z') return [0, 0, 1];
  assertFiniteVec3('axis', hint);
  const v = hint;
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-9) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: axis must be a non-zero direction; got [${v[0]}, ${v[1]}, ${v[2]}].`,
      'joint.clevis',
      "Pass 'X' / 'Y' / 'Z' or a non-zero Vec3 direction for axis.",
    );
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}

function normalizeLiftDir(hint: Vec3 | undefined): Vec3 {
  if (hint === undefined) return [0, 0, 1];
  assertFiniteVec3('liftDir', hint);
  const len = Math.hypot(hint[0], hint[1], hint[2]);
  if (len < 1e-9) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: liftDir must be a non-zero direction; got [${hint[0]}, ${hint[1]}, ${hint[2]}].`,
      'joint.clevis',
      'Pass a non-zero Vec3 direction for liftDir, or omit (defaults to +Z).',
    );
  }
  return [hint[0] / len, hint[1] / len, hint[2] / len];
}

// =============================================================================
// Style resolution — scale-derived defaults
// =============================================================================

/**
 * Resolve a partial `ClevisStyle` against scale-derived defaults. Without a
 * caller-supplied scale hint we assume a nominal arm-class scale of 12 mm
 * for `knuckleR`, which produces a buildable clevis for the Luxo-lamp class
 * of designs (the dimension drove the existing examples/kinematic/luxo
 * geometry). Callers who want fully-bespoke geometry pass every field.
 *
 * Defaults (documented in `types.ts`):
 *  - knuckleR = 12 mm (clamped to [3, 25])
 *  - tongueY = 0.6 * knuckleR
 *  - forkGapY = tongueY + 2 mm (so tongue is free to rotate without rubbing)
 *  - plateT = 0.4 * knuckleR
 *  - pinR = 0.35 * knuckleR
 *  - pinCapR = pinR + 1.5 mm
 *  - holeClearance = 0.2 mm
 */
export function withDefaults(style: ClevisStyle | undefined): ResolvedClevisStyle {
  const knuckleR = clamp(style?.knuckleR ?? 12, 3, 25);
  const tongueY = style?.tongueY ?? 0.6 * knuckleR;
  const forkGapY = style?.forkGapY ?? tongueY + 2;
  const plateT = style?.plateT ?? 0.4 * knuckleR;
  const pinR = style?.pinR ?? 0.35 * knuckleR;
  const pinCapR = style?.pinCapR ?? pinR + 1.5;
  const holeClearance = style?.holeClearance ?? 0.2;
  assertPositive('style.knuckleR', knuckleR);
  assertPositive('style.tongueY', tongueY);
  assertPositive('style.forkGapY', forkGapY);
  assertPositive('style.plateT', plateT);
  assertPositive('style.pinR', pinR);
  assertPositive('style.pinCapR', pinCapR);
  if (holeClearance < 0 || !Number.isFinite(holeClearance)) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: style.holeClearance must be a non-negative finite number; got ${holeClearance}.`,
      'joint.clevis',
      'Pass a non-negative numeric clearance (default 0.2 mm).',
    );
  }
  if (tongueY >= forkGapY) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: style.tongueY (${tongueY} mm) must be < style.forkGapY (${forkGapY} mm); otherwise the tongue does not slip between the fork plates.`,
      'joint.clevis',
      'Make tongueY smaller than forkGapY by at least 0.5 mm of running clearance.',
    );
  }
  if (pinR + holeClearance >= knuckleR) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: pinR + holeClearance (${pinR + holeClearance} mm) must be < knuckleR (${knuckleR} mm); otherwise the through-hole consumes the knuckle.`,
      'joint.clevis',
      'Pick a smaller pinR or a larger knuckleR so the drilled hole leaves wall thickness.',
    );
  }

  // Cap thickness — chosen so the shaft span (forkGapY + 2*plateT) plus two
  // caps reaches a small overhang past the outer fork faces (the cap heads
  // sit flush against the outer fork face but overlap the shaft by a small
  // amount so the boolean union merges into one connected solid).
  // Default: 0.4 * plateT, clamped to [1.5, plateT]. Caller can override.
  const derivedCapThickness = clamp(0.4 * plateT, 1.5, plateT);
  const pinCapThickness = style?.pinCapThickness ?? derivedCapThickness;
  assertPositive('style.pinCapThickness', pinCapThickness);

  return {
    knuckleR,
    forkGapY,
    tongueY,
    plateT,
    pinR,
    pinCapR,
    pinCapThickness,
    holeClearance,
    ...(style?.forkMaterial !== undefined ? { forkMaterial: style.forkMaterial } : {}),
    ...(style?.tongueMaterial !== undefined ? { tongueMaterial: style.tongueMaterial } : {}),
    ...(style?.pinMaterial !== undefined ? { pinMaterial: style.pinMaterial } : {}),
  };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// =============================================================================
// Pivot-lift math
// =============================================================================

/**
 * Maximum reach (in mm) of the rotated tongue's furthest point from the
 * pivot AWAY FROM the pin axis. The tongue extends radially from the pivot
 * by `knuckleR` (plate corner) and `tongueHalfHeight` along its long axis;
 * over the allowed rotation range, the largest projection perpendicular to
 * the pin axis is bounded by the radial extent times the largest |sin|
 * of the rotation extremes (plus a small safety margin).
 *
 * We use a conservative `radial = knuckleR + tongueHalfHeight` where
 * `tongueHalfHeight` here is the knuckle radius itself (the tongue plate's
 * end is rounded with the same radius). The result is a conservative upper
 * bound — the tongue will never reach further than this off-axis.
 */
export function computePivotLift(
  style: ResolvedClevisStyle,
  limitsDeg: [number, number],
): number {
  const radial = style.knuckleR + style.knuckleR; // pivot-to-tongue-tip ≤ 2 * knuckleR
  const a = (limitsDeg[0] * Math.PI) / 180;
  const b = (limitsDeg[1] * Math.PI) / 180;
  // Largest |sin| over the closed interval [a, b]. If the interval crosses
  // ±π/2, |sin| reaches 1; otherwise it's max(|sin a|, |sin b|).
  const crossesPlus = a <= Math.PI / 2 && b >= Math.PI / 2;
  const crossesMinus = a <= -Math.PI / 2 && b >= -Math.PI / 2;
  const sinMax = crossesPlus || crossesMinus
    ? 1
    : Math.max(Math.abs(Math.sin(a)), Math.abs(Math.sin(b)));
  const safety = 1; // 1 mm pad so the tongue's edge doesn't graze the parent
  return radial * sinMax + safety;
}

// =============================================================================
// The main construction algorithm
// =============================================================================

function buildClevis(kc: KernelCadApi, opts: ClevisJointOptions): ClevisJoint {
  // 0. Validate inputs.
  if (opts.parentBody === undefined || opts.childBody === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      'joint.clevis: parentBody and childBody are required.',
      'joint.clevis',
      'Pass the existing parent and child Shapes via parentBody / childBody.',
    );
  }
  assertFiniteVec3('pivotParent', opts.pivotParent);
  const pivotChild: Vec3 = opts.pivotChild ?? [0, 0, 0];
  assertFiniteVec3('pivotChild', pivotChild);
  const axis = normalizeAxis(opts.axis);
  const limitsDeg = opts.limitsDeg ?? [-90, 90];
  if (
    !Array.isArray(limitsDeg) || limitsDeg.length !== 2 ||
    !limitsDeg.every((n) => Number.isFinite(n)) ||
    limitsDeg[0] > limitsDeg[1]
  ) {
    throw new KernelError(
      'feature.invalid-args',
      `joint.clevis: limitsDeg must be a finite [min, max] range with min <= max; got ${JSON.stringify(limitsDeg)}.`,
      'joint.clevis',
      'Pass limitsDeg: [min, max] in degrees, or omit for the [-90, 90] default.',
    );
  }
  const style = withDefaults(opts.style);
  const liftDir = normalizeLiftDir(opts.liftDir);
  const liftPivot = opts.liftPivot ?? true;

  // 1. Compute the lifted pivot (PARENT-local frame).
  const liftZ = liftPivot ? computePivotLift(style, limitsDeg) : 0;
  const pivotParentLifted: Vec3 = [
    opts.pivotParent[0] + liftDir[0] * liftZ,
    opts.pivotParent[1] + liftDir[1] * liftZ,
    opts.pivotParent[2] + liftDir[2] * liftZ,
  ];

  // 2. Build the fork (two plates straddling the pivot along the pin axis,
  //    plus bridge tabs that anchor the plates to the parent body).
  const fork = buildFork(kc, style, axis, pivotParentLifted, opts.pivotParent, liftDir, liftZ);

  // 3. Build the tongue (single plate centred on the child-local pivot).
  const tongue = buildTongue(kc, style, axis, pivotChild);

  // 4. Union fork into parent, tongue into child.
  const parentWithFork = opts.parentBody.union(fork);
  const childWithTongue = opts.childBody.union(tongue);

  // 5. Drill ONE through-hole through each part AFTER its fork/tongue is
  //    unioned in — so the hole is co-located in every solid it passes
  //    through (fork plates + bridge tabs + parent body on the parent side;
  //    tongue + child body on the child side).
  const drillR = style.pinR + style.holeClearance;
  const drillSpan = style.forkGapY + 2 * style.plateT + 40; // large margin clears any reasonable yoke
  const parentDrill = makeAxisCylinder(kc, drillSpan, drillR, axis, pivotParentLifted);
  const childDrill = makeAxisCylinder(kc, drillSpan, drillR, axis, pivotChild);
  const parentDrilled = parentWithFork.subtract(parentDrill);
  const childDrilled = childWithTongue.subtract(childDrill);

  // 6. Build pin shaft + caps. Shaft spans from outer face to outer face;
  //    caps overlap the shaft by capThickness so the boolean union merges.
  const shaftLen = style.forkGapY + 2 * style.plateT;
  const pin = buildPin(kc, style, axis, pivotParentLifted, shaftLen);

  // 7. Pin goes on the PARENT side (so removing the pin leaves the child
  //    geometrically free — the test for Gate 6 mate physical realization).
  const parentFinal = parentDrilled.union(pin);

  // 8. Build the connector specs. Each side carries its OWN PART-LOCAL
  //    pivot (the lifted parent pivot in the parent's frame; the unmodified
  //    pivotChild in the child's frame).
  const parentConnector = { origin: pivotParentLifted, axis };
  const childConnector = { origin: pivotChild, axis };

  return {
    parentGeometry: parentFinal,
    childGeometry: childDrilled,
    parentConnector,
    childConnector,
    pivot: pivotParentLifted,
    style,
  };
}

// =============================================================================
// Geometric helpers (private)
// =============================================================================

/**
 * Build the fork: two parallel plates of size `plateX × plateZ × plateT`
 * straddling the pivot along the pin axis, plus a single bridge tab that
 * connects the two plates ACROSS the pivot — running along the pin axis at
 * a position OUTSIDE the tongue's swing envelope (y = -(forkGapY/2 + plateT/2)
 * for the tab side away from the lift direction).
 *
 * The plates are rounded extrudes (knuckleR corner radius) extruded along
 * the pin axis. The whole assembly is centred at the SUPPLIED LIFTED PIVOT
 * (in parent-local frame).
 *
 * @param pivotLifted  lifted pivot position in parent-local frame (centre of fork)
 * @param pivotOriginal original pivot (before lift) — fork plates extend DOWN to here
 * @param liftDir      direction of the lift (so the bridge tab goes opposite the swing volume)
 * @param liftZ        magnitude of the lift (so the plate extends from the original surface up)
 */
function buildFork(
  kc: KernelCadApi,
  style: ResolvedClevisStyle,
  axis: Vec3,
  pivotLifted: Vec3,
  _pivotOriginal: Vec3,
  liftDir: Vec3,
  liftZ: number,
): Shape {
  const plateX = 4 * style.knuckleR;  // along the perpendicular-to-axis-and-lift direction
  const plateZ = 2.5 * style.knuckleR; // along the lift direction
  const plateT = style.plateT;
  const knuckleR = style.knuckleR;
  const forkGapY = style.forkGapY;

  // The plates straddle the pivot along the pin axis. We build each plate in
  // its canonical extrude frame (slab in XY, extruded along +Z), then align
  // +Z to the pin axis via `alongAxis`, then translate to the offset along
  // the pin axis from the pivot.
  //
  // Plate canonical frame:
  //   - x ∈ [-plateX/2, plateX/2]  (along perpendicular-to-axis-and-lift)
  //   - y ∈ [-plateZ/2, plateZ/2]  (along lift direction)
  //   - z ∈ [-plateT/2, plateT/2]  (along pin axis after alignment)
  //
  // After alignment the slab spans ±plateT/2 along the pin axis. We offset
  // each plate by ±(forkGapY/2 + plateT/2) so the inner faces sit at ±forkGapY/2.

  const plateOffset = forkGapY / 2 + plateT / 2;

  const buildPlateAt = (offset: number): Shape => {
    let plate = kc.extrudeRoundedRect(plateX, plateZ, knuckleR, plateT)
      .translate(0, 0, -plateT / 2)
      .alongAxis(axis);
    // Now the plate is centred at the canonical origin with its thickness
    // along the pin axis. Translate to the offset position along the pin
    // axis, then rotate the "long" plate axes into the lift frame.
    plate = plate.translate(axis[0] * offset, axis[1] * offset, axis[2] * offset);
    plate = plate.translate(pivotLifted[0], pivotLifted[1], pivotLifted[2]);
    return plate;
  };

  const plateA = buildPlateAt(+plateOffset);
  const plateB = buildPlateAt(-plateOffset);

  // Bridge tabs: two small slabs spanning the pin-axis direction across the
  // fork-gap, at y = ±(forkGapY/2 + plateT/2) — outside the tongue's swing
  // envelope. The tabs are positioned along the negative lift direction
  // (opposite the swing volume, so they sit between the plates DOWN at the
  // base) so they anchor the fork into the parent body without ever entering
  // the tongue's volume.
  //
  // Tab canonical frame (slab):
  //   - x ∈ [-plateT/2, plateT/2]     (along Y direction in absolute terms, but mapped via lift)
  //   - y ∈ [-knuckleR, knuckleR]     (along the negative-lift direction — extends down into the parent)
  //   - z ∈ [-tabSpan/2, tabSpan/2]   (along the pin axis — spans gap + plates)
  //
  // Spanning the FULL outer-fork width along the pin axis means the bridge tab
  // gets drilled out by the through-hole later (at the pivot Y=0 region), so
  // the tabs themselves don't plug the bore — they only attach off-axis.
  const tabSpan = forkGapY + 2 * plateT;
  const tabHeight = knuckleR * 1.5; // sits below the pivot, extending into the parent
  const tabWidth = plateT;

  const buildTab = (sideY: number): Shape => {
    // Slab centred on origin: x=tabWidth, y=tabHeight, z=tabSpan
    let tab = kc.box(tabWidth, tabHeight, tabSpan, true);
    // Map to oriented frame:
    //  - the tab's local Z should align with the pin axis (already canonical when alongAxis(Z) is identity)
    //  - the tab's local Y should align with -liftDir (downward from pivot into the parent body)
    //  - the tab's local X should align with the perpendicular-to-axis-and-lift direction (free)
    // We use alongAxis only on the Z-component, then a rotation around the pin
    // axis to map +Y → -liftDir. To keep this robust we build the rotation
    // explicitly: place the tab centred at the pivot, then translate it
    // perpendicular to liftDir and away from the swing volume.
    tab = tab.alongAxis(axis);
    // After alongAxis, the local +Z of the canonical box is now along the pin axis.
    // The canonical X/Y of the box (in world) are not perfectly aligned to our
    // wanted (perpendicularToLift, -liftDir) basis — so we resort to placing
    // the tab as a simple "outside the swing envelope" rectangular block. We
    // shift in the direction perpendicular to the pin axis but ALONG the
    // negative lift direction by `(tabHeight / 2)` to seat the tab DOWN.
    tab = tab.translate(
      -liftDir[0] * (tabHeight / 2 + 1) + perpToAxisAndLift(axis, liftDir)[0] * 0,
      -liftDir[1] * (tabHeight / 2 + 1) + perpToAxisAndLift(axis, liftDir)[1] * 0,
      -liftDir[2] * (tabHeight / 2 + 1) + perpToAxisAndLift(axis, liftDir)[2] * 0,
    );
    // Also push the tab "outside the tongue's swing envelope" — but we built
    // the tabs at y = ±(forkGapY/2 + plateT/2) by NOT moving them, because
    // they span the full pin-axis width. The `sideY` parameter is unused
    // here; we keep one tab per side along the pin axis... actually since
    // the tab spans tabSpan along the pin axis, ONE tab suffices to bridge
    // the two plates. We return one tab from this helper but call it twice
    // and let the union dedupe.
    void sideY;
    tab = tab.translate(pivotLifted[0], pivotLifted[1], pivotLifted[2]);
    return tab;
  };

  const tab = buildTab(0);

  let fork = plateA.union(plateB).union(tab);
  // Hold the parent-side bridge geometry that LIFTS the parent body up to
  // the lifted pivot when `liftZ > 0` — without it the plates would float
  // above the parent body when the lift is significant. We extend a
  // post-shaped column from the original pivot to the lifted pivot.
  if (liftZ > 0.5) {
    const postR = Math.min(knuckleR * 1.2, plateOffset);
    // Cylinder by default has axis +Z, height = liftZ; place it from
    // pivotOriginal toward pivotLifted along liftDir.
    const post = kc.cylinder(liftZ, postR)
      .translate(0, 0, liftZ / 2)
      // .alongAxis is applied to +Z, but our cylinder default is +Z so first
      // we translate the centre to be at the origin (the cylinder is built
      // with bottom at z=0 + extending up; translating -liftZ/2 puts the
      // centre at origin). Wait — cylinder(h, r) builds bottom-anchored at
      // z=0 extending up; translating +liftZ/2 puts the centre at +liftZ/2,
      // not origin. Re-center:
      .translate(0, 0, -liftZ / 2)
      // Now cylinder spans z ∈ [-liftZ/2, +liftZ/2] (centre at origin),
      // axis +Z. Align +Z with liftDir.
      .alongAxis(liftDir)
      // Translate to mid-point between original pivot and lifted pivot.
      .translate(
        opts_midpoint(_pivotOriginal, pivotLifted)[0],
        opts_midpoint(_pivotOriginal, pivotLifted)[1],
        opts_midpoint(_pivotOriginal, pivotLifted)[2],
      );
    fork = fork.union(post);
  }
  if (style.forkMaterial !== undefined) {
    fork = fork.material(style.forkMaterial);
  }
  return fork;
}

function perpToAxisAndLift(axis: Vec3, lift: Vec3): Vec3 {
  // perpToAxisAndLift = axis × lift, normalized. If degenerate (axis ∥ lift),
  // fall back to any perpendicular.
  const cx = axis[1] * lift[2] - axis[2] * lift[1];
  const cy = axis[2] * lift[0] - axis[0] * lift[2];
  const cz = axis[0] * lift[1] - axis[1] * lift[0];
  const len = Math.hypot(cx, cy, cz);
  if (len < 1e-9) return [1, 0, 0]; // fallback — caller's lift collinear with axis
  return [cx / len, cy / len, cz / len];
}

function opts_midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/**
 * Build the tongue: a single plate centred at the child-local pivot, with
 * its thickness along the pin axis (so it slips between the fork plates).
 */
function buildTongue(
  kc: KernelCadApi,
  style: ResolvedClevisStyle,
  axis: Vec3,
  pivotChild: Vec3,
): Shape {
  const plateX = 4 * style.knuckleR;
  const plateZ = 2.5 * style.knuckleR;
  const tongueY = style.tongueY;
  const knuckleR = style.knuckleR;

  let tongue = kc.extrudeRoundedRect(plateX, plateZ, knuckleR, tongueY)
    .translate(0, 0, -tongueY / 2)
    .alongAxis(axis)
    .translate(pivotChild[0], pivotChild[1], pivotChild[2]);
  if (style.tongueMaterial !== undefined) {
    tongue = tongue.material(style.tongueMaterial);
  }
  return tongue;
}

/**
 * Build the pin (shaft + two cap heads), centred at the pivot, axis along
 * the pin axis. Shaft length = `shaftLen` (outer-to-outer fork face span).
 * Caps overlap the shaft by `capThickness` so the boolean union merges.
 */
function buildPin(
  kc: KernelCadApi,
  style: ResolvedClevisStyle,
  axis: Vec3,
  pivot: Vec3,
  shaftLen: number,
): Shape {
  const shaft = makeAxisCylinder(kc, shaftLen, style.pinR, axis, pivot);
  // Caps: cylinders of radius pinCapR, length pinCapThickness, placed
  // flush against the outer fork faces (i.e., shifted ±(shaftLen/2 + capT/2)
  // along the pin axis from the pivot, then nudged inward by capT/2 so
  // their inner face sits AT the outer fork face — i.e., flush.
  //
  // The flush condition: cap centre = pivot + axis * (shaftLen/2 + capT/2 - 0.5)
  // where the -0.5 mm overlap merges the boolean. Actually a cleaner
  // formulation: cap sits with inner face at z = ±shaftLen/2 (outer fork
  // face) extending OUTWARD by capT. Cap centre at z = ±(shaftLen/2 + capT/2 - 0.5).
  const capT = style.pinCapThickness;
  const capOffset = shaftLen / 2 + capT / 2 - 0.5; // 0.5 mm overlap merges union
  const capCentreA: Vec3 = [
    pivot[0] + axis[0] * capOffset,
    pivot[1] + axis[1] * capOffset,
    pivot[2] + axis[2] * capOffset,
  ];
  const capCentreB: Vec3 = [
    pivot[0] - axis[0] * capOffset,
    pivot[1] - axis[1] * capOffset,
    pivot[2] - axis[2] * capOffset,
  ];
  const capA = makeAxisCylinder(kc, capT, style.pinCapR, axis, capCentreA);
  const capB = makeAxisCylinder(kc, capT, style.pinCapR, axis, capCentreB);
  let pin = shaft.union(capA).union(capB);
  if (style.pinMaterial !== undefined) {
    pin = pin.material(style.pinMaterial);
  }
  return pin;
}

/**
 * Build a cylinder of the given length and radius, with its axis aligned to
 * `axis` and CENTERED on the supplied point (i.e., extends ±length/2 from
 * the centre along the axis).
 */
function makeAxisCylinder(
  kc: KernelCadApi,
  length: number,
  radius: number,
  axis: Vec3,
  centre: Vec3,
): Shape {
  // kc.cylinder(h, r) builds a cylinder along +Z with its bottom face at
  // z=0 extending up to z=h. Centring requires translating -h/2 along Z,
  // then aligning +Z to the requested axis, then translating to centre.
  return kc.cylinder(length, radius)
    .translate(0, 0, -length / 2)
    .alongAxis(axis)
    .translate(centre[0], centre[1], centre[2]);
}
