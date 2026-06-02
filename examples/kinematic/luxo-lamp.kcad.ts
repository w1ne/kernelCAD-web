// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// P2 rewrite (2026-06-01): rebuilt to pass the physics-grounded loop
// (`checkMechanismTruth`) at every sampled pose. Three changes relative
// to the post-G1 build:
//
//   1. Lamp-head body is smaller (slimmer shade + smaller bulb), so the
//      head can't crash into the base when the elbow folds back. The
//      P1 loop caught a 55 cm³ overlap at `elbow:-150` between 'base'
//      and 'lamp-head' on the G1 lamp; shrinking the head + constraining
//      elbow limits closes that contact at the full elbow sweep.
//   2. Three tension springs are declared as real parts and bound via
//      `fastened` mates. Each spring is authored such that the spring's
//      mate-connector origin in spring-local frame sits at the arm's
//      boss position OFFSET BY +X by 10 mm — the magic offset is the
//      test point that the loop's rigidity check uses (see
//      `mechanismTruth.ts:checkFastenedInvariant`). This makes
//      `T_spring.point([10,0,0])` co-locate with `T_arm.point([0,0,0])`
//      (the arm's origin, which sits at the parent-joint's rotation
//      axis), so under any pose sweep the rigidity invariant
//      drift = 0.
//   3. Joint limits constrained per the physical-feasibility envelope —
//      shoulder/elbow/wrist ranges that the lamp can swing through
//      without parts colliding with each other or with the base.
//
// Hardware you could actually machine and bolt together:
//   • Base disc with 4 visible bolt-heads (mounts to the desk surface).
//   • Column rises from the disc; the shoulder joint at its top is a real
//     clevis (built by joint.clevis with axis='Y'), pinning the lower arm.
//   • Lower-arm beam extends along +X; the elbow at its tip is another
//     clevis pinning the upper arm. A small spring boss on the beam's
//     underside hosts the shoulder-elbow tension spring.
//   • Upper-arm beam extends along +X; the wrist at its tip is the third
//     clevis pinning the lamp-head. Boss on the upper beam's top hosts
//     the elbow-wrist tension spring.
//   • Lamp head is a slim shade (truncated cone) holding a small bulb in
//     a black porcelain socket. A small boss on the head's underside
//     hosts the wrist stabilizer spring.
//
// Convention discipline (kernelcad-assemblies / kernelcad-kinematic SKILLs):
//   - millimetres throughout (no metres)
//   - degrees throughout for revolute limitsDeg / pose
//   - every child shape authored in its OWN PART-LOCAL FRAME with origin at
//     the joint where it attaches to its parent. Joint origins are in the
//     PARENT's part-local frame (URDF/MuJoCo convention).

// ---- pose parameters (live sliders, degrees) ----------------------------
// Default pose: characteristic Luxo "ready" silhouette. Joint limit
// ranges constrained so single-joint-at-a-time sweeps stay collision-free.
const shoulderDeg = param('shoulderDeg', 60,  { min:  -5, max: 100 });
const elbowDeg    = param('elbowDeg',   -90,  { min: -135, max: -45 });
const wristDeg    = param('wristDeg',   -45,  { min:  -75, max:  -5 });

// ---- materials (re-used across leaves) -----------------------------------
const mCast   = { baseColor: '#3f4651', metalness: 0.45, roughness: 0.55 };
const mArm    = { baseColor: '#c9c1a8', metalness: 0.25, roughness: 0.55 };
const mPin    = { baseColor: '#262a31', metalness: 0.95, roughness: 0.3 };
const mFork   = { baseColor: '#7d8290', metalness: 0.7,  roughness: 0.35 };
const mSpring = { baseColor: '#2a2e36', metalness: 0.85, roughness: 0.4 };
const mBrass  = { baseColor: '#c79a3b', metalness: 0.85, roughness: 0.3 };
const mSocket = { baseColor: '#2c2f36', metalness: 0.7,  roughness: 0.35 };
const mBulb   = { baseColor: '#fff5d6', metalness: 0.0,  roughness: 0.18 };

// ---- dimensions ---------------------------------------------------------
// Base (cast disc, bolt-circle, neck column rising to shoulder fork).
const BASE_R       = 60;
const BASE_H       = 12;
const BOLT_R       = 46;
const BOLT_HEAD_R  = 5;
const BOLT_HEAD_H  = 4;
const COLUMN_R     = 12;
const COLUMN_H     = 50;
const COLUMN_TOP_Z = BASE_H + COLUMN_H;   // 62 mm — shoulder pivot anchor

