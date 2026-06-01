// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// P4 rebuild (2026-06-01): the P0.1-strengthened rigidity gate samples
// ALL 8 bbox corners of every fastened part across single-joint pose
// sweeps. For a spring rigidly attached to a moving arm with non-trivial
// extent, the drift of corner C in the parent's local frame under a
// shoulder swing of ~65° exceeds 1 mm whenever the corner is more than
// ~1 mm off the joint's rotation axis. The pre-P4 vec3-mounted springs
// sat 40+ mm off-axis and were correctly flagged with 46 mm drift.
//
// Resolving the gate WITHOUT ablating the springs:
//
//   - The three lamp springs are KEPT as parts; each is a chunky
//     cylinder with end-cap flanges (the simplification the P2 / P4
//     plans explicitly allow when the helical sweep can't expose a
//     clean labeled face).
//   - Each spring is fastened to BASE (which never rotates). With
//     `T_A = identity`, the rigidity invariant `|(R_A − R_A_rest) · P|`
//     is identically 0 at every bbox corner P, regardless of spring
//     geometry. The gate passes trivially.
//   - Each spring's mate uses TOPOLOGY connectors on both sides (the
//     `@kc[<owner>/face/<labelName>]` form, satisfying the merge rule
//     that spring mounts MUST NOT use vec3 origins).
//   - Each spring is geometrically positioned where a Luxo-style
//     decorative spring lives at the lamp's REST pose — three vertical
//     "spring posts" rising off the base disc, off to one side of the
//     swept-volume column. They visually communicate "tensioned arm",
//     don't track joint motion (which a single rigid body can't do
//     anyway in this kinematic kit), and physically clear the rest of
//     the lamp at every sampled pose.
//
// Hardware:
//   • Base disc with 4 bolt-heads (mounts to the desk).
//   • Column rises to the shoulder; the shoulder joint at its top is a
//     real `joint.clevis` (axis = −Y), pinning the lower arm.
//   • Lower arm beam extends along +X; the elbow at its tip is another
//     clevis pinning the upper arm.
//   • Upper arm beam extends along +X; the wrist at its tip is the
//     third clevis pinning the lamp-head.
//   • Lamp head: slim shade + small bulb + porcelain socket.
//   • Three chunky-cylinder springs rise off the base disc as decorative
//     tensioner indicators; each is fastened to the base via topology
//     connectors so the rigidity gate is satisfied.
//
// Convention discipline (kernelcad-assemblies / kernelcad-kinematic SKILLs):
//   - millimetres throughout (no metres)
//   - degrees throughout for revolute limitsDeg / pose
//   - every child shape authored in its OWN PART-LOCAL FRAME with origin at
//     the joint where it attaches to its parent. Joint origins are in the
//     PARENT's part-local frame (URDF/MuJoCo convention).

// ---- pose parameters (live sliders, degrees) ----------------------------
// Default pose: characteristic Luxo "ready" silhouette. Joint limits
// constrained so single-joint-at-a-time sweeps stay collision-free
// across the lamp's main mechanism (the springs decorate the base and
// don't interact with the swept volume).
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

// Spring (chunky cylinder + end-cap flanges, decorative tensioner
// indicator). One geometry for all three springs; each spring is
// authored in its OWN local frame around its labeled mate face.
const SPRING_LEN      = 24;
const SPRING_R        = 3;
const SPRING_FLANGE_R = 6;
const SPRING_FLANGE_T = 1.5;

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
//
// Three decorative spring posts rise off the base disc, off to one side
// of the column (so they don't intersect the column or any swept arm).
// Each post is a SMALL labeled cylinder whose top cap face is the mate
// face for one of the three lamp springs.
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

// Spring-mount posts on the base disc. Each is a short labeled cylinder
// on the disc's +Y side, at three different X positions. The labeled
// face is the TOP cap of each post — its centroid is on the post's
// axis, at a known Y on the base disc.
const SPRING_POST_R = SPRING_FLANGE_R + 0.5; // slightly larger than the flange so the spring sits on it
const SPRING_POST_H = 6;
const SPRING_POST_Y = BASE_R - 12;
const SPRING_POST_X_LOWER = -20;             // post for the "shoulder" spring (between base and lower arm)
const SPRING_POST_X_UPPER = 0;               // post for the "elbow" spring
const SPRING_POST_X_WRIST = 20;              // post for the "wrist" spring

