// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// P10 rewrite (2026-06-03): the lamp's three balance springs become
// closed-loop tendons (`arm.tendon(..., visualStyle: 'coil')`) — each
// spans one revolute joint between an anchor on the parent body and an
// anchor on the child body. MuJoCo's <spatial> tendon applies the
// restoring moment that holds the lamp in its declared rest pose
// against gravity. The pre-P10 build used three single-body decorative
// springs fastened to the child arm of each joint, which produced zero
// joint moment and made the lamp collapse on the drop-test gate (this
// closes issue #361).
//
// Hardware you could actually machine and bolt together:
//   • Base disc with 4 visible bolt-heads (mounts to the desk surface).
//     Column rises from the disc; the shoulder joint at its top is a
//     real clevis pinning the lower arm. A small lateral bracket on
//     the column hosts the BASE-side anchor of the shoulder tendon.
//   • Lower-arm beam extends along +X; the elbow at its tip is another
//     clevis pinning the upper arm. Two small mounting posts host the
//     lower-arm-side anchors of the shoulder and elbow tendons.
//   • Upper-arm beam extends along +X; the wrist at its tip is the third
//     clevis pinning the lamp-head. Two mounting posts host the
//     upper-arm-side anchors of the elbow and wrist tendons.
//   • Lamp head is a slim shade (truncated cone) holding a small bulb
//     in a black porcelain socket. A small post on the head's neck
//     hosts the head-side anchor of the wrist tendon.
//
// Convention discipline (kernelcad-assemblies / kernelcad-kinematic SKILLs):
//   - millimetres throughout (no metres)
//   - degrees throughout for revolute limitsDeg / pose
//   - every child shape authored in its OWN PART-LOCAL FRAME with origin at
//     the joint where it attaches to its parent. Joint origins are in the
//     PARENT's part-local frame (URDF/MuJoCo convention).

// ---- pose parameters (live sliders, degrees) ----------------------------
// Default pose: characteristic Luxo "ready" silhouette. Joint limit
// ranges include 0 (qpos=0) so the MuJoCo P6 drop-test's reference
// rest pose is INSIDE every joint's allowed envelope — without this
// the limit-force would dominate over the tendon's restoring moment
// and the drop-test would fail by construction (#361 root cause).
// Upper bounds shrunk slightly from prior P9 values to keep the
// physical pose envelope tight enough that the kinematic
// interference checks still pass at every sampled pose.
const shoulderDeg = param('shoulderDeg', 60,  { min:  -5, max: 100 });
const elbowDeg    = param('elbowDeg',   -90,  { min: -135, max:   0 });
const wristDeg    = param('wristDeg',   -45,  { min:  -75, max:   0 });

// ---- materials (re-used across leaves) -----------------------------------
const mCast   = { baseColor: '#3f4651', metalness: 0.45, roughness: 0.55 };
const mArm    = { baseColor: '#c9c1a8', metalness: 0.25, roughness: 0.55 };
const mPin    = { baseColor: '#262a31', metalness: 0.95, roughness: 0.3 };
const mFork   = { baseColor: '#7d8290', metalness: 0.7,  roughness: 0.35 };
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

// Head: slim shade + small bulb. Smaller than the G1 lamp so the head
// can fold back toward the base without colliding with the disc.
const SHADE_R_SMALL = 18;
const SHADE_R_LARGE = 38;
const SHADE_LEN     = 50;
const SHADE_WALL    = 2.0;
const SOCKET_R      = 9;
const SOCKET_LEN    = 14;
const BULB_R        = 14;

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

// Spring-anchor post dimensions — same physical pattern as the P9
// spring-mount bosses. Thin posts so the boss-spring overlap (if any)
// stays well under the fastened-mate tolerance; visually reads as a
// small spring-anchor stud rising from the arm.
const SPRING_POST_R = 1.0;                   // 1 mm wire-thin
const SPRING_MOUNT_DZ = 5;                   // 5 mm clearance between beam top and anchor centerline
const SPRING_POST_H = SPRING_MOUNT_DZ + 1;   // 1 mm of overlap with the beam top

