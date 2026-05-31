// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// G1 rewrite (2026-05-31): every revolute joint is built with
// `joint.clevis(...)` — the constructive primitive that emits the canonical
// fork + tongue + pin + through-hole hardware guaranteed correct by
// construction (one-pass drill, pivot lifted by max rotated-tongue reach,
// bridge tabs outside the tongue's swing envelope, pin caps flush against
// the outer fork faces).
//
// Issue #339 restoration: the G1 pass dropped the lamp's iconic body
// geometry — column, beams, head neck/socket/bulb, and the three Anglepoise
// coil springs — leaving only floating fork/tongue hardware. This revision
// UNIONs each part's body shape WITH the primitive's output, so the lamp
// reads as a Luxo silhouette again while still using `joint.clevis(...)` at
// every revolute joint.
//
// Hardware you could actually machine and bolt together:
//   • Base disc with 4 visible bolt-heads (mounts to the desk surface).
//   • Vertical column rises from the disc; the shoulder clevis at its top
//     pins the lower arm to the base.
//   • Lower-arm beam extends along +X; the elbow clevis at its tip pins the
//     upper arm.
//   • Upper-arm beam extends along +X; the wrist clevis at its tip pins the
//     lamp-head.
//   • Lamp head: short neck → truncated-cone shade with a black porcelain
//     socket and an incandescent glass bulb visible at the mouth.
//   • Three decorative tension-spring parts, each fastened to its parent
//     arm — the classic Anglepoise balance mechanism, ridden along each
//     arm segment.
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
const mSpring = { baseColor: '#2a2e36', metalness: 0.85, roughness: 0.4 };    // black spring wire
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
// Column height tuned to the real Anglepoise/Luxo proportion ~70% of the
// lower-arm length. A stubby column reads as legs holding up a giant
// overhanging arm.
const COLUMN_H     = 140;
const COLUMN_TOP_Z = BASE_H + COLUMN_H;   // 154 mm — shoulder anchor lives here

// Beam arm cross-section.
const ARM_W = 14;   // Y dimension
const ARM_T = 18;   // Z dimension
const L_LOWER = 200;
const L_UPPER = 170;

// Spring geometry — placeholder until the kernel-level `spring()` primitive
// lands; a slim shaft with bolder end-cap nubs reads as a mechanical element
// along each arm without the tangled-helix mesh artefacts a sweep would
// produce. The wire and cap radii are sized to be visible at the renderer's
// typical hero-pose framing — a thinner shaft dissolves into background.
const SPRING_WIRE_R   = 2.5;
const SPRING_COIL_R   = 11;
const SPRING_LEN      = 32;

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
// Helpers
// ============================================================================

// Tension spring (decorative) — a slim cylinder along part-local +X with
// two end-cap spheres of radius ~SPRING_COIL_R/2 so the silhouette hints
// at the coiled diameter. Until kernel-level `spring()` is exposed, this
// placeholder reads as "a mechanical element between the two anchors"
// without polluting the lamp with a tangled helical sweep.
function makeSpring(length: number = SPRING_LEN) {
  const shaft = cylinder(length, SPRING_WIRE_R, 24)
    .rotate([0, 1, 0], 90)              // axis Z → X
    .translate(length / 2, 0, 0);
  const endCapL = sphere(SPRING_COIL_R * 0.55).translate(0, 0, 0);
  const endCapR = sphere(SPRING_COIL_R * 0.55).translate(length, 0, 0);
  return shaft.union(endCapL).union(endCapR).material(mSpring);
}

// ============================================================================
// Base body (pre-joint) — cast disc + felt pad + bolt-circle + full column
// rising to the shoulder anchor. The shoulder clevis joint will union its
// fork + pin into this body and drill the through-hole through the resulting
// column-top + fork stack. `joint.clevis(..., liftPivot: true)` automatically
// lifts the pivot above COLUMN_TOP_Z by `knuckleR · max(|sin|) + 1 mm` and
// adds two posts connecting the lifted pivot back down to the column top.
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

const baseColumn = cylinder(COLUMN_H, COLUMN_R, 48)
  .translate(0, 0, BASE_H)
  .material(mCast);

const baseBodyRaw = baseDisc.union(feltPad).union(bolts).union(baseColumn);

// ============================================================================
// Lower-arm body (pre-joint) — a cream-painted rectangular beam authored in
// the lower-arm's part-local frame (origin at the shoulder pivot). The beam
// runs from x = beamClear (clearing the shoulder pivot's tongue swing) to
// x = L_LOWER - beamClear (clearing the elbow pivot's tongue swing). The
// shoulder clevis will union its tongue at x=0; the elbow clevis will union
// its fork at x = L_LOWER.
// ============================================================================

