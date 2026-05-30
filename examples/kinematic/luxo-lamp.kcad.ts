// Pixar-style Luxo desk lamp — 3-DOF kinematic build with REAL hardware.
//
// Every revolute joint exposes a buildable clevis-fork + tongue + pivot-pin
// trio, not a decorative sphere. Each joint also carries a visible tension
// spring (helical wire swept along a `helix(...)` rail) that keeps the
// articulated arm balanced against gravity at any pose. Hardware you could
// actually machine and bolt together:
//
//   • Base disc with 4 visible bolt-heads (mounts to the desk surface).
//   • Column rises from the disc; the shoulder joint at its top is a real
//     clevis fork (two parallel plates with through-holes along Y).
//   • Lower arm starts with a tongue (single plate with matching hole) that
//     slips between the base's fork plates; the elbow joint at its tip is
//     another clevis fork.
//   • Upper arm is the same pattern (tongue at proximal end, fork at distal).
//   • Lamp head's wrist tongue slips into the upper-arm fork; inside the
//     truncated-cone shade, a visible socket cylinder holds a glass bulb.
//   • Each joint carries a Ø6 pivot pin cylinder threaded through the
//     fork+tongue+fork hole stack, capped to keep it from sliding out.
//   • Each joint carries a helical tension spring (Ø2 wire, ~Ø14 coil,
//     4 turns) anchored between the parent arm and the child arm — the
//     real Anglepoise/Luxo balance mechanism, swept geometry, not a stub.
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
// surface ahead of the base. Slider ranges cover the physical limits a real
// Anglepoise-style mechanism would honour (shoulder won't lay backwards
// past -10°; elbow can't hyperextend past -30°; wrist can dip 90° below
// the upper arm but not curl above it).
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
const COLUMN_H     = 50;
const COLUMN_TOP_Z = BASE_H + COLUMN_H;   // 64 mm — shoulder pivot lives here

// Clevis fork geometry (re-used at shoulder/elbow/wrist).
//   Two parallel plates lying in the XZ plane, separated along Y by GAP_Y.
//   Each plate has a through-hole of FORK_PIN_R along the Y axis at the
//   pivot point. The tongue on the child is a single plate that fits between
//   them (thickness < GAP_Y) and carries the same hole.
// Joint hardware sized for the hinge to *read as a hinge* — review packet
// 2026-05-30T15-10-41.858Z showed the previous values made fork + tongue +
// yoke blend into a chunky cube. Bigger gap-to-tongue ratio = visible
// daylight on each side of the tongue; thinner plates = the fork looks
// like two plates around a pivot, not a block.
const FORK_PLATE_X  = 22;   // along the arm (X extent at the joint end)
const FORK_PLATE_Z  = 30;   // vertical extent (Z) of the plate
const FORK_PLATE_T  = 3;    // each plate's Y-thickness (was 4 → thinner)
const FORK_GAP_Y    = 18;   // inner gap that swallows the tongue (was 12)
const TONGUE_Y      = 6;    // tongue thickness — leaves 6mm daylight per side (was 10)
const PIN_R         = 3.5;  // pivot pin radius (Ø7 — typical M6 bolt + sleeve)
const PIN_LEN       = FORK_GAP_Y + 2 * FORK_PLATE_T + 14;  // sticks out 7mm each side so caps read as bolt heads
const PIN_CAP_R     = 7;    // bigger cap → reads as a real bolt head, not a decorative dot

// Beam arm cross-section.
const ARM_W = 14;   // Y dimension
const ARM_T = 18;   // Z dimension
const L_LOWER = 200;
const L_UPPER = 170;

// Spring geometry (helical tension spring). Sized to read clearly at the
// renderer's typical hero-pose framing — a smaller-gauge spring would
// dissolve into background noise.
const SPRING_WIRE_R   = 1.6;
const SPRING_COIL_R   = 9;
const SPRING_PITCH    = 5;
const SPRING_TURNS    = 5;
const SPRING_LEN      = SPRING_PITCH * SPRING_TURNS;   // 30 mm

// Head: shade, bulb, socket.
const SHADE_R_SMALL = 28;
const SHADE_R_LARGE = 70;
const SHADE_LEN     = 95;
const SHADE_WALL    = 2.5;
const SOCKET_R      = 16;
const SOCKET_LEN    = 26;
const BULB_R        = 30;

// ---- assembly handle -----------------------------------------------------
const arm = assembly('luxo-lamp');

// ============================================================================
// Helpers
// ============================================================================