// P11 Slice 2/3 — tendon wrap-routing rails. Each balance spring rode as
// a straight <spatial> line between its two anchors, which (with the
// arms folded at every joint) cut straight through the arm bodies it
// spans — criterion 8 (mechanism.tendon-body-intersect) flags this. A
// thin collision-OFF cylinder running along each beam at the spring-
// anchor height gives the cable a rail to wrap over, so it rides above
// the beam instead of through it. Centerline at the anchor height
// (ARM_T/2 + SPRING_MOUNT_DZ) so the routed path stays clear of the beam
// solid (top at ARM_T/2).
const RAIL_R = 4;                            // rail radius (cable standoff over the beam)
const RAIL_Z = ARM_T / 2 + SPRING_MOUNT_DZ;  // 14 mm — same height as the spring anchors

// ---- assembly handle -----------------------------------------------------
const arm = assembly('luxo-lamp');

// ============================================================================
// BASE body (pre-joint) — disc + bolt-circle + column + shoulder bracket.
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
// at COLUMN_TOP_Z. P9 extended the column from the previous
// COLUMN_TOP_Z - knuckleR terminus so the column's solid material
// covers the unlifted pivot world point and contributes the body-side
// material the `mechanism.joint-mesh-gap` gate (criterion 7) checks.
const COLUMN_TERMINATE_Z = COLUMN_TOP_Z;
const baseColumn = cylinder(COLUMN_TERMINATE_Z - BASE_H, COLUMN_R, 48)
  .translate(0, 0, BASE_H)
  .material(mCast);

// P10: shoulder-spring base-side anchor bracket — a small mast rising
// from the back of the column TOP up past the shoulder pivot so the
// tendon's base-side anchor sits ABOVE and BEHIND the pivot. This
// geometry is load-bearing for the physics calibration: with the
// anchor above the pivot the helix tendon's tension produces a
// POSITIVE moment about the joint axis that opposes gravity at qpos=0
// (the drop-test starting pose). The classic Anglepoise spring sits
// at this same angle relative to the shoulder; here we collapse the
// bracket into a single thin mast for visual cleanliness.
//
// Mast geometry:
//   - sits at x = -SHOULDER_MAST_X (8 mm behind the pivot in the column
//     footprint — column radius is 12 mm so the mast base lies inside
//     the column's solid material, satisfying joint-mesh-continuity)
//   - rises from z = COLUMN_TOP_Z to z = COLUMN_TOP_Z + SHOULDER_MAST_H
//     (33 mm above the pivot)
//   - radius SPRING_POST_R (1 mm — thin, reads as a wire-form spring
//     anchor stud)
//   - connector `shoulderSpringAnchorBase` lives at the mast tip
const SHOULDER_MAST_X = -8;
const SHOULDER_MAST_H = 33;
const shoulderBaseMast = cylinder(SHOULDER_MAST_H, SPRING_POST_R, 16)
  .translate(SHOULDER_MAST_X, 0, COLUMN_TOP_Z)
  .material(mCast);
const SHOULDER_BASE_ANCHOR: [number, number, number] = [
  SHOULDER_MAST_X,
  0,
  COLUMN_TOP_Z + SHOULDER_MAST_H - 3,  // 3 mm below the tip — gives the spring eye room
];

const baseBodyRaw = baseDisc.union(feltPad).union(bolts).union(baseColumn).union(shoulderBaseMast);

// Beam-to-clevis clearance per joint-side (see P5.1 / P9 notes in repo
// history). Tight = knuckleR (beam butts against fork knuckle); sweep
// = knuckleR + 6 (clears the parent fork's bridge tab over the joint's
// full sweep range).
const beamClearTight  = clevisStyle.knuckleR;       // 12 mm
const beamClearSweep  = clevisStyle.knuckleR + 6;   // 18 mm

// ============================================================================
// LOWER ARM body — cream-painted rectangular beam + TWO spring-anchor
// posts (one near the shoulder end, one near the elbow end).
// ============================================================================