// Conservative clearance so the BEAM corner can't dip below the pivot at
// the rotation extremes: beam diagonal half-extent + a knuckle radius.
const beamClear = clevisStyle.knuckleR + ARM_T / 2 + 2;

const LOWER_BEAM_LEN = L_LOWER - 2 * beamClear;
const lowerBeam = box(LOWER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_LOWER / 2, 0, 0)
  .material(mArm);

// ============================================================================
// Upper-arm body (pre-joint) — same pattern as the lower arm.
// ============================================================================

const UPPER_BEAM_LEN = L_UPPER - 2 * beamClear;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2, 0, 0)
  .material(mArm);

// ============================================================================
// Lamp-head body (pre-joint) — part-local origin = wrist pivot. A short
// narrow neck cylinder bridges the wrist tongue to the shade; the shade is
// a hollow truncated cone with a black porcelain socket and an incandescent
// glass bulb visible at the mouth.
// ============================================================================

// Narrow neck bridging the head's tongue knuckle to the shade's narrow end.
// The neck radius is kept slim (≤ knuckleR) so it doesn't sweep into the
// upper-arm's wrist fork plates during wrist tilt.
const HEAD_NECK_LEN = 28;
const HEAD_NECK_R = 10;
// Push the neck origin clear of the wrist tongue's swing envelope so the
// neck and shade don't interpenetrate the upper-arm beam at the wrist
// extremes. (knuckleR + a margin for the shade's small end.)
const HEAD_NECK_CLEAR = clevisStyle.knuckleR + ARM_T;
const headNeck = cylinder(HEAD_NECK_LEN, HEAD_NECK_R, 32)
  .rotate([0, 1, 0], 90)             // axis Z → axis X
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
const SHADE_ANCHOR_X = HEAD_NECK_CLEAR + HEAD_NECK_LEN - 4;   // shade narrow end seats over the neck's distal end
const shade = shadeRaw
  .rotate([0, 1, 0], 90)            // Z-axis cone → +X-axis cone
  .translate(SHADE_ANCHOR_X, 0, 0)
  .material(mBrass);

// Socket cylinder — black porcelain fixture holding the bulb. Axis = X,
// sits centred along the shade's mouth axis just past the narrow opening.
const socket = cylinder(SOCKET_LEN, SOCKET_R, 32)
  .rotate([0, 1, 0], 90)
  .translate(SHADE_ANCHOR_X + 6, 0, 0)
  .material(mSocket);

// Bulb — a glass sphere centred deep inside the shade so the rendered
// silhouette catches it from any view angle pointed at the open mouth.
const bulb = sphere(BULB_R)
  .translate(SHADE_ANCHOR_X + SOCKET_LEN + BULB_R * 0.65, 0, 0)
  .material(mBulb);

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb);

// ============================================================================
// JOINT 1 — shoulder (base ↔ lower-arm), revolute about Y at the column
// top. `joint.clevis` lifts the pivot above COLUMN_TOP_Z by the max
// rotated-tongue reach and unions the fork + pin (parent side) and the
// tongue (child side) into the existing body shapes; the through-hole is
// drilled in one pass through both knuckles AFTER the union.
// ============================================================================