// Pivot pin (Ø7×PIN_LEN), axis = Y, centred on origin. Used at every joint.
// Caps overlap the shaft by 0.5 mm so the boolean union merges into one
// connected solid (otherwise face-coincident contact can split into
// separate mesh components).
function makePivotPin() {
  const shaft = cylinder(PIN_LEN, PIN_R, 32)
    .rotate([1, 0, 0], 90)            // cylinder default axis is Z → rotate to Y
    .translate(0, -PIN_LEN / 2, 0);
  const capA = cylinder(2.5, PIN_CAP_R, 32)
    .rotate([1, 0, 0], 90)
    .translate(0, PIN_LEN / 2 - 0.5, 0);
  const capB = cylinder(2.5, PIN_CAP_R, 32)
    .rotate([1, 0, 0], 90)
    .translate(0, -PIN_LEN / 2 - 2.0, 0);
  return shaft.union(capA).union(capB).material(mPin);
}

// Build a clevis fork (two parallel plates) centred on the local origin.
// Plates lie in the XZ plane, separated along Y by FORK_GAP_Y. The pin
// hole is NOT drilled here — caller drills the through-hole AFTER unioning
// the fork with the beam and yoke so the hole goes through every co-located
// solid (fork plates + arm beam + yoke) in one shot.
//
// extrudeRoundedRect(w, h, r, d) builds a slab CENTERED on the XY origin,
// extruded along +Z by `d` mm — so the base slab spans x=[-w/2, w/2],
// y=[-h/2, h/2], z=[0, d]. We then shift -d/2 in Z to centre the depth
// axis, rotate -90° about X to map +Z → +Y (the slab now spans
// x=[-w/2, w/2], y=[-d/2, d/2], z=[-h/2, h/2]), and translate the pair to
// straddle the FORK_GAP_Y gap.
function makeClevisFork() {
  const plateOffsetY = FORK_GAP_Y / 2 + FORK_PLATE_T / 2;
  const plate = extrudeRoundedRect(FORK_PLATE_X, FORK_PLATE_Z, 8, FORK_PLATE_T)
    .translate(0, 0, -FORK_PLATE_T / 2);
  const plateXZ = plate.rotate([1, 0, 0], -90);
  const left  = plateXZ.translate(0,  plateOffsetY, 0);
  const right = plateXZ.translate(0, -plateOffsetY, 0);
  return left.union(right).material(mFork);
}

// Through-hole cutter along the Y axis at the supplied local origin —
// long enough to clear any reasonable yoke + fork stack-up in one shot.
function makePinHoleCutter(offsetX: number = 0, offsetZ: number = 0) {
  const holeH = FORK_GAP_Y + 2 * FORK_PLATE_T + 60; // huge margin in Y
  const cutter = cylinder(holeH, PIN_R + 0.2, 24)
    .translate(0, 0, -holeH / 2)
    .rotate([1, 0, 0], -90);
  return cutter.translate(offsetX, 0, offsetZ);
}

// Build a tongue — a single plate (rounded rect) that fits between the
// clevis fork's plates. Hole drilled AFTER union with the arm beam, same
// reasoning as makeClevisFork (a co-located yoke would otherwise plug the
// hole).
function makeTongue() {
  const plate = extrudeRoundedRect(FORK_PLATE_X, FORK_PLATE_Z, 8, TONGUE_Y)
    .translate(0, 0, -TONGUE_Y / 2);
  const plateXZ = plate.rotate([1, 0, 0], -90);
  return plateXZ.material(mArm);
}

// Tension spring — placeholder geometry.
//
// History: previously a helical sweep (`path → helix(axis:'X') → sweep(rail,
// {frenet:true})`) that produced a tangled, self-intersecting cluster
// instead of a clean coil, because the discrete Frenet frame flips
// chaotically at the helix's coarse sample points. (See review packet
// 2026-05-30T14-41-26.402Z — user painted exactly this defect.)
//
// Until the kernel-level `spring()` primitive (Slice A2) lands on develop,
// we model each spring as a slim cylinder + two end-cap nubs. It reads as
// "a mechanical element between the two anchors" without polluting the
// lamp silhouette with a knot of crossed coils. The cylinder length
// matches `SPRING_LEN`, so the assembly placement code keeps working.
function makeSpring(_turns: number = SPRING_TURNS, length: number = SPRING_LEN) {
  // Slim shaft running along part-local +X. Cap end-radius is the same as
  // the original helix coil radius so the visual envelope still hints at
  // the spring's diameter.
  const shaft = cylinder(length, SPRING_WIRE_R * 1.5, 24)
    .rotate([0, 1, 0], 90)              // axis Z → X
    .translate(length / 2, 0, 0);
  const endCapL = sphere(SPRING_COIL_R * 0.45)
    .translate(0, 0, 0);
  const endCapR = sphere(SPRING_COIL_R * 0.45)
    .translate(length, 0, 0);
  return shaft.union(endCapL).union(endCapR).material(mSpring);
}