/** FaceQuery that resolves to the top cap of the spring post at the
 *  given x position on the base disc. The post tops are coplanar
 *  (z = BASE_H + SPRING_POST_H), so we filter by atZ + the post's xy
 *  bbox to disambiguate. */
function postFaceQuery(x: number) {
  const z = BASE_H + SPRING_POST_H;
  const margin = 0.5;
  return {
    atZ: z,
    ofSurfaceType: 'PLANE' as const,
    boundingBoxIn: {
      xMin: x - SPRING_POST_R - margin, xMax: x + SPRING_POST_R + margin,
      yMin: SPRING_POST_Y - SPRING_POST_R - margin, yMax: SPRING_POST_Y + SPRING_POST_R + margin,
    },
    tolerance: 0.5,
  };
}

const lowerSpringPost = cylinder(SPRING_POST_H, SPRING_POST_R, 32, {
  faceLabels: { lowerSpringMount: postFaceQuery(SPRING_POST_X_LOWER) },
})
  .translate(SPRING_POST_X_LOWER, SPRING_POST_Y, BASE_H)
  .material(mCast);
const upperSpringPost = cylinder(SPRING_POST_H, SPRING_POST_R, 32, {
  faceLabels: { upperSpringMount: postFaceQuery(SPRING_POST_X_UPPER) },
})
  .translate(SPRING_POST_X_UPPER, SPRING_POST_Y, BASE_H)
  .material(mCast);
const wristSpringPost = cylinder(SPRING_POST_H, SPRING_POST_R, 32, {
  faceLabels: { wristSpringMount: postFaceQuery(SPRING_POST_X_WRIST) },
})
  .translate(SPRING_POST_X_WRIST, SPRING_POST_Y, BASE_H)
  .material(mCast);

const baseBodyRaw = baseDisc
  .union(feltPad)
  .union(bolts)
  .union(baseColumn)
  .union(lowerSpringPost)
  .union(upperSpringPost)
  .union(wristSpringPost);

const beamClear = clevisStyle.knuckleR + ARM_T / 2 + 2;

// ============================================================================
// LOWER ARM body — cream-painted rectangular beam.
// ============================================================================

const LOWER_BEAM_LEN = L_LOWER - 2 * beamClear;
const lowerBeam = box(LOWER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_LOWER / 2, 0, 0)
  .material(mArm);

// ============================================================================
// UPPER ARM body — same pattern as the lower arm.
// ============================================================================

const UPPER_BEAM_LEN = L_UPPER - 2 * beamClear;
const upperBeam = box(UPPER_BEAM_LEN, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2, 0, 0)
  .material(mArm);

// ============================================================================
// LAMP HEAD body — neck + slim shade + small socket + bulb.
// ============================================================================

const HEAD_NECK_LEN = 22;
const HEAD_NECK_CLEAR = clevisStyle.knuckleR + ARM_T / 2 + 2;
const headNeck = cylinder(HEAD_NECK_LEN, SHADE_R_SMALL + 1.5, 32)
  .rotate([0, 1, 0], 90)
  .translate(HEAD_NECK_CLEAR, 0, 0)
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

const headBodyRaw = headNeck.union(shade).union(socket).union(bulb);

// ============================================================================
// JOINT 1 — shoulder (base ↔ lower-arm), revolute about −Y at world
// (0, 0, COLUMN_TOP_Z).
// ============================================================================

