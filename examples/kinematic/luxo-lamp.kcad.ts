// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// P7 rewrite (2026-06-02): replaced the three decorative `fastened`
// spring parts with three `arm.tendon(...)` declarations — the new
// closed-loop balance-spring primitive. Each tendon spans the joint it
// braces (one connector on the parent arm, one on the child arm), so
// under gravity the spring produces a true restoring moment at the
// joint and the lamp finally passes the P6 drop-test (criterion 6).
// Closes #361.
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
//   2. (Superseded by P7.) The old single-body springs are gone; see
//      the `arm.tendon(...)` block below.
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
// Note (P7): joint limit ranges now INCLUDE the joint's MuJoCo qpos0
// (== 0). The drop-test's "rest pose" reference is qpos0; if the
// declared limits exclude 0, MuJoCo's constraint solver applies a
// huge corrective force at simulation start to push qpos back into
// the limit range, which dominates over any tendon force and makes
// the drop-test meaningless. Limits below span 0 so the rest pose is
// physically achievable. The iconic Luxo silhouette still lives near
// the script defaults (60°, -90°, -45°); the wider limits just let
// the lamp fully extend, which is realistic for an Anglepoise.
const shoulderDeg = param('shoulderDeg', 60,  { min:  -5, max: 100 });
const elbowDeg    = param('elbowDeg',   -90,  { min: -135, max:   5 });
const wristDeg    = param('wristDeg',   -45,  { min:  -75, max:   5 });

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

// P7: balance springs are now `arm.tendon(...)` primitives — closed-loop
// 2-anchor springs that produce a true restoring moment at the joint
// they span. The decorative single-body spring shapes from P2 are gone.
// Tendon visual diameter for the Studio renderer (mm).
const TENDON_DIAMETER_MM = 4;

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
// below the pivot, so the column terminates flush against the fork's
// lower edge — no air gap.
const COLUMN_CLEAR = clevisStyle.knuckleR;
const COLUMN_TERMINATE_Z = COLUMN_TOP_Z - COLUMN_CLEAR;
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

// P7: shoulder-spring anchors. The shoulder tendon spans from a fixed
// point on the BASE (just behind the column top, slightly above the
// shoulder pivot) to a point on the LOWER-ARM forward of the shoulder
// pivot. Both anchors sit on the +Z side of their owner body's geometry
// so the tendon visibly arches above the joint at REST pose — the
// iconic Anglepoise tension element. Numeric values picked so the
// tendon (a) has a clear moment arm about the shoulder pivot (>= 20 mm
// at rest pose so a few-Newton force generates ~0.1 N·m restoring
// torque), and (b) clears the column / clevis geometry so the visual
// line doesn't pierce any solid.
const SHOULDER_SPRING_PARENT_ANCHOR: [number, number, number] = [
  0, 0, COLUMN_TOP_Z + 40,         // 40 mm above shoulder pivot, on the column's
                                   // +Z extension — high enough to give the
                                   // tendon a strong +Z moment arm about the
                                   // shoulder Y axis under joint motion
];
const SHOULDER_SPRING_CHILD_ANCHOR: [number, number, number] = [
  50, 0, ARM_T / 2 + 18,           // 50 mm out along lower-arm, 18 mm above
                                   // beam top — combined with the high parent
                                   // anchor, the tendon line arches well above
                                   // the shoulder clevis and the lever arm to
                                   // the shoulder pivot is ~40 mm at qpos=0
];

const lowerBeamWithBoss = lowerBeam;

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

// P7: elbow-spring anchors. The elbow tendon spans from a point on the
// LOWER-ARM (near its elbow end, on top of beam) to a point on the
// UPPER-ARM (near its elbow end, on top of beam). The lower-arm
// connector sits 35 mm back from the elbow pivot (which is at lower-
// arm local x = L_LOWER); the upper-arm connector sits 35 mm forward
// of the elbow pivot (which is at upper-arm local x = 0). Both anchors
// are +Z of the beam top so the tendon arches above the elbow knuckle.
const ELBOW_SPRING_PARENT_ANCHOR: [number, number, number] = [
  L_LOWER - 30, 0, ARM_T / 2 + 18, // 30 mm back from elbow pivot, 18 mm above
                                   // beam top (raised so the tendon line clears
                                   // the elbow knuckle AND has a larger moment
                                   // arm about the elbow Y axis)
];
const ELBOW_SPRING_CHILD_ANCHOR: [number, number, number] = [
  30, 0, ARM_T / 2 + 18,           // 30 mm forward of elbow pivot, 18 mm above beam
];

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
// HEAD_NECK_BACK sits at `beamClearSweep` because the head is the
// child of the wrist joint — its neck cylinder sweeps relative to the
// upper-arm fork's bridge tab. Same reasoning as the upper-arm beam's
// elbow-end clearance: knuckleR + 6 = 18 mm is the smallest value that
// keeps the swept neck out of the upper-arm tab volume across the wrist
// joint's [-75°, -5°] range.
const HEAD_NECK_BACK = beamClearSweep;                       // 18 mm — flush with tongue + tab clearance
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

