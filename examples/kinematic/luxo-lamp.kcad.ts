// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// G1 rewrite (2026-05-31): every revolute joint is now built with
// `joint.clevis(...)` — the constructive primitive that emits the canonical
// fork + tongue + pin + through-hole hardware guaranteed correct by
// construction (one-pass drill, pivot lifted by max rotated-tongue reach,
// bridge tabs outside the tongue's swing envelope, pin caps flush against
// the outer fork faces). The pre-G1 build hand-rolled forks/tongues/yokes
// from box/cylinder/union and needed three `ignore[]` joint-pair entries
// to silence "every-gate-green-mechanism-falls-apart" interference noise.
// The rewritten lamp validates with --include-interference and ZERO
// `ignore[]` entries in the script — the smoking-gun signal that the
// primitive removed the lamp-class delivery failure.
//
// Hardware you could actually machine and bolt together:
//   • Base disc with 4 visible bolt-heads (mounts to the desk surface).
//   • Column rises from the disc; the shoulder joint at its top is a real
//     clevis (built by joint.clevis with axis='Y'), pinning the lower arm.
//   • Lower-arm beam extends along +X; the elbow at its tip is another
//     clevis pinning the upper arm.
//   • Upper-arm beam extends along +X; the wrist at its tip is the third
//     clevis pinning the lamp-head.
//   • Lamp head's shade is a truncated cone holding a glass bulb in a black
//     porcelain socket.
//
// Convention discipline (kernelcad-assemblies / kernelcad-kinematic SKILLs):
//   - millimetres throughout (no metres)
//   - degrees throughout for revolute limitsDeg / pose
//   - every child shape authored in its OWN PART-LOCAL FRAME with origin at
//     the joint where it attaches to its parent. Joint origins are in the
//     PARENT's part-local frame (URDF/MuJoCo convention).

// ---- pose parameters (live sliders, degrees) ----------------------------
// Default pose: characteristic Luxo-lamp "ready" silhouette — arms folded
// gently, head tilted forward and down so the shade points at the desk
// surface ahead of the base.
const shoulderDeg = param('shoulderDeg', 60,   { min: -10, max: 110 });
const elbowDeg    = param('elbowDeg',    -90,  { min: -150, max: -30 });
const wristDeg    = param('wristDeg',    -45,  { min: -90,  max:   0 });

// ---- materials (re-used across leaves) -----------------------------------
const mCast = { baseColor: '#3f4651', metalness: 0.45, roughness: 0.55 };     // dark cast-iron base
const mArm  = { baseColor: '#c9c1a8', metalness: 0.25, roughness: 0.55 };     // warm cream arm (classic Luxo)
const mPin  = { baseColor: '#262a31', metalness: 0.95, roughness: 0.3 };      // black-oxide steel pin
const mFork = { baseColor: '#7d8290', metalness: 0.7,  roughness: 0.35 };     // brushed steel clevis bracket
const mBrass  = { baseColor: '#c79a3b', metalness: 0.85, roughness: 0.3 };    // brass shade
const mSocket = { baseColor: '#2c2f36', metalness: 0.7,  roughness: 0.35 };   // black porcelain socket
const mBulb   = { baseColor: '#fff5d6', metalness: 0.0,  roughness: 0.18 };   // incandescent glass

// ---- dimensions ---------------------------------------------------------
// Base (cast disc, bolt-circle, neck column rising to shoulder fork).
const BASE_R       = 75;
const BASE_H       = 14;
const BOLT_R       = 58;     // bolt-circle radius (visible mount bolts)
const BOLT_HEAD_R  = 6;
const BOLT_HEAD_H  = 5;
const COLUMN_R     = 14;
const COLUMN_H     = 50;
const COLUMN_TOP_Z = BASE_H + COLUMN_H;   // 64 mm — shoulder pivot anchor

// Beam arm cross-section.
const ARM_W = 14;   // Y dimension
const ARM_T = 18;   // Z dimension
const L_LOWER = 200;
const L_UPPER = 170;

// Head: shade, bulb, socket.
const SHADE_R_SMALL = 28;
const SHADE_R_LARGE = 70;
const SHADE_LEN     = 95;
const SHADE_WALL    = 2.5;
const SOCKET_R      = 16;
const SOCKET_LEN    = 26;
const BULB_R        = 30;