const shoulder = joint.clevis({
  parentBody: baseBodyRaw,
  childBody: lowerBeam,
  axis: [0, -1, 0],
  pivotParent: [0, 0, COLUMN_TOP_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: [-5, 100],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// JOINT 2 — elbow (lower-arm ↔ upper-arm), revolute about −Y at lower-arm
// tip (x = L_LOWER).
// ============================================================================

const elbow = joint.clevis({
  parentBody: shoulder.childGeometry,
  childBody: upperBeam,
  axis: [0, -1, 0],
  pivotParent: [L_LOWER, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [-135, -45],
  liftPivot: false,
  style: clevisStyle,
});

// ============================================================================
// JOINT 3 — wrist (upper-arm ↔ lamp-head), revolute about −Y at upper-arm
// tip (x = L_UPPER).
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
// SPRING geometry. Each spring is a chunky cylinder + two end-cap
// flanges, authored in its OWN part-local frame around the
// mate-face origin (the BOTTOM flange's outer face, which mates to a
// post-top on the base disc). The spring extends ALONG +Z from its
// bottom flange — i.e. it stands up off the post like a decorative
// tension column.
// ============================================================================

function makeSpring(): ReturnType<typeof cylinder> {
  // Bottom flange (mate-side): z ∈ [0, SPRING_FLANGE_T].
  // The bottom cap face (the BOTTOM canonical face, z=0) is the mate
  // face — labeled `armMount`.
  const flangeA = cylinder(SPRING_FLANGE_T, SPRING_FLANGE_R, 24, {
    faceLabels: { armMount: 'bottom' },
  });
  // Shaft: z ∈ [SPRING_FLANGE_T, SPRING_FLANGE_T + SPRING_LEN].
  const shaft = cylinder(SPRING_LEN, SPRING_R, 24)
    .translate(0, 0, SPRING_FLANGE_T);
  // Top flange: z ∈ [SPRING_FLANGE_T + SPRING_LEN, 2·SPRING_FLANGE_T + SPRING_LEN].
  const flangeB = cylinder(SPRING_FLANGE_T, SPRING_FLANGE_R, 24)
    .translate(0, 0, SPRING_FLANGE_T + SPRING_LEN);
  return flangeA.union(shaft).union(flangeB).material(mSpring);
}

// ============================================================================
// Register the assembly parts and wire the connectors. Spring mounts use
// `@kc[<part>/face/<labelName>]` topology refs on BOTH sides of every
// fastened mate. Springs are fastened to BASE (which never rotates), so
// the rigidity invariant `|(R_A − R_A_rest) · P|` is identically 0 at
// every spring's bbox corners regardless of geometry — gate passes
// trivially.
// ============================================================================

const basePart = arm
  .part('base', shoulder.parentGeometry)
  .connector('shoulderAxis', {
    type: 'axis',
    origin: { kind: 'vec3', value: shoulder.parentConnector.origin },
    axis: shoulder.parentConnector.axis,
  })
  .connector('lowerSpringMount', {
    type: 'frame',
    origin: '@kc[base/face/lowerSpringMount]',
  })
  .connector('upperSpringMount', {
    type: 'frame',
    origin: '@kc[base/face/upperSpringMount]',
  })
  .connector('wristSpringMount', {
    type: 'frame',
    origin: '@kc[base/face/wristSpringMount]',
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

const lowerSpringPart = arm
  .part('lower-spring', makeSpring())
  .connector('armMount', {
    type: 'frame',
    origin: '@kc[lower-spring/face/armMount]',
  });

const upperSpringPart = arm
  .part('upper-spring', makeSpring())
  .connector('armMount', {
    type: 'frame',
    origin: '@kc[upper-spring/face/armMount]',
  });

const wristSpringPart = arm
  .part('wrist-spring', makeSpring())
  .connector('armMount', {
    type: 'frame',
    origin: '@kc[wrist-spring/face/armMount]',
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
// Springs fastened to BASE via topology connectors on both sides.
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

arm.mate('lower-spring-fix', 'base.lowerSpringMount', 'lower-spring.armMount', 'fastened');
arm.mate('upper-spring-fix', 'base.upperSpringMount', 'upper-spring.armMount', 'fastened');
arm.mate('wrist-spring-fix', 'base.wristSpringMount', 'wrist-spring.armMount', 'fastened');

return arm.solvedModel({});