const shoulder = joint.clevis({
  parentBody: baseBodyRaw,
  childBody: lowerBeam,
  axis: [0, -1, 0],
  pivotParent: [0, 0, COLUMN_TOP_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: [-10, 110],
  // `liftPivot: true` (default) lifts the pivot up by ~knuckleR·sin(110°)+1
  // mm so the tongue's swing arc clears the column top. The primitive
  // adds two posts on either side of the tongue connecting the lifted
  // pivot back down to the parent body — the "mounting flange" pattern.
  style: clevisStyle,
});

// ============================================================================
// JOINT 2 — elbow (lower-arm ↔ upper-arm), revolute about Y at the lower-arm
// tip. The lower-arm body already received the shoulder tongue via
// `joint.clevis` above (`shoulder.childGeometry`); we now layer the elbow
// fork onto that running geometry.
// ============================================================================

const elbow = joint.clevis({
  parentBody: shoulder.childGeometry, // lower-arm body so far (beam + shoulder tongue/drill)
  childBody: upperBeam,
  axis: [0, -1, 0],
  pivotParent: [L_LOWER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-150, -30],
  // Elbow limits don't cross ±90°: max|sin| ≈ 0.5, so the auto-lift is
  // ~8 mm — keeps the tongue's swept arc above the beam's tip face.
  style: clevisStyle,
});

// ============================================================================
// JOINT 3 — wrist (upper-arm ↔ lamp-head), revolute about Y at the
// upper-arm tip. Same composition as the elbow.
// ============================================================================

const wrist = joint.clevis({
  parentBody: elbow.childGeometry, // upper-arm body so far (beam + elbow tongue/drill)
  childBody: headBodyRaw,
  axis: [0, -1, 0],
  pivotParent: [L_UPPER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-90, 0],
  style: clevisStyle,
});

// ============================================================================
// Register the assembly parts with their FINAL post-clevis geometry and the
// connectors returned by `joint.clevis(...)`.
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

// ============================================================================
// SPRING PARTS — decorative tension springs fastened to their parent arms.
// Each spring is a separate part with a `fastened` mate, NOT a child of the
// arm body. Springs are intra-part design contacts that intersect their
// parent arm's geometry at the mount face — those overlaps are silenced via
// `ignore[]` paired with the `fastened` mate (the G3 "Mechanism delivery"
// rule forbids ignores only on REVOLUTE/PRISMATIC joint pairs).
// ============================================================================

// Lower-arm spring (shoulder–elbow), mounted along the UNDERSIDE of the
// lower-arm beam, parallel to the beam's long axis.
const SPRING_MOUNT_X_LOWER = beamClear + 6;
const SPRING_MOUNT_Z_LOWER = -ARM_T / 2 - SPRING_COIL_R + SPRING_WIRE_R + 1.5;
const lowerSpringShape = makeSpring(SPRING_LEN)
  .translate(SPRING_MOUNT_X_LOWER, 0, SPRING_MOUNT_Z_LOWER);
const lowerSpringPart = arm.part('lower-spring', lowerSpringShape);
lowerSpringPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
lowerArmPart.connector('lowerSpringMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

// Upper-arm spring (elbow–wrist), mounted along the TOP of the upper-arm
// beam (visual contrast with the lower-arm's underside spring).
const SPRING_MOUNT_X_UPPER = beamClear + 6;
const SPRING_MOUNT_Z_UPPER = ARM_T / 2 + SPRING_COIL_R - SPRING_WIRE_R - 1.5;
const upperSpringShape = makeSpring(SPRING_LEN)
  .translate(SPRING_MOUNT_X_UPPER, 0, SPRING_MOUNT_Z_UPPER);
const upperSpringPart = arm.part('upper-spring', upperSpringShape);
upperSpringPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
upperArmPart.connector('upperSpringMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

// Wrist spring — shorter, mounted along the TOP of the head's neck just
// behind the shade collar. Reads as the small tension spring that keeps the
// shade from drooping under its own weight.
const WRIST_SPRING_LEN = SPRING_LEN * 0.7;
const WRIST_SPRING_MOUNT_X = HEAD_NECK_CLEAR - HEAD_NECK_LEN / 2;
const WRIST_SPRING_MOUNT_Z = HEAD_NECK_R + SPRING_COIL_R - SPRING_WIRE_R - 1.5;
const wristSpringShape = makeSpring(WRIST_SPRING_LEN)
  .translate(WRIST_SPRING_MOUNT_X, 0, WRIST_SPRING_MOUNT_Z);
const wristSpringPart = arm.part('wrist-spring', wristSpringShape);
wristSpringPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
headPart.connector('wristSpringMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

// Quiet the linter on the unused part-handle references — they're captured
// in the assembly via the .part(...) chain above.
void basePart;
void lowerArmPart;
void upperArmPart;
void headPart;
void lowerSpringPart;
void upperSpringPart;
void wristSpringPart;

// ============================================================================
// MATES — revolute at each clevis (bound by reference to the connector specs
// returned by joint.clevis), and fastened at each spring's mount. No
// coordinate triples appear in the mate decls.
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

// Spring mates — fastened in place against their parent arm. These pair
// with `ignore[]` entries below for the intra-part design contacts.
arm.mate('lower-spring-mount', 'lower-arm.lowerSpringMount', 'lower-spring.mount', 'fastened');
arm.mate('upper-spring-mount', 'upper-arm.upperSpringMount', 'upper-spring.mount', 'fastened');
arm.mate('wrist-spring-mount', 'lamp-head.wristSpringMount', 'wrist-spring.mount', 'fastened');

// ============================================================================
// SOLVE + VALIDATE
// ============================================================================
// Every revolute joint is built by `joint.clevis(...)`. The through-hole at
// each pivot is drilled in a SINGLE subtract AFTER the fork/tongue are
// unioned with their respective body — guaranteeing the hole is co-located
// in every solid the pin passes through. The pin caps sit flush against the
// outer fork faces.
//
// `ignore[]` is used ONLY for the three intra-part spring contacts (each
// paired with a `fastened` mate). The G3 "Mechanism delivery — non-bypassable"
// rule forbids ignores on REVOLUTE / PRISMATIC joint-pairs; intra-part design
// contacts (a spring "bolted" to a beam) remain a legitimate use of `ignore`.
return arm.solvedModel({}, {
  ignore: [
    ['lower-arm', 'lower-spring'],
    ['upper-arm', 'upper-spring'],
    ['lamp-head', 'wrist-spring'],
  ],
});