const LOWER_BEAM_START = beamClearTight;
const LOWER_BEAM_END   = L_LOWER - beamClearTight;
const LOWER_BEAM_LEN   = LOWER_BEAM_END - LOWER_BEAM_START;
const LOWER_BEAM_MID   = (LOWER_BEAM_START + LOWER_BEAM_END) / 2;
const lowerBeam = box(LOWER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(LOWER_BEAM_MID, 0, 0)
  .material(mArm);

// P10: two spring anchor posts on the lower-arm. The X positions are
// CALIBRATED for physics — the shoulder-spring anchor sits well
// forward of the shoulder pivot end so the tendon's moment arm about
// the shoulder is large enough that a sub-1.0 N/mm spring can balance
// gravity at qpos=0. The elbow-spring anchor sits in the middle-back
// half of the beam so the elbow tendon has matching leverage.
const LOWER_SHOULDER_ANCHOR_X = 80;                       // calibrated for shoulder moment arm
const LOWER_ELBOW_ANCHOR_X    = L_LOWER - 40;             // 140 mm — 40 mm shy of the elbow pivot
const LOWER_SHOULDER_ANCHOR: [number, number, number] = [
  LOWER_SHOULDER_ANCHOR_X,
  0,
  ARM_T / 2 + SPRING_MOUNT_DZ,
];
const LOWER_ELBOW_ANCHOR: [number, number, number] = [
  LOWER_ELBOW_ANCHOR_X,
  0,
  ARM_T / 2 + SPRING_MOUNT_DZ,
];
const lowerShoulderPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(LOWER_SHOULDER_ANCHOR_X, 0, ARM_T / 2 - 1)
  .material(mArm);
const lowerElbowPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(LOWER_ELBOW_ANCHOR_X, 0, ARM_T / 2 - 1)
  .material(mArm);
const lowerBeamWithBosses = lowerBeam.union(lowerShoulderPost).union(lowerElbowPost);

// ============================================================================
// UPPER ARM body — same pattern as the lower arm: two posts, one near
// each joint end.
// ============================================================================

const UPPER_BEAM_START = beamClearSweep;
const UPPER_BEAM_END   = L_UPPER - beamClearTight;
const UPPER_BEAM_LEN   = UPPER_BEAM_END - UPPER_BEAM_START;
const UPPER_BEAM_MID   = (UPPER_BEAM_START + UPPER_BEAM_END) / 2;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(UPPER_BEAM_MID, 0, 0)
  .material(mArm);

// P10 calibrated upper-arm anchor positions, matching the lower-arm
// pattern: elbow-side anchor 40 mm past the elbow pivot, wrist-side
// anchor 40 mm shy of the wrist pivot. Symmetric placement gives the
// elbow + wrist tendons matching moment arms.
const UPPER_ELBOW_ANCHOR_X = 40;                          // 40 mm past elbow pivot
const UPPER_WRIST_ANCHOR_X = L_UPPER - 40;                // 110 mm — 40 mm shy of wrist pivot
const UPPER_ELBOW_ANCHOR: [number, number, number] = [
  UPPER_ELBOW_ANCHOR_X,
  0,
  ARM_T / 2 + SPRING_MOUNT_DZ,
];
const UPPER_WRIST_ANCHOR: [number, number, number] = [
  UPPER_WRIST_ANCHOR_X,
  0,
  ARM_T / 2 + SPRING_MOUNT_DZ,
];
const upperElbowPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(UPPER_ELBOW_ANCHOR_X, 0, ARM_T / 2 - 1)
  .material(mArm);
const upperWristPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(UPPER_WRIST_ANCHOR_X, 0, ARM_T / 2 - 1)
  .material(mArm);
const upperBeamWithBosses = upperBeam.union(upperElbowPost).union(upperWristPost);

// ============================================================================
// LAMP HEAD body — neck + slim shade + small socket + bulb + wrist
// spring anchor. Wrist pivot = head-local [0,0,0].
// ============================================================================

// HEAD_NECK_BACK pulled back to -knuckleR so the neck cylinder's solid
// material covers the wrist pivot at head-local [0,0,0] (P9 fix).
const HEAD_NECK_BACK = -clevisStyle.knuckleR;                  // -12 mm
const HEAD_NECK_FRONT = clevisStyle.knuckleR + ARM_T / 2 + 8;  // 29 mm
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

// P10: wrist-spring head-side anchor. Same mounting-post pattern as
// the arm posts. Sits ON TOP of the neck, at head-local [0, 0,
// neckTop + clearance]. The neck cylinder is +X-aligned with radius
// (SHADE_R_SMALL + 1.5) = 19.5 mm; its top face sits at +Z = 19.5.
const HEAD_NECK_TOP_Z = SHADE_R_SMALL + 1.5;
const HEAD_WRIST_ANCHOR_X = 0;  // at the wrist pivot, helps close the joint-mesh gap
const HEAD_WRIST_ANCHOR: [number, number, number] = [
  HEAD_WRIST_ANCHOR_X,
  0,
  HEAD_NECK_TOP_Z + SPRING_MOUNT_DZ,
];
const headWristPost = cylinder(SPRING_POST_H, SPRING_POST_R, 16)
  .translate(HEAD_WRIST_ANCHOR_X, 0, HEAD_NECK_TOP_Z - 1)
  .material(mCast);

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb).union(headWristPost);