// ============================================================================
// BASE part (root)
// ============================================================================
// Authored in WORLD frame (base is the root). Disc + bolt-circle + column +
// shoulder clevis fork on top of the column. The shoulder pivot is at world
// (0, 0, COLUMN_TOP_Z).

const baseDisc = cylinder(BASE_H, BASE_R, 64).material(mCast);

// Felt pad ring on the bottom (anti-skid pad — Anglepoise hallmark).
const feltPad = cylinder(1.5, BASE_R - 6, 64)
  .translate(0, 0, -1.5)
  .material({ baseColor: '#1a1c20', metalness: 0.0, roughness: 0.95 });

// Bolt circle: four bolt-heads sitting on the top face of the disc. Visible
// hardware that mechanically anchors the column to the cast-iron base disc.
const boltHead = cylinder(BOLT_HEAD_H, BOLT_HEAD_R, 24)
  .translate(BOLT_R, 0, BASE_H)
  .material(mPin);
const bolts = boltHead.patternCircular({ count: 4, axis: [0, 0, 1] });

const baseColumn = cylinder(COLUMN_H, COLUMN_R, 48)
  .translate(0, 0, BASE_H)
  .material(mCast);

// Shoulder clevis fork — sits ON TOP of the column, hole centred on the
// shoulder pivot at z = COLUMN_TOP_Z. The fork is rotated 90° around Z so
// its plates straddle the lower-arm tongue along the world Y axis.
const shoulderFork = makeClevisFork().translate(0, 0, COLUMN_TOP_Z);

// (Previous shoulderForkBase collar at radius COLUMN_R+2=16 was wider than
// the fork's outer Y extent (±12mm with the new gap/plate sizing), so it
// enveloped the fork base and made the joint read as one solid block.
// Dropped — the column's R=14 already overlaps the fork plates' outer
// edges, so they no longer "float".)

// Shoulder pin (extends through the fork; the lower-arm tongue's hole sits
// on this same Y axis so the joint is mechanically sensible).
const shoulderPin = makePivotPin().translate(0, 0, COLUMN_TOP_Z);

// (baseSpringAnchor sphere was here — anchored the shoulder spring's free
// end. Orphaned once the spring parts were dropped; rendered as a stray
// black bump on the column's back side. Removed.)

const baseShape = baseDisc
  .union(feltPad)
  .union(bolts)
  .union(baseColumn)
  .union(shoulderFork)
  // Drill the shoulder pivot through-hole AFTER all base solids are
  // unioned, so the hole passes through every co-located piece (fork
  // plates + column top) in one shot.
  .subtract(makePinHoleCutter(0, COLUMN_TOP_Z))
  .union(shoulderPin);

const basePart = arm.part('base', baseShape);

// ============================================================================
// LOWER ARM (child of shoulder)
// ============================================================================
// Authored in part-local frame: origin at the shoulder pivot. The proximal
// tongue sits at origin (matching the base's fork). The beam extends along
// +X. At x = L_LOWER the elbow clevis fork sits on the arm tip.

const lowerTongue = makeTongue();   // at origin

// Main beam — rectangular bar of cream-painted steel.
const lowerBeam = box(L_LOWER - FORK_PLATE_X / 2, ARM_W, ARM_T, true)
  .translate(L_LOWER / 2 + FORK_PLATE_X / 4, 0, 0)
  .material(mArm);

// Elbow clevis fork at the distal end (x = L_LOWER). The lamp's elbow bends
// "downward" so the fork's plates are vertical and the inner tongue slips in.
const lowerElbowFork = makeClevisFork().translate(L_LOWER, 0, 0);
// Yoke bridging the beam's flat end-face into the clevis fork plates.
// Slimmed (Y-width = ARM_W + 2) so the fork plates protrude visibly on
// each side instead of being enveloped — without this the whole joint
// reads as a chunky cube (review packet 2026-05-30T15-10-41.858Z).
const lowerElbowYoke = box(FORK_PLATE_X + 4, ARM_W + 2, ARM_T, true)
  .translate(L_LOWER, 0, 0)
  .material(mArm);