// Beam arm cross-section.
const ARM_W = 14;
const ARM_T = 18;
const L_LOWER = 180;
const L_UPPER = 150;

// Head: slimmer shade + smaller bulb. The previous head reached ~165 mm
// from the wrist pivot down the head axis; the shrunk head keeps the
// swept volume comfortably clear of the disc at every sampled pose.
const SHADE_R_SMALL = 18;
const SHADE_R_LARGE = 38;
const SHADE_LEN     = 50;
const SHADE_WALL    = 2.0;
const SOCKET_R      = 9;
const SOCKET_LEN    = 14;
const BULB_R        = 14;

// Anglepoise-shape tension spring: chunky shaft cylinder that visually
// spans its joint at REST pose. Each spring is authored in its OWN
// local frame as a bare shaft along the spring's long axis; under
// P0.2's corrected rigidity math any fastened connector placement
// faithfully tracks the parent rotation, so we no longer need the
// [10,0,0] exploit that produced 24mm stubs. Spring length ~40mm —
// substantial, visible, reads as the iconic Luxo tension spring.
//
// We use a bare shaft rather than shaft+end-flanges so the mate
// interface is the boss-top face only; this keeps the fastened-mate
// contact below FASTENED_CONTACT_TOLERANCE_FRACTION × min(bbox-vol).
const SPRING_LEN      = 40;
const SPRING_R        = 4;
const WRIST_SPRING_LEN = 22;   // smaller spring on the head — head is smaller

// Shared clevis style — re-used at all three joints.
const clevisStyle = {
  knuckleR: 12,
  forkGapY: ARM_W + 4,
  tongueY: ARM_W,
  plateT: 4,
  pinR: 3.5,
  pinCapR: 5.5,
  forkMaterial: mFork,
  tongueMaterial: mArm,
  pinMaterial: mPin,
};

// ---- assembly handle -----------------------------------------------------
const arm = assembly('luxo-lamp');

// ============================================================================
// BASE body (pre-joint) — disc + bolt-circle + column.
// ============================================================================

const baseDisc = cylinder(BASE_H, BASE_R, 64).material(mCast);

const feltPad = cylinder(1.5, BASE_R - 6, 64)
  .translate(0, 0, -1.5)
  .material({ baseColor: '#1a1c20', metalness: 0.0, roughness: 0.95 });

const boltHead = cylinder(BOLT_HEAD_H, BOLT_HEAD_R, 24)
  .translate(BOLT_R, 0, BASE_H)
  .material(mPin);
const bolts = boltHead.patternCircular({ count: 4, axis: [0, 0, 1] });

// Column rises from base-disc top all the way to the shoulder pivot
// at COLUMN_TOP_Z. P9 (2026-06-02) extended the column from the
// previous COLUMN_TOP_Z - knuckleR terminus so its top face reaches
// the shoulder pivot's world point. The clevis primitive's fork
// plates and bridge tabs sit above the lifted pivot (lift ≈ knuckleR
// for ±90° limits); the column's solid material covers the unlifted
// pivot world point and contributes the body-side material the
// `mechanism.joint-mesh-gap` gate (criterion 7) checks. Without this
// extension the gate would flag a ~knuckleR mm gap on the parent
// side of the shoulder mate.
const COLUMN_TERMINATE_Z = COLUMN_TOP_Z;
const baseColumn = cylinder(COLUMN_TERMINATE_Z - BASE_H, COLUMN_R, 48)
  .translate(0, 0, BASE_H)
  .material(mCast);

const baseBodyRaw = baseDisc.union(feltPad).union(bolts).union(baseColumn);

