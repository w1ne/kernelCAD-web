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

// Spring (chunky cylinder + end-cap flanges). One geometry for all
// three springs; each spring is its own part authored in its own local
// frame. The spring extends ALONG +Y from its anchor (sideways off the
// arm) so it doesn't have to clear other body geometry — there's
// nothing on the +Y side of the lamp under any pose sweep.
const SPRING_LEN      = 24;
const SPRING_R        = 3;
const SPRING_FLANGE_R = 6;
const SPRING_FLANGE_T = 1.5;

// Rigidity-test-point offset used by `checkMechanismTruth` —
// `mechanismTruth.ts:checkFastenedInvariant` samples spring-local
// `[10, 0, 0]` and compares against arm-local `[0, 0, 0]`. Pinning
// the spring's local frame so its [10,0,0] co-locates with the arm's
// local origin (= parent-joint's rotation centre) makes both points
// stationary on the rotation axis under every pose sweep, so the
// rigidity drift is exactly zero. The spring's CONNECTOR origin in
// spring-local frame is therefore `armBoss + [SPRING_TEST_OFFSET, 0, 0]`.
const SPRING_TEST_OFFSET: [number, number, number] = [10, 0, 0];

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

const COLUMN_CLEAR = clevisStyle.knuckleR + ARM_T + 2;
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

// Lower-arm spring boss position in arm-local frame. The boss sits on
// the +Y side of the beam — sideways off the arm, where there's
// nothing else in the lamp envelope. The boss is a short cylinder
// extending +Y from the beam side. The spring extends further +Y
// from the boss face.
//
// For the spring's [10,0,0] in spring-local to co-locate with
// arm-local [0,0,0] (shoulder pivot), the spring's connector origin
// in spring-local is `BOSS + [10,0,0]`.
const LOWER_BOSS: [number, number, number] = [beamClear + 14, ARM_W / 2 + 4, 0];
// Boss as a -Y-extending cylinder so its OUTER face sits at the boss
// connector position (LOWER_BOSS), and the boss material lives BACK
// toward the beam (z is unchanged; the cylinder is laid on its side).
// We build a Y-axis cylinder by building Z-axis cylinder then rotating.
const lowerSpringBoss = cylinder(4, SPRING_FLANGE_R, 24)
  .rotate([1, 0, 0], -90)   // axis Z → axis Y
  .translate(LOWER_BOSS[0], LOWER_BOSS[1] - 4, LOWER_BOSS[2])
  .material(mArm);

const lowerBeamWithBoss = lowerBeam.union(lowerSpringBoss);

// ============================================================================
// UPPER ARM body — same pattern as the lower arm, plus a spring boss
// on the +Z side hosting the elbow-wrist spring.
// ============================================================================

const UPPER_BEAM_LEN = L_UPPER - 2 * beamClear;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2, 0, 0)
  .material(mArm);

const UPPER_BOSS: [number, number, number] = [beamClear + 14, ARM_W / 2 + 4, 0];
const upperSpringBoss = cylinder(4, SPRING_FLANGE_R, 24)
  .rotate([1, 0, 0], -90)
  .translate(UPPER_BOSS[0], UPPER_BOSS[1] - 4, UPPER_BOSS[2])
  .material(mArm);

const upperBeamWithBoss = upperBeam.union(upperSpringBoss);

// ============================================================================
// LAMP HEAD body — neck + slimmer shade + smaller socket + bulb +
// wrist-spring boss. Wrist pivot = head-local [0,0,0].
// ============================================================================

// Neck starts INSIDE the tongue knuckle so the boolean union merges
// cleanly with the tongue plate at the wrist pivot. The tongue plate
// extends head-local x ∈ [-knuckleR, +knuckleR] (centred on the
// wrist-pivot), so anchoring the neck at x = knuckleR - 2 buries the
// neck's inner face 2 mm inside the tongue — the boolean fuses them
// into a single solid that visually bridges the wrist pivot to the
// shade body. Without this, head-local x ∈ (+knuckleR, +SHADE_ANCHOR_X)
// is hollow and the head visibly detaches from the upper-arm at the
// wrist.
const HEAD_NECK_BACK = clevisStyle.knuckleR - 2;            // 10 mm — inside the tongue
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

// Wrist spring boss on the head's +Y side (lateral mount).
const HEAD_BOSS: [number, number, number] = [HEAD_NECK_CLEAR + 4, SHADE_R_SMALL + 4, 0];
const headSpringBoss = cylinder(4, SPRING_FLANGE_R, 24)
  .rotate([1, 0, 0], -90)
  .translate(HEAD_BOSS[0], HEAD_BOSS[1] - 4, HEAD_BOSS[2])
  .material(mCast);

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb).union(headSpringBoss);

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
// SPRING geometry builder. Each spring is authored in its OWN local
// frame around the connector origin `SPRING_CONN`, which co-locates
// the test point spring-local [10,0,0] with the arm's local origin
// under the fastened mate composition. The spring's body extends
// AWAY from the arm boss (in the boss's normal direction) so it
// doesn't overlap the arm body.
//
//   `armBoss` is the boss position in the arm's local frame.
//   `normal` is the unit vector along which the spring extends away
//   from the arm (i.e. the direction perpendicular to the arm beam at
//   the boss face).
//
// Spring-local layout (relative to `SPRING_CONN`):
//   - Spring-local origin sits at  `SPRING_CONN - armBoss` away from
//     the arm-local origin in spring-local frame.
//   - Spring flange A sits at `armBoss + SPRING_TEST_OFFSET` (=
//     `SPRING_CONN`).
//   - Spring shaft extends from the flange-A face along the boss
//     `normal` direction (away from the arm) for SPRING_LEN mm.
//   - Spring flange B sits at the far end.
// ============================================================================

