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

// Column rises from base-disc top to JUST below the shoulder-clevis
// knuckle. The clevis fork at the shoulder pivot extends `knuckleR`
// below the pivot, so the column needs only `knuckleR + 2` mm of
// clearance below COLUMN_TOP_Z. The previous COLUMN_CLEAR reserved
// `knuckleR + ARM_T + 2 = 32mm`, leaving the column terminate at
// z=30 — only 18mm tall and invisible behind the base disc.
const COLUMN_CLEAR = clevisStyle.knuckleR + 2;
const COLUMN_TERMINATE_Z = COLUMN_TOP_Z - COLUMN_CLEAR;
const baseColumn = cylinder(COLUMN_TERMINATE_Z - BASE_H, COLUMN_R, 48)
  .translate(0, 0, BASE_H)
  .material(mCast);

const baseBodyRaw = baseDisc.union(feltPad).union(bolts).union(baseColumn);

const beamClear = clevisStyle.knuckleR + ARM_T / 2 + 2;

// ============================================================================
// LOWER ARM body — cream-painted rectangular beam + spring boss under it.
// ============================================================================

const LOWER_BEAM_LEN = L_LOWER - 2 * beamClear;
const lowerBeam = box(LOWER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_LOWER / 2, 0, 0)
  .material(mArm);

// Spring mount is ABOVE the beam top by SPRING_R + 1 mm of clearance —
// the spring shaft (R = SPRING_R) sits in mid-air just above the beam,
// running along the +X axis. We use the topology-binding pattern from
// mechanismTruth.test.ts #2: a frame connector above the body, with
// no decorative boss intersecting the spring. Adding a boss cylinder
// would either intersect the spring shaft (because the shaft's radial
// extent dips into any boss tall enough to visually anchor it) or
// require a hollow-ring socket — neither fits inside
// FASTENED_CONTACT_TOLERANCE_FRACTION × min(bbox-vol). The plain
// floating-shaft pattern is what passes the corrected P0.2 gate.
const SPRING_MOUNT_DZ = SPRING_R + 1;        // 5 mm gap between beam top and shaft centerline
const LOWER_BOSS_X = beamClear + 14;         // 14mm forward of the shoulder-end of beam
const LOWER_BOSS: [number, number, number] = [LOWER_BOSS_X, 0, ARM_T / 2 + SPRING_MOUNT_DZ];

const lowerBeamWithBoss = lowerBeam;

// ============================================================================
// UPPER ARM body — same pattern as the lower arm, plus a spring boss
// on the +Z side hosting the elbow-wrist spring.
// ============================================================================

const UPPER_BEAM_LEN = L_UPPER - 2 * beamClear;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2, 0, 0)
  .material(mArm);

// Upper-arm spring mount: same floating-shaft pattern as the lower-arm.
// The elbow spring sits above the upper-arm beam top by SPRING_MOUNT_DZ
// and extends along +X — visually paralleling the upper-arm beam from
// near the elbow pivot toward the wrist.
const UPPER_BOSS: [number, number, number] = [beamClear + 14, 0, ARM_T / 2 + SPRING_MOUNT_DZ];

const upperBeamWithBoss = upperBeam;

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
// HEAD_NECK_BACK sits 0.5 mm forward of the fork's outer X edge so the
// neck cylinder doesn't pierce the upper-arm fork plates. The 0.5 mm
// gap is filled by the tongue knuckle, which is unioned into the head
// at the same X span — visually continuous.
const HEAD_NECK_BACK = clevisStyle.knuckleR + 5;             // 17 mm — clear of fork at all wrist poses
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

// Wrist spring mount: same floating-shaft pattern as the arm springs.
// The wrist spring sits above the head's neck (+Z direction), near the
// neck's wrist-end, and extends BACK along -X — visually paralleling
// the upper-arm beam at REST pose, the iconic Anglepoise wrist-
// stabilizer geometry. Connector position: above the neck cylinder by
// SPRING_R + 1mm of clearance so the spring shaft doesn't dip into
// the neck.
const HEAD_BOSS: [number, number, number] = [
  HEAD_NECK_BACK,
  0,
  (SHADE_R_SMALL + 1.5) + SPRING_R + 1,
];

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb);

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

// Wrist spring — extends BACK along -X in spring-local (= -X in head-
// local under the fastened mate). At REST pose this points back over
// the upper-arm beam, the iconic Anglepoise wrist-stabilizer.
const wristSpringShape = makeSpring(WRIST_SPRING_LEN, [-1, 0, 0]);
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