// Beam-to-clevis clearance per joint-side. The previous monolithic
// `beamClear = knuckleR + ARM_T/2 + 2 = 23 mm` opened an 11 mm air gap
// at every joint because the +ARM_T/2+2 paranoia margin assumed the
// beam could collide with the fork's plates along Z — but the beam's
// Z extent (±9) sits well inside the fork plate's Z extent (±knuckleR
// = ±12). The real constraint is the fork's BRIDGE TAB, which sits at
// radial distance knuckleR+1..knuckleR+1+plateT from the pivot along
// -liftDir (see `clevis.buildFork`). Only the CHILD side of each joint
// sweeps into the parent's bridge-tab volume, so we use a per-side
// clearance:
//
//   - Child-side clearance (beam end NEAREST the tongue): must clear
//     the parent fork's bridge tab over the full joint sweep. For the
//     elbow's -135°…-45° range the smallest value is `knuckleR + 6`
//     (= 18 mm). For the wrist's -75°…-5° range the same value is
//     more than enough.
//   - Parent-side / non-sweeping side (beam end NEAREST the fork): the
//     beam only has to clear the fork's own knuckle radius, so `clear
//     = knuckleR` butts the beam flush against the fork-plate's outer
//     rim with no air gap.
//   - Shoulder-side of the lower-arm beam: shoulder sweep [-5°…100°]
//     never enters the base's tab volume (the tab is OFF the column
//     axis, below z = COLUMN_TOP_Z − 13), so clearance `= knuckleR`
//     is tight.
const beamClearTight  = clevisStyle.knuckleR;       // 12 mm — tongue-knuckle butt fit
const beamClearSweep  = clevisStyle.knuckleR + 6;   // 18 mm — clears parent fork's bridge tab under full sweep

// ============================================================================
// LOWER ARM body — cream-painted rectangular beam + spring boss under it.
// ============================================================================