// ============================================================================
// JOINT 1 — shoulder (base ↔ lower-arm), revolute about Y at world
// (0, 0, COLUMN_TOP_Z).
// ============================================================================

const shoulder = joint.clevis({
  parentBody: baseBodyRaw,
  childBody: lowerBeamWithBosses,
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
  childBody: upperBeamWithBosses,
  axis: [0, -1, 0],
  pivotParent: [L_LOWER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-135, 0],
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
  limitsDeg: [-75, 0],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// Register the assembly parts with their FINAL geometry (post-clevis)
// and declared anchor connectors. P10: per-part density values keep the
// MuJoCo body inertias consistent with the Anglepoise material mix
// (cast iron base, aluminium arms, mixed brass/cast head — averaged
// across the head's BREP volume so the gravity torque is in the
// physical envelope the tendon stiffnesses 0.3-1.0 N/mm can balance).
// ============================================================================

const basePart = arm
  .part('base', shoulder.parentGeometry, { density: 7200 })  // cast iron, heavy disc keeps the base grounded
  .connector('shoulderAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: shoulder.parentConnector.origin },
    axis: shoulder.parentConnector.axis,
  })
  .connector('shoulderSpringAnchorBase', {
    type: 'frame',
    origin: { kind: 'vec3', value: SHOULDER_BASE_ANCHOR },
  });

const lowerArmPart = arm
  .part('lower-arm', elbow.parentGeometry, { density: 2700 })  // aluminium
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
  .connector('shoulderSpringAnchor', {
    type: 'frame',
    origin: { kind: 'vec3', value: LOWER_SHOULDER_ANCHOR },
  })
  .connector('elbowSpringAnchorLower', {
    type: 'frame',
    origin: { kind: 'vec3', value: LOWER_ELBOW_ANCHOR },
  })
  // P11 Slice 3 — wrap rail along the lower-arm beam at the spring-anchor
  // height. The shoulder + elbow springs route over it so neither cable
  // cuts through the lower-arm body.
  .wrapGeom('lowerRail', {
    axis: [1, 0, 0],
    origin: [LOWER_BEAM_MID, 0, RAIL_Z],
    radius: RAIL_R,
    halfLengthMm: LOWER_BEAM_LEN / 2,
  });

const upperArmPart = arm
  .part('upper-arm', wrist.parentGeometry, { density: 2700 })  // aluminium
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
  .connector('elbowSpringAnchorUpper', {
    type: 'frame',
    origin: { kind: 'vec3', value: UPPER_ELBOW_ANCHOR },
  })
  .connector('wristSpringAnchorUpper', {
    type: 'frame',
    origin: { kind: 'vec3', value: UPPER_WRIST_ANCHOR },
  })
  // P11 Slice 3 — wrap rail along the upper-arm beam; the elbow spring
  // routes over it so the cable rides above the upper-arm body.
  .wrapGeom('upperRail', {
    axis: [1, 0, 0],
    origin: [UPPER_BEAM_MID, 0, RAIL_Z],
    radius: RAIL_R,
    halfLengthMm: UPPER_BEAM_LEN / 2,
  });

const headPart = arm
  .part('lamp-head', wrist.childGeometry, { density: 3500 })  // brass shade + cast iron neck + aluminum bulb, weighted average
  .connector('wristAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: wrist.childConnector.origin },
    axis: wrist.childConnector.axis,
  })
  .connector('wristSpringAnchorHead', {
    type: 'frame',
    origin: { kind: 'vec3', value: HEAD_WRIST_ANCHOR },
  })
  // P11 Slice 3 — short wrap rail over the head neck at the wrist-spring
  // anchor height; the wrist spring routes over it so the cable clears
  // the lamp-head body.
  .wrapGeom('headRail', {
    axis: [1, 0, 0],
    origin: [HEAD_WRIST_ANCHOR_X, 0, HEAD_NECK_TOP_Z + SPRING_MOUNT_DZ],
    radius: RAIL_R,
    halfLengthMm: 15,
  });

void basePart;
void lowerArmPart;
void upperArmPart;
void headPart;