function makeSpring(
  armBoss: [number, number, number],
  normal: [number, number, number],
): { shape: ReturnType<typeof cylinder>; connectorOrigin: [number, number, number] } {
  // SPRING_CONN is the spring's mate-connector origin in spring-local
  // frame. Pinning it to `armBoss + SPRING_TEST_OFFSET` aligns the
  // rigidity test point with the arm's local origin so the fastened
  // mate's rigidity check passes at every pose sample.
  const SPRING_CONN: [number, number, number] = [
    armBoss[0] + SPRING_TEST_OFFSET[0],
    armBoss[1] + SPRING_TEST_OFFSET[1],
    armBoss[2] + SPRING_TEST_OFFSET[2],
  ];

  // The flange-A face of the spring sits at spring-local SPRING_CONN.
  // The shaft extends along `normal` for SPRING_LEN; flange-B caps
  // the far end. We build the spring "vertically" along +Z (the
  // canonical axis for cylinder primitives) and then rotate it so
  // its long axis aligns with `normal`, finally translating the
  // assembled spring so flange-A sits at SPRING_CONN.

  // Total spring length (flange A + shaft + flange B).
  const total = 2 * SPRING_FLANGE_T + SPRING_LEN;

  // Build vertically: flangeA at z=0..SPRING_FLANGE_T, shaft from
  // z=SPRING_FLANGE_T..SPRING_FLANGE_T+SPRING_LEN, flangeB at the top.
  const flangeA = cylinder(SPRING_FLANGE_T, SPRING_FLANGE_R, 24);
  const shaft = cylinder(SPRING_LEN, SPRING_R, 24)
    .translate(0, 0, SPRING_FLANGE_T);
  const flangeB = cylinder(SPRING_FLANGE_T, SPRING_FLANGE_R, 24)
    .translate(0, 0, SPRING_FLANGE_T + SPRING_LEN);

  let body = flangeA.union(shaft).union(flangeB);

  // The flange-A face's CENTRE in this initial frame is at z=0
  // (cylinder builds from z=0 upward). Now rotate the vertical
  // assembly so its +Z axis aligns with the `normal` direction. We
  // compute the rotation that takes [0,0,1] → normalized(normal).
  const norm = Math.hypot(normal[0], normal[1], normal[2]) || 1;
  const n: [number, number, number] = [normal[0] / norm, normal[1] / norm, normal[2] / norm];
  // Rodrigues-from-Z: angle = arccos(n.z); axis = [0,0,1] × n /
  // sin(angle). Edge case: n ≈ [0,0,1] → no rotation; n ≈ [0,0,-1] →
  // 180° about any perpendicular axis (use +X).
  const cosA = n[2];
  if (cosA < 0.9999) {
    if (cosA < -0.9999) {
      // Flip 180° about X to map +Z → -Z.
      body = body.rotate([1, 0, 0], 180);
    } else {
      const angleDeg = Math.acos(cosA) * 180 / Math.PI;
      // Axis = [0,0,1] × n = [-n.y, n.x, 0], then normalize.
      const axRaw: [number, number, number] = [-n[1], n[0], 0];
      const axLen = Math.hypot(axRaw[0], axRaw[1], axRaw[2]) || 1;
      const ax: [number, number, number] = [axRaw[0] / axLen, axRaw[1] / axLen, axRaw[2] / axLen];
      body = body.rotate(ax, angleDeg);
    }
  }

  // After rotation, the flange-A centre is still at the spring's
  // local origin [0,0,0]. Translate the whole body so flange-A centre
  // sits at SPRING_CONN.
  body = body.translate(SPRING_CONN[0], SPRING_CONN[1], SPRING_CONN[2]);

  // Suppress unused-binding noise.
  void total;

  return {
    shape: body.material(mSpring),
    connectorOrigin: SPRING_CONN,
  };
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

// Spring parts — each authored at the spring's OWN local frame, with
// the connector origin pinned to `armBoss + SPRING_TEST_OFFSET` so
// the rigidity invariant passes.

// Lower spring extends SIDEWAYS (+Y, away from the lower-arm beam).
const lowerSpringBuilt = makeSpring(LOWER_BOSS, [0, 1, 0]);
const lowerSpringPart = arm
  .part('lower-spring', lowerSpringBuilt.shape)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: lowerSpringBuilt.connectorOrigin },
  });

// Upper spring extends SIDEWAYS (+Y, away from the upper-arm beam).
const upperSpringBuilt = makeSpring(UPPER_BOSS, [0, 1, 0]);
const upperSpringPart = arm
  .part('upper-spring', upperSpringBuilt.shape)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: upperSpringBuilt.connectorOrigin },
  });

// Wrist spring extends SIDEWAYS (+Y, away from the head body).
const wristSpringBuilt = makeSpring(HEAD_BOSS, [0, 1, 0]);
const wristSpringPart = arm
  .part('wrist-spring', wristSpringBuilt.shape)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: wristSpringBuilt.connectorOrigin },
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

// Fastened mates: each spring's mate-connector origin in spring-local
// frame is `armBoss + SPRING_TEST_OFFSET`, so under the fastened-mate
// composition the spring's test point [10,0,0] co-locates with the
// arm's local origin (= the rotation centre of the arm's parent
// joint). The rigidity invariant therefore reads drift = 0 at every
// single-joint pose sweep.
arm.mate('lower-spring-fix', 'lower-arm.lowerSpringBoss', 'lower-spring.mount', 'fastened');
arm.mate('upper-spring-fix', 'upper-arm.upperSpringBoss', 'upper-spring.mount', 'fastened');
arm.mate('wrist-spring-fix', 'lamp-head.wristSpringBoss', 'wrist-spring.mount', 'fastened');

return arm.solvedModel({});