// Shared clevis style — re-used at all three joints so the brushed-steel
// hardware reads visually consistent up the arm. Pin axis is Y at every
// joint; the joint.clevis primitive lifts the pivot by max rotated-tongue
// reach so the tongue's swing arc cannot intrude into the parent body.
//
// forkGapY is sized > ARM_W (the beam's Y-width) with clearance — so the
// child's beam, which extends from the pivot along +X, can swing through
// the fork-plate gap without rubbing the fork's inner faces. tongueY is
// sized to match ARM_W so the tongue plate replaces the beam's near-end
// volume cleanly when the two are unioned in.
const clevisStyle = {
  knuckleR: 14,
  forkGapY: ARM_W + 4,   // 18 mm — beam (14 mm wide) slips through with 2 mm clearance per side
  tongueY: ARM_W,        // 14 mm — tongue matches beam thickness so the union is flush
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
// Base body (pre-joint) — disc + bolt-circle + column. The shoulder
// clevis joint will union its fork + pin into this body, and drill its
// through-hole through the resulting column-top + fork stack.
// ============================================================================

const baseDisc = cylinder(BASE_H, BASE_R, 64).material(mCast);

// Felt pad ring on the bottom (anti-skid pad — Anglepoise hallmark).
const feltPad = cylinder(1.5, BASE_R - 6, 64)
  .translate(0, 0, -1.5)
  .material({ baseColor: '#1a1c20', metalness: 0.0, roughness: 0.95 });

// Bolt circle: four bolt-heads sitting on the top face of the disc.
const boltHead = cylinder(BOLT_HEAD_H, BOLT_HEAD_R, 24)
  .translate(BOLT_R, 0, BASE_H)
  .material(mPin);
const bolts = boltHead.patternCircular({ count: 4, axis: [0, 0, 1] });

// Column terminates ABOVE the disc but a clearance below the shoulder
// pivot — leaves room for the lower-arm beam (which rotates about the
// shoulder Y-axis) to swing through its full pose range without entering
// the column volume. The clearance must accommodate (a) the tongue's
// rotational envelope (knuckleR) AND (b) the beam's diagonal sweep at the
// rotation extremes. At pose θ, the beam's bottom edge at child x near
// the pivot reaches world Z = pivot − (ARM_T/2 · cos θ + beamClear · sin θ).
// For shoulderDeg ∈ [−10°, 110°], the worst case is θ ≈ 110° giving roughly
// 9 + 25 ≈ 34 mm of downswing. Add 2 mm OCCT mesher pad.
const COLUMN_CLEAR = clevisStyle.knuckleR + ARM_T + 2;
const COLUMN_TERMINATE_Z = COLUMN_TOP_Z - COLUMN_CLEAR;
const baseColumn = cylinder(COLUMN_TERMINATE_Z - BASE_H, COLUMN_R, 48)
  .translate(0, 0, BASE_H)
  .material(mCast);

const baseBodyRaw = baseDisc.union(feltPad).union(bolts).union(baseColumn);

// Beams are AUTHORED SHORT: the near end (toward the pivot the part is
// CHILD of) clears the part-local origin by `beamClear`, so that under any
// allowed rotation, the beam's near-end corner cannot swing into the
// parent body BELOW the pivot. Conservative bound: clearance must exceed
// the BEAM's diagonal half-extent (sqrt((ARM_W/2)² + (ARM_T/2)²)) plus the
// clevis hardware (knuckleR + plateT) so the fork plates also clear.
const beamClear = clevisStyle.knuckleR + ARM_T / 2 + 2;

// ============================================================================
// Lower arm body (pre-joint) — a cream-painted rectangular beam extending
// from x = beamClear (clearing the shoulder pivot's tongue swing) to
// x = L_LOWER - beamClear (clearing the elbow pivot's tongue swing). The
// shoulder clevis will union its tongue + drill its through-hole at x=0;
// the elbow clevis will union its fork + drill at x = L_LOWER.
// ============================================================================

const LOWER_BEAM_LEN = L_LOWER - 2 * beamClear;
const lowerBeam = box(LOWER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_LOWER / 2, 0, 0)
  .material(mArm);

// ============================================================================
// Upper arm body (pre-joint) — same pattern as the lower arm.
// ============================================================================

const UPPER_BEAM_LEN = L_UPPER - 2 * beamClear;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2, 0, 0)
  .material(mArm);

// ============================================================================
// Lamp head body (pre-joint) — wrist tongue at origin, neck/shade/socket/bulb
// extending along +X. The wrist clevis will union its tongue + drill at
// the part-local origin.
// ============================================================================

// Short collar where the head's wrist mates the shade neck. Pushed far
// enough from the wrist pivot to clear the upper-arm beam under the full
// wristDeg range; the clearance is sized to the beam's diagonal half-extent
// (ARM_T/2 sweeping across the wrist's swing).
const HEAD_NECK_LEN = 28;
const HEAD_NECK_CLEAR = clevisStyle.knuckleR + ARM_T;
const headNeck = cylinder(HEAD_NECK_LEN, SHADE_R_SMALL + 1.5, 32)
  .rotate([0, 1, 0], 90)
  .translate(HEAD_NECK_CLEAR, 0, 0)
  .material(mCast);

// Shade — hollow truncated cone (outer cone minus inner cone), revolved
// about the local Z, then rotated so its axis becomes +X.
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
const SHADE_ANCHOR_X = HEAD_NECK_CLEAR + 8;
const shade = shadeRaw
  .rotate([0, 1, 0], 90)
  .translate(SHADE_ANCHOR_X, 0, 0)
  .material(mBrass);