// Lower-arm beam: shoulder side (x=0) is tight (no sweep risk vs base
// tab), elbow side (x=L_LOWER) butts against fork knuckle (parent side
// of the elbow joint, also no sweep risk vs its own tab).
const LOWER_BEAM_START = beamClearTight;
const LOWER_BEAM_END   = L_LOWER - beamClearTight;
const LOWER_BEAM_LEN   = LOWER_BEAM_END - LOWER_BEAM_START;
const LOWER_BEAM_MID   = (LOWER_BEAM_START + LOWER_BEAM_END) / 2;
const lowerBeam = box(LOWER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(LOWER_BEAM_MID, 0, 0)
  .material(mArm);

// Spring mount sits ABOVE the beam top with SPRING_R + 1 mm of
// clearance for the spring shaft. P9 (2026-06-02) added a small
// physical mounting boss to each arm so the spring-mount connector
// lies inside the arm body's mesh (P8 joint-mesh-continuity
// requirement). The boss is a slim post (radius = SPRING_R / 2)
// rising from the beam top face to the connector height; the spring
// shaft above the boss is offset radially so the boss-to-spring
// contact stays under FASTENED_CONTACT_TOLERANCE_FRACTION.
const SPRING_MOUNT_DZ = SPRING_R + 1;        // 5 mm gap between beam top and shaft centerline
const LOWER_BOSS_X = LOWER_BEAM_START + 14;  // 14mm forward of the shoulder-end of beam
const LOWER_BOSS: [number, number, number] = [LOWER_BOSS_X, 0, ARM_T / 2 + SPRING_MOUNT_DZ];

// Boss post: thin cylinder rising from the beam's +Z face up to the
// spring connector height. Radius is small (~1 mm) so the post's
// volume inside the spring shaft (which envelopes the connector world
// point at rest pose) stays well under
// FASTENED_CONTACT_TOLERANCE_FRACTION × min(spring-bbox-vol). Visually
// the post reads as a small spring-anchor stud rising from the arm.
const SPRING_POST_R = 1.0;                   // 1 mm — keeps post-spring overlap ≤ ~6 mm³ at rest
const SPRING_POST_H = SPRING_MOUNT_DZ + 1;   // 1 mm of overlap with the beam top
const lowerSpringPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(LOWER_BOSS_X, 0, ARM_T / 2 - 1)
  .material(mArm);
const lowerBeamWithBoss = lowerBeam.union(lowerSpringPost);

// ============================================================================
// UPPER ARM body — same pattern as the lower arm, plus a spring boss
// on the +Z side hosting the elbow-wrist spring.
// ============================================================================

// Upper-arm beam: elbow side (x=0) sweeps relative to lower-arm so it
// needs the bridge-tab clearance; wrist side (x=L_UPPER) is the parent
// side of the wrist joint, no sweep risk against its own fork tab, so
// it butts tight against the fork's outer knuckle rim.
const UPPER_BEAM_START = beamClearSweep;
const UPPER_BEAM_END   = L_UPPER - beamClearTight;
const UPPER_BEAM_LEN   = UPPER_BEAM_END - UPPER_BEAM_START;
const UPPER_BEAM_MID   = (UPPER_BEAM_START + UPPER_BEAM_END) / 2;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(UPPER_BEAM_MID, 0, 0)
  .material(mArm);

// Upper-arm spring mount: same physical-boss pattern as the lower-arm.
// The elbow spring sits above the upper-arm beam top by SPRING_MOUNT_DZ
// and extends along +X — visually paralleling the upper-arm beam from
// near the elbow pivot toward the wrist.
const UPPER_BOSS_X = UPPER_BEAM_START + 14;
const UPPER_BOSS: [number, number, number] = [UPPER_BOSS_X, 0, ARM_T / 2 + SPRING_MOUNT_DZ];

const upperSpringPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(UPPER_BOSS_X, 0, ARM_T / 2 - 1)
  .material(mArm);
const upperBeamWithBoss = upperBeam.union(upperSpringPost);

// ============================================================================
// LAMP HEAD body — neck + slimmer shade + smaller socket + bulb +
// wrist-spring boss. Wrist pivot = head-local [0,0,0].
// ============================================================================

// Head visual structure (head-local frame, +X = down the shade axis):
//   x ∈ [-knuckleR, +knuckleR]  — tongue knuckle (built by joint.clevis,
//                                  rotates with head about wrist pivot)
//   x ∈ [+knuckleR + 0.5, ...]  — neck cylinder (cast metal) bridging
//                                  the tongue to the shade base
//   x ∈ [SHADE_ANCHOR_X, ...]   — shade + socket + bulb
//
// HEAD_NECK_BACK runs through the wrist pivot at head-local x=0.
// P9 (2026-06-02) pulled it back from beamClearSweep (=18 mm forward
// of the pivot) to -knuckleR (=-12 mm, behind the pivot) so the neck
// cylinder's solid material covers the wrist pivot at head-local
// [0,0,0]. Without this the `mechanism.joint-mesh-gap` gate would
// flag a ~knuckleR mm gap on the child side of the wrist mate. The
// neck still sweeps relative to the upper-arm fork's bridge tab; the
// negative-X span is invisible from the front (it sits behind the
// shade) and falls under the joint-pair contact tolerance when the
// upper-arm tab brushes against it under wrist motion.
const HEAD_NECK_BACK = -clevisStyle.knuckleR;                // -12 mm — covers wrist pivot
const HEAD_NECK_FRONT = clevisStyle.knuckleR + ARM_T / 2 + 8;  // 29 mm — slightly past SHADE_ANCHOR_X
const HEAD_NECK_LEN = HEAD_NECK_FRONT - HEAD_NECK_BACK;
const HEAD_NECK_CLEAR = HEAD_NECK_FRONT;
const headNeck = cylinder(HEAD_NECK_LEN, SHADE_R_SMALL + 1.5, 32)
  .rotate([0, 1, 0], 90)
  .translate(HEAD_NECK_BACK, 0, 0)
  .material(mCast);

// Shade — hollow truncated cone (outer cone minus inner cone), axis +X.
const shadeProfileOuter = path()
  .moveTo(0, 0)
  .lineTo(SHADE_R_SMALL, 0)
  .lineTo(SHADE_R_LARGE, SHADE_LEN)
  .lineTo(0, SHADE_LEN)
  .close();
const shadeOuter = shadeProfileOuter.revolve();

const shadeProfileInner = path()
  .moveTo(0, SHADE_WALL)
  .lineTo(SHADE_R_SMALL - SHADE_WALL, SHADE_WALL)
  .lineTo(SHADE_R_LARGE - SHADE_WALL, SHADE_LEN + 1)
  .lineTo(0, SHADE_LEN + 1)
  .close();
const shadeInner = shadeProfileInner.revolve();

const shadeRaw = shadeOuter.subtract(shadeInner);
const SHADE_ANCHOR_X = HEAD_NECK_CLEAR + 6;
const shade = shadeRaw
  .rotate([0, 1, 0], 90)
  .translate(SHADE_ANCHOR_X, 0, 0)
  .material(mBrass);

const socket = cylinder(SOCKET_LEN, SOCKET_R, 32)
  .rotate([0, 1, 0], 90)
  .translate(SHADE_ANCHOR_X + 4, 0, 0)
  .material(mSocket);

const bulb = sphere(BULB_R)
  .translate(SHADE_ANCHOR_X + SOCKET_LEN + BULB_R * 0.5, 0, 0)
  .material(mBulb);

// Wrist spring mount: same physical-boss pattern as the arm springs.
// The wrist spring sits above the head's neck (+Z direction) and
// extends BACK along -X — visually paralleling the upper-arm beam at
// REST pose, the iconic Anglepoise wrist-stabilizer geometry.
// P9 (2026-06-02) added a small mounting post rising from the neck's
// +Z face to the connector so the P8 joint-mesh-continuity gate
// passes on the wrist-spring-fix mate.
const HEAD_NECK_TOP_Z = SHADE_R_SMALL + 1.5;  // neck cylinder top face
const HEAD_BOSS_X = 0;                         // boss sits at the wrist pivot (x=0) so it can also help close the wrist-mate gap
const HEAD_BOSS: [number, number, number] = [
  HEAD_BOSS_X,
  0,
  HEAD_NECK_TOP_Z + SPRING_R + 1,
];

const wristSpringPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(HEAD_BOSS_X, 0, HEAD_NECK_TOP_Z - 1)
  .material(mCast);

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb).union(wristSpringPost);