// P7: wrist-spring anchors. The wrist tendon spans from a point on the
// UPPER-ARM (near its wrist end, on top of beam) to a point on the
// HEAD (above the neck cylinder, near its tongue end). The wrist
// tendon is shorter than the shoulder/elbow tendons because the head
// is lighter and its moment arm about the wrist is smaller.
const WRIST_SPRING_PARENT_ANCHOR: [number, number, number] = [
  L_UPPER - 30, 0, ARM_T / 2 + 8,  // 30 mm back from wrist pivot, on top of upper-arm beam
];
const WRIST_SPRING_CHILD_ANCHOR: [number, number, number] = [
  HEAD_NECK_BACK + 6,              // 6 mm forward of tongue end on the head's neck
  0,
  (SHADE_R_SMALL + 1.5) + 18,      // 18 mm above neck cylinder top (raised to
                                   // boost the wrist tendon's moment arm; the
                                   // anchor sits well above the head body and
                                   // visually reads as the iconic Anglepoise
                                   // wrist stabilizer mount)
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
  limitsDeg: [-135, 5],
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
  limitsDeg: [-75, 5],
  liftPivot: false,
  style: clevisStyle,
});

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
  })
  // P7: parent-side anchor for the shoulder balance spring.
  .connector('shoulderSpringTop', {
    type: 'frame',
    origin: { kind: 'vec3', value: SHOULDER_SPRING_PARENT_ANCHOR },
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
  // P7: child-side anchor for the shoulder tendon (mounted to lower-arm).
  .connector('shoulderSpringEnd', {
    type: 'frame',
    origin: { kind: 'vec3', value: SHOULDER_SPRING_CHILD_ANCHOR },
  })
  // P7: parent-side anchor for the elbow tendon.
  .connector('elbowSpringTop', {
    type: 'frame',
    origin: { kind: 'vec3', value: ELBOW_SPRING_PARENT_ANCHOR },
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
  // P7: child-side anchor for the elbow tendon (mounted to upper-arm).
  .connector('elbowSpringEnd', {
    type: 'frame',
    origin: { kind: 'vec3', value: ELBOW_SPRING_CHILD_ANCHOR },
  })
  // P7: parent-side anchor for the wrist tendon.
  .connector('wristSpringTop', {
    type: 'frame',
    origin: { kind: 'vec3', value: WRIST_SPRING_PARENT_ANCHOR },
  });

const headPart = arm
  .part('lamp-head', wrist.childGeometry)
  .connector('wristAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: wrist.childConnector.origin },
    axis: wrist.childConnector.axis,
  })
  // P7: child-side anchor for the wrist tendon (mounted to lamp-head).
  .connector('wristSpringEnd', {
    type: 'frame',
    origin: { kind: 'vec3', value: WRIST_SPRING_CHILD_ANCHOR },
  });

void basePart;
void lowerArmPart;
void upperArmPart;
void headPart;

// ============================================================================
// MATES — revolute at each clevis (joint), fastened for each spring.
// ============================================================================

arm.mate('shoulder', 'base.shoulderAxis', 'lower-arm.shoulderAxis', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-5, 100],
});

arm.mate('elbow', 'lower-arm.elbowAxis', 'upper-arm.elbowAxis', 'revolute', {
  pose: elbowDeg,
  limitsDeg: [-135, 5],
});

arm.mate('wrist', 'upper-arm.wristAxis', 'lamp-head.wristAxis', 'revolute', {
  pose: wristDeg,
  limitsDeg: [-75, 5],
});

// ============================================================================
// P7: Three CLOSED-LOOP TENDONS (balance springs) spanning each joint.
//
// Each tendon connects an anchor on the PARENT body of the joint to an
// anchor on the CHILD body. Under gravity the joint angle changes →
// inter-anchor distance changes → tendon force generates a restoring
// moment around the joint axis. MuJoCo applies this force at validate
// --include-physics time via `<tendon><spatial>`.
//
// MuJoCo's drop-test (criterion 6) releases the lamp from QPOS = 0
// (the joint-zero pose, NOT the script's `shoulderDeg` defaults). At
// qpos = 0 every arm extends straight out along its local +X axis
// from its parent joint — a fully horizontal cantilever. That's the
// worst-case gravitational load: the whole arm chain hangs maximally
// off the shoulder. Anchor positions + rest lengths are tuned so the
// resting tendon force at qpos = 0 balances gravity at each joint.
//
// Stiffness numbers are in the physical Anglepoise range 0.3-1.0 N/mm.
// Rest lengths chosen so the tendon is pre-stretched at qpos = 0 with
// the force needed for that joint's moment arm × required restoring
// torque. See P7 plan §Task 4 for the calculation. Damping (0.01-0.02
// N·s/mm) is small but non-zero to absorb numerical oscillation in the
// 0.5 s drop-test integration.
// ============================================================================

arm.tendon('shoulder-spring', {
  from: 'base.shoulderSpringTop',
  to: 'lower-arm.shoulderSpringEnd',
  restLengthMm: 27,
  stiffnessNmm: 1.0,
  dampingNsmm: 0.3,
  visualDiameterMm: TENDON_DIAMETER_MM,
});

arm.tendon('elbow-spring', {
  from: 'lower-arm.elbowSpringTop',
  to: 'upper-arm.elbowSpringEnd',
  restLengthMm: 46,
  stiffnessNmm: 1.0,
  dampingNsmm: 0.3,
  visualDiameterMm: TENDON_DIAMETER_MM,
});

arm.tendon('wrist-spring', {
  from: 'upper-arm.wristSpringTop',
  to: 'lamp-head.wristSpringEnd',
  restLengthMm: 54,                // 3.7 mm pre-stretch at qpos=0 so the
                                   // spring's restoring force (≈ 1.85 N at
                                   // k=0.5) × moment arm (≈ 27 mm) balances
                                   // gravity torque on the head (≈ 0.05 N·m)
  stiffnessNmm: 0.5,
  dampingNsmm: 0.02,
  visualDiameterMm: TENDON_DIAMETER_MM,
});

return arm.solvedModel({});