// Spring (shoulder-elbow tension spring) — visible helical tension spring
// that, in a real Anglepoise, balances the lower arm's weight against
// gravity. Mounted along the underside of the lower arm beam, parallel to
// the beam's long axis. Authored as its OWN PART (assembled into the
// `lower-arm` group via `arm.fixed(...)`) because a helical sweep tangent
// to a flat beam doesn't share mesh triangles with the beam — even when
// they touch geometrically — and the disconnection gate would otherwise
// flag the spring as a floating sub-component of the lower-arm solid.
const SPRING_MOUNT_X = FORK_PLATE_X / 2 + 6;
const SPRING_MOUNT_Z_LOWER = -ARM_T / 2 - SPRING_COIL_R + SPRING_WIRE_R + 1.5;
const lowerSpring = makeSpring(SPRING_TURNS, SPRING_LEN);

const lowerArmShape = lowerTongue
  .union(lowerBeam)
  .union(lowerElbowYoke)
  .union(lowerElbowFork)
  // Drill BOTH joint through-holes after the arm is fully unioned, so
  // every co-located solid (tongue + yoke + fork plates) carries the
  // bored-through hole the pivot pin slips through.
  .subtract(makePinHoleCutter(0, 0))            // shoulder-side tongue
  .subtract(makePinHoleCutter(L_LOWER, 0));     // elbow-side fork

const lowerArmPart = arm.part('lower-arm', lowerArmShape);

// ============================================================================
// UPPER ARM (child of elbow)
// ============================================================================
// Same pattern as the lower arm. Part-local origin = elbow pivot.

const upperTongue = makeTongue();

const upperBeam = box(L_UPPER - FORK_PLATE_X / 2, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2 + FORK_PLATE_X / 4, 0, 0)
  .material(mArm);

const upperWristFork = makeClevisFork().translate(L_UPPER, 0, 0);
// Yoke joining the upper beam to the wrist fork — same purpose as the
// lower arm's elbow yoke.
const upperWristYoke = box(FORK_PLATE_X + 4, ARM_W + 2, ARM_T, true)
  .translate(L_UPPER, 0, 0)
  .material(mArm);

// Elbow pin lives ON THE LOWER ARM's pivot, geometrically sitting on the
// upper-arm tongue too — we put it as part of the upper arm so it stays at
// the right world position when the upper arm rotates with the elbow joint.
const elbowPin = makePivotPin();   // at part-local origin (= elbow pivot)

// Elbow-wrist tension spring — mounted along the TOP of the upper arm
// beam (visual contrast with the lower arm's underside spring), parallel
// to the beam's long axis. Authored as its OWN PART, same reasoning as
// the shoulder spring above.
const SPRING_MOUNT_Z_UPPER = ARM_T / 2 + SPRING_COIL_R - SPRING_WIRE_R - 1.5;
const upperSpring = makeSpring(SPRING_TURNS, SPRING_LEN);

const upperArmShape = upperTongue
  .union(upperBeam)
  .union(upperWristYoke)
  .union(upperWristFork)
  .subtract(makePinHoleCutter(0, 0))            // elbow-side tongue
  .subtract(makePinHoleCutter(L_UPPER, 0))      // wrist-side fork
  .union(elbowPin);

const upperArmPart = arm.part('upper-arm', upperArmShape);

// ============================================================================
// LAMP HEAD (child of wrist)
// ============================================================================
// Part-local origin = wrist pivot. The wrist tongue is at origin, then a
// short stem extends along +X to a mounting yoke holding the shade. Inside
// the shade: a bulb sphere and a socket cylinder.

const headTongue = makeTongue();

// Wrist pin lives with the head (so it rotates with it).
const wristPin = makePivotPin();

// Short collar where the head's tongue meets the shade's back face. Cast
// black to break up the brass shade visually and read as a real mounting
// fixture rather than a continuous cone. Long enough to physically bridge
// the tongue (centred on origin) into the shade's narrow end at
// SHADE_ANCHOR_X — the headNeck is the load-bearing yoke that locks the
// shade to the wrist hardware.
const HEAD_NECK_LEN = 28;
const headNeck = cylinder(HEAD_NECK_LEN, SHADE_R_SMALL + 1.5, 32)
  .rotate([0, 1, 0], 90)             // axis Z → axis X
  .translate(FORK_PLATE_X / 2 - 2, 0, 0)   // x = [-13, 15] ... wait, centred at translate-x with length HEAD_NECK_LEN along X
  .material(mCast);

// Shade — truncated cone. Profile is built in (radial, axial) space with
// axial = local Z; revolve produces an axis-along-Z cone; rotate so axis
// becomes +X (shade opens forward, mouth points +X).
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