const socket = cylinder(SOCKET_LEN, SOCKET_R, 32)
  .rotate([0, 1, 0], 90)
  .translate(SHADE_ANCHOR_X + 6, 0, 0)
  .material(mSocket);

const bulb = sphere(BULB_R)
  .translate(SHADE_ANCHOR_X + SOCKET_LEN + BULB_R * 0.65, 0, 0)
  .material(mBulb);

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb);

// ============================================================================
// JOINT 1 — shoulder (base ↔ lower-arm), revolute about Y at world
// (0, 0, COLUMN_TOP_Z). joint.clevis builds the fork on the parent (base),
// the tongue on the child (lower-arm), and the pin that pins them
// together. The primitive returns the parent/child geometry to assign
// back to each part's Shape, plus the connector specs ready to wire the
// revolute mate.
// ============================================================================

const shoulder = joint.clevis({
  parentBody: baseBodyRaw,
  childBody: lowerBeam,
  axis: [0, -1, 0],
  pivotParent: [0, 0, COLUMN_TOP_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: [-10, 110],
  // No lift — the column body already terminates at COLUMN_TOP_Z -
  // knuckleR (see baseColumn above), leaving room for the shoulder
  // tongue's lower-half rotational sweep. The pivot remains at the
  // user-supplied COLUMN_TOP_Z, so the joint reads at z=64 in world
  // coordinates and the lamp silhouette matches the pre-G1 build.
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// JOINT 2 — elbow (lower-arm ↔ upper-arm), revolute about Y at lower-arm tip
// (x = L_LOWER). The lower-arm body already received the shoulder tongue
// above; we now layer the elbow fork on top via joint.clevis.
// ============================================================================

const elbow = joint.clevis({
  parentBody: shoulder.childGeometry, // lower-arm body so far (beam + shoulder tongue/drill)
  childBody: upperBeam,
  axis: [0, -1, 0],
  pivotParent: [L_LOWER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-150, -30],
  // No lift. The lower-arm beam terminates at L_LOWER; the elbow tongue
  // extends beyond the beam tip by knuckleR, so it does not enter the
  // beam's volume from BEHIND the pivot.
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// JOINT 3 — wrist (upper-arm ↔ lamp-head), revolute about Y at upper-arm tip
// (x = L_UPPER). The upper-arm body already received the elbow tongue above;
// we now layer the wrist fork on top via joint.clevis.
// ============================================================================

const wrist = joint.clevis({
  parentBody: elbow.childGeometry, // upper-arm body so far (beam + elbow tongue/drill)
  childBody: headBodyRaw,
  axis: [0, -1, 0],
  pivotParent: [L_UPPER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-90, 0],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// Register the assembly parts with their FINAL geometry (post-clevis) and
// wire each connector returned by the primitive.
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
  });

const headPart = arm
  .part('lamp-head', wrist.childGeometry)
  .connector('wristAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: wrist.childConnector.origin },
    axis: wrist.childConnector.axis,
  });

// Quiet the linter on the unused part-handle references — they're captured
// in the assembly via the .part(...) chain above; explicit naming surfaces
// them for downstream MCP tools (inspect_assembly).
void basePart;
void lowerArmPart;
void upperArmPart;
void headPart;

// ============================================================================
// MATES — revolute at each clevis, bound by reference to the connector specs
// returned by joint.clevis. No coordinate triples appear in the mate decls;
// the binding is topology-stable across part-frame edits.
// ============================================================================

arm.mate('shoulder', 'base.shoulderAxis', 'lower-arm.shoulderAxis', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-10, 110],
});

arm.mate('elbow', 'lower-arm.elbowAxis', 'upper-arm.elbowAxis', 'revolute', {
  pose: elbowDeg,
  limitsDeg: [-150, -30],
});

arm.mate('wrist', 'upper-arm.wristAxis', 'lamp-head.wristAxis', 'revolute', {
  pose: wristDeg,
  limitsDeg: [-90, 0],
});

// ============================================================================
// SOLVE + VALIDATE
// ============================================================================
// Every joint is a real clevis-fork + tongue + pin built by joint.clevis.
// The through-hole at each pivot is drilled in a SINGLE subtract AFTER the
// fork/tongue are unioned with their respective body — guaranteeing the
// hole is co-located in every solid the pin passes through. The pin caps
// sit flush against the outer fork faces. Bridge tabs (where present) live
// outside the tongue's swing envelope.
//
// Critically: NO `ignore[]` entries. The pre-G1 lamp needed three joint-pair
// ignores to silence tongue-in-fork BREP overlap noise; the constructive
// primitive removes those overlaps by construction (the through-hole bores
// clearance for the tongue's swept volume, and the tongue's plate
// thickness is < forkGapY so it slips between the fork plates without
// touching them). Per the kernelcad-kinematic SKILL "Mechanism delivery —
// non-bypassable" rule, joint-pair contacts may not be ignored — and here
// they don't need to be.

return arm.solvedModel({});