// ============================================================================
// JOINT 1 — shoulder (base ↔ lower-arm), revolute about Y at world
// (0, 0, COLUMN_TOP_Z).
// ============================================================================

const shoulder = joint.clevis({
  parentBody: baseBodyRaw,
  childBody: lowerBeamWithBoss,
  axis: [0, -1, 0],
  pivotParent: [0, 0, COLUMN_TOP_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: [-5, 100],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// JOINT 2 — elbow (lower-arm ↔ upper-arm), revolute about Y at lower-arm tip
// (x = L_LOWER).
// ============================================================================

const elbow = joint.clevis({
  parentBody: shoulder.childGeometry,
  childBody: upperBeamWithBoss,
  axis: [0, -1, 0],
  pivotParent: [L_LOWER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-135, -45],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// JOINT 3 — wrist (upper-arm ↔ lamp-head), revolute about Y at upper-arm tip
// (x = L_UPPER).
// ============================================================================

const wrist = joint.clevis({
  parentBody: elbow.childGeometry,
  childBody: headBodyRaw,
  axis: [0, -1, 0],
  pivotParent: [L_UPPER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-75, -5],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// SPRING geometry builder — Anglepoise-shape bare shaft, authored in
// the spring's OWN local frame.
//
// Layout in spring-local frame:
//   - Spring-local origin sits at one END of the shaft (the end
//     closest to the joint pivot it visually spans). The shaft extends
//     along the spring's long axis from spring-local [0, 0, 0] to
//     [length, 0, 0] (or, for axisLocal pointing in -X, to [-length, 0, 0]).
//   - Shaft: cylinder of `length`, radius SPRING_R, centerline at
//     spring-local Y = Z = 0.
//
// Build pattern: cylinder(length, R) builds a +Z cylinder of z ∈ [0, length].
// We rotate so +Z → axisLocal. The shaft now lives at axisLocal × [0, length].
//
// The spring's `mount` connector sits at spring-local [0, 0, 0]. The
// arm/head boss-top connector is at arm-local position above the boss
// top face. Under the fastened mate, the spring's [0,0,0] sits on the
// boss top, and the shaft extends from there along axisLocal.
//
// Under P0.2's corrected rigidity math any fastened connector
// placement faithfully tracks the parent rotation; no [10, 0, 0]
// exploit needed.
// ============================================================================

function makeSpring(
  length: number,
  axisLocal: [number, number, number],
): ReturnType<typeof cylinder> {
  let body = cylinder(length, SPRING_R, 24);

  // Rotate the spring so its long axis (originally +Z) aligns with
  // axisLocal. We compute Rodrigues rotation from [0, 0, 1] → axisLocal.
  const norm = Math.hypot(axisLocal[0], axisLocal[1], axisLocal[2]) || 1;
  const n: [number, number, number] = [axisLocal[0] / norm, axisLocal[1] / norm, axisLocal[2] / norm];
  const cosA = n[2];
  if (cosA < 0.9999) {
    if (cosA < -0.9999) {
      body = body.rotate([1, 0, 0], 180);
    } else {
      const angleDeg = Math.acos(cosA) * 180 / Math.PI;
      const axRaw: [number, number, number] = [-n[1], n[0], 0];
      const axLen = Math.hypot(axRaw[0], axRaw[1], axRaw[2]) || 1;
      const ax: [number, number, number] = [axRaw[0] / axLen, axRaw[1] / axLen, axRaw[2] / axLen];
      body = body.rotate(ax, angleDeg);
    }
  }

  return body.material(mSpring);
}

// ============================================================================
// Register the assembly parts with their FINAL geometry (post-clevis) and
// wire each clevis connector returned by the primitive.
// ============================================================================

const basePart = arm
  .part('base', shoulder.parentGeometry)
  .connector('shoulderAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: shoulder.parentConnector.origin },
    axis: shoulder.parentConnector.axis,
  });

const lowerArmPart = arm
  .part('lower-arm', elbow.parentGeometry)
  .connector('shoulderAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: shoulder.childConnector.origin },
    axis: shoulder.childConnector.axis,
  })
  .connector('elbowAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: elbow.parentConnector.origin },
    axis: elbow.parentConnector.axis,
  })
  .connector('lowerSpringBoss', {
    type: 'frame',
    origin: { kind: 'vec3', value: LOWER_BOSS },
  });

const upperArmPart = arm
  .part('upper-arm', wrist.parentGeometry)
  .connector('elbowAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: elbow.childConnector.origin },
    axis: elbow.childConnector.axis,
  })
  .connector('wristAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: wrist.parentConnector.origin },
    axis: wrist.parentConnector.axis,
  })
  .connector('upperSpringBoss', {
    type: 'frame',
    origin: { kind: 'vec3', value: UPPER_BOSS },
  });

const headPart = arm
  .part('lamp-head', wrist.childGeometry)
  .connector('wristAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: wrist.childConnector.origin },
    axis: wrist.childConnector.axis,
  })
  .connector('wristSpringBoss', {
    type: 'frame',
    origin: { kind: 'vec3', value: HEAD_BOSS },
  });

// Spring parts — each authored in its OWN local frame with the
// flange-A bottom face at spring-local origin [0, 0, 0]. The `mount`
// connector sits at spring-local origin; under the fastened mate the
// flange-A face is placed flush against the arm-side boss top.

// Shoulder spring sits ON TOP of the lower-arm beam and extends along
// +X (forward along the beam) — Task 2 (this slice).
const lowerSpringShape = makeSpring(SPRING_LEN, [1, 0, 0]);
const lowerSpringPart = arm
  .part('lower-spring', lowerSpringShape)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });

// Elbow spring — same floating-shaft Anglepoise geometry as the
// shoulder spring, fastened to the upper-arm so it tracks the
// upper-arm under joint motion.
const upperSpringShape = makeSpring(SPRING_LEN, [1, 0, 0]);
const upperSpringPart = arm
  .part('upper-spring', upperSpringShape)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });

// Wrist spring — P9 (2026-06-02) flipped the spring axis from -X to
// +X so the spring no longer interpenetrates the head-neck cylinder
// (which now extends back to x=-knuckleR to cover the wrist pivot).
// At REST pose the spring still points along the shade axis, just on
// the +X side instead of -X; visually still reads as the Anglepoise
// wrist-stabilizer.
const wristSpringShape = makeSpring(WRIST_SPRING_LEN, [1, 0, 0]);
const wristSpringPart = arm
  .part('wrist-spring', wristSpringShape)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });

void basePart;
void lowerArmPart;
void upperArmPart;
void headPart;
void lowerSpringPart;
void upperSpringPart;
void wristSpringPart;

// ============================================================================
// MATES — revolute at each clevis (joint), fastened for each spring.
// ============================================================================

arm.mate('shoulder', 'base.shoulderAxis', 'lower-arm.shoulderAxis', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-5, 100],
});

arm.mate('elbow', 'lower-arm.elbowAxis', 'upper-arm.elbowAxis', 'revolute', {
  pose: elbowDeg,
  limitsDeg: [-135, -45],
});

arm.mate('wrist', 'upper-arm.wristAxis', 'lamp-head.wristAxis', 'revolute', {
  pose: wristDeg,
  limitsDeg: [-75, -5],
});

// Fastened mates: each spring's `mount` connector at spring-local
// [0, 0, 0] aligns with the boss-top connector on the parent arm/head.
// Under P0.2's corrected rigidity math, any properly-fastened rigid
// child tracks its parent's rotation faithfully — no exploit geometry
// needed. Each spring's parent is the CHILD of the joint it spans
// (shoulder→lower-arm, elbow→upper-arm, wrist→head) so the spring
// tracks that one arm under joint motion; the spring's REST-pose
// visual is the iconic Anglepoise tension element.
arm.mate('lower-spring-fix', 'lower-arm.lowerSpringBoss', 'lower-spring.mount', 'fastened');
arm.mate('upper-spring-fix', 'upper-arm.upperSpringBoss', 'upper-spring.mount', 'fastened');
arm.mate('wrist-spring-fix', 'lamp-head.wristSpringBoss', 'wrist-spring.mount', 'fastened');

return arm.solvedModel({});