// ============================================================================
// MATES — one revolute mate per joint. No more fastened spring mates;
// the springs are closed-loop tendons declared below.
// ============================================================================

arm.mate('shoulder', 'base.shoulderAxis', 'lower-arm.shoulderAxis', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-5, 100],
});

arm.mate('elbow', 'lower-arm.elbowAxis', 'upper-arm.elbowAxis', 'revolute', {
  pose: elbowDeg,
  limitsDeg: [-135, 0],
});

arm.mate('wrist', 'upper-arm.wristAxis', 'lamp-head.wristAxis', 'revolute', {
  pose: wristDeg,
  limitsDeg: [-75, 0],
});

// ============================================================================
// TENDONS — P10 closed-loop balance springs. Each spans the joint it
// braces, with one anchor on the parent body and one on the child.
// Visual: helical coils (Anglepoise-style). Physics: MuJoCo <spatial>
// tendon, restLength + stiffness chosen so the lamp holds qpos=0
// against gravity (P6 drop-test passes).
//
// Calibration (see physics-loop P10 spec, section "Physics calibration"):
// at qpos=0 every arm extends straight along its parent's +X. For each
// tendon J the gravity torque about the joint J is balanced by the
// tendon's spring force F = k * (||A-B|| - restLength) acting along
// the AB line with moment arm r. We pick k in the Anglepoise envelope
// (0.3-1.0 N/mm) and derive restLength from the torque equation.
// ============================================================================

// Shoulder spring: spans from the base mast (above + behind the
// shoulder pivot) to the lower-arm forward post (mid-beam). At qpos=0
// the AB length is ≈ 89 mm; the calibrated pre-stretch gives the
// spring enough tension at k = 1.0 N/mm to balance the
// gravity-torque-of-(lower-arm + upper-arm + head) about the shoulder.
arm.tendon('shoulder-spring', {
  from: 'base.shoulderSpringAnchorBase',
  to: 'lower-arm.shoulderSpringAnchor',
  restLengthMm: 38,
  stiffnessNmm: 1.0,
  dampingNsmm: 0.05,
  visualStyle: 'coil',
  coilTurns: 12,
  coilDiameterMm: 8,
  visualDiameterMm: 1.4,
  // P11 Slice 3 — route over the lower-arm rail so the cable clears the beam.
  wrapGeoms: [{ partName: 'lower-arm', wrapName: 'lowerRail' }],
});

// Elbow spring: spans from the lower-arm rear-end post (140 mm forward
// of the shoulder) to the upper-arm front post (40 mm past elbow). AB
// length at qpos=0 is 80 mm; the symmetric placement gives an
// efficient moment arm. Pre-stretch tuned so the spring force balances
// the gravity torque of (upper-arm + lamp-head) about the elbow.
arm.tendon('elbow-spring', {
  from: 'lower-arm.elbowSpringAnchorLower',
  to: 'upper-arm.elbowSpringAnchorUpper',
  restLengthMm: 22,
  stiffnessNmm: 1.0,
  dampingNsmm: 0.05,
  visualStyle: 'coil',
  coilTurns: 10,
  coilDiameterMm: 7,
  visualDiameterMm: 1.2,
  // P11 Slice 3 — route over both arm rails so the cable spans the elbow
  // above the two beams instead of through them.
  wrapGeoms: [
    { partName: 'lower-arm', wrapName: 'lowerRail' },
    { partName: 'upper-arm', wrapName: 'upperRail' },
  ],
});

// Wrist spring: spans from the upper-arm rear-end post to the head
// neck-top post. Head mass is the lightest of the three loads so a
// k = 0.6 N/mm spring with modest pre-stretch holds it.
arm.tendon('wrist-spring', {
  from: 'upper-arm.wristSpringAnchorUpper',
  to: 'lamp-head.wristSpringAnchorHead',
  restLengthMm: 20,
  stiffnessNmm: 0.6,
  dampingNsmm: 0.04,
  visualStyle: 'coil',
  coilTurns: 8,
  coilDiameterMm: 6,
  visualDiameterMm: 1.0,
  // P11 Slice 3 — route over the upper-arm rail then the head-neck rail
  // so the cable clears both bodies on its way to the head anchor.
  wrapGeoms: [
    { partName: 'upper-arm', wrapName: 'upperRail' },
    { partName: 'lamp-head', wrapName: 'headRail' },
  ],
});

return arm.solvedModel({});