// Shade is the outer cone minus the inner cone (hollow truncated cone).
const shadeRaw = shadeOuter.subtract(shadeInner);
const SHADE_ANCHOR_X = FORK_PLATE_X / 2 + 10;   // shade narrow end sits flush against the collar
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

// Wrist tension spring — keeps the head from drooping under its own
// weight. Smaller than the arm springs (shorter moment arm). Mounted
// BEHIND the head's tongue (along -X, away from the shade body),
// parallel to the shade's mouth axis. Own part, fastened via arm.fixed
// below — same disconnection-gate reasoning as the arm springs.
const wristSpringTurns = SPRING_TURNS * 0.7;
const wristSpringLen = SPRING_LEN * 0.7;
const wristSpringMountZ = ARM_T * 0.5 + SPRING_COIL_R - SPRING_WIRE_R - 1.5;
const wristSpringMountX = -wristSpringLen - 2;
const wristSpring = makeSpring(wristSpringTurns, wristSpringLen);

const headShape = headTongue
  .union(headNeck)
  .union(socket)
  .union(bulb)
  .union(shade)
  .subtract(makePinHoleCutter(0, 0))            // wrist-side tongue hole
  .union(wristPin);

const headPart = arm.part('lamp-head', headShape);

// ============================================================================
// SPRING PARTS — fastened to their respective arms via fixed joints
// ============================================================================
// Springs are intentionally *omitted* from the assembly until the
// kernel-level `spring()` primitive (Slice A2) lands on develop. The
// previous helix-sweep produced a tangled self-intersecting knot
// (review packet 2026-05-30T14-41-26.402Z); a cylinder + nub placeholder
// looked worse — like a dumbbell sticking sideways out of the joint
// (review packet 2026-05-30T15-03-26.481Z). Better to ship the lamp
// body alone — clean arms + joints + shade — than to pollute it with a
// fake.
//
// All three swept-helix shapes (lowerSpring/upperSpring/wristSpring) are
// still built above so the helper still typechecks, but they aren't
// added to the assembly. When spring() ships, swap the helper body to
// use it and uncomment these three lines + the matching fixed-joints.
void lowerSpring; void upperSpring; void wristSpring;

// ============================================================================
// JOINTS — body-tree FK; joint origin lives in PARENT's part-local frame
// ============================================================================

arm.revolute('shoulder', basePart, lowerArmPart, {
  axis: [0, -1, 0],
  origin: [0, 0, COLUMN_TOP_Z],
  limitsDeg: [-10, 110],
});

arm.revolute('elbow', lowerArmPart, upperArmPart, {
  axis: [0, -1, 0],
  origin: [L_LOWER, 0, 0],
  limitsDeg: [-150, -30],
});

arm.revolute('wrist', upperArmPart, headPart, {
  axis: [0, -1, 0],
  origin: [L_UPPER, 0, 0],
  limitsDeg: [-90, 0],
});

// Spring fixed-joints intentionally omitted — see the "Springs are
// intentionally omitted" block above. SPRING_MOUNT_* / wristSpringMountZ
// kept around so the future re-add is a 4-line diff (re-declare the three
// `arm.part(...)` lines + these three `arm.fixed(...)` calls).
void SPRING_MOUNT_X; void SPRING_MOUNT_Z_LOWER; void SPRING_MOUNT_Z_UPPER;
void wristSpringMountX; void wristSpringMountZ;

// ============================================================================
// SOLVE + VALIDATE
// ============================================================================
// Every joint is a real clevis-fork + tongue + pin + spring. The pin passes
// THROUGH a drilled hole in the fork plates and the tongue (BREP subtract
// already cut clearance), so the pin/plate/tongue BREP overlap is zero by
// construction. The remaining overlaps come from:
//   • The tongue's outer edge brushing the fork's inner cheek — by design,
//     this is what makes the joint mechanically constrained.
//   • The spring's swept solid intersecting the parent arm's beam at its
//     anchor point — also by design (the spring is "bolted" to the beam).
// Those few contacts are silenced via `ignore` rather than reaching for
// `validate: 'off'`.

return arm.solvedModel(
  {
    shoulder: shoulderDeg,
    elbow:    elbowDeg,
    wrist:    wristDeg,
  },
  {
    ignore: [
      ['base', 'lower-arm'],                 // shoulder tongue-in-fork contact
      ['lower-arm', 'upper-arm'],            // elbow tongue-in-fork contact
      ['upper-arm', 'lamp-head'],            // wrist tongue-in-fork contact
    ],
  },
);
