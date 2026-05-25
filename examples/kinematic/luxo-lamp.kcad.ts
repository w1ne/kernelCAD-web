// Pixar-style Luxo desk lamp — 3-DOF kinematic build.
//
// Three revolute joints around -Y (shoulder, elbow, wrist) drive a classic
// Luxo silhouette: heavy disc base on the desk, slim arms folded over each
// other, lamp shade tilted forward and down.
//
// Each link is authored in its OWN PART-LOCAL FRAME with origin at the joint
// where the part attaches to its parent. The joint `origin` lives in the
// PARENT's part-local frame.
//
// Convention discipline (kernelcad-assemblies / kernelcad-kinematic SKILLs):
//   - axes in metres? NO — millimetres throughout
//   - rotations in radians? NO — degrees throughout (revolute limitsDeg / pose)
//   - child-shape author position does NOT include parent joint offset; that
//     comes from `arm.revolute({ origin })`.

// ---- pose parameters (live sliders, degrees) ----------------------------
const shoulderDeg = param('shoulderDeg', 70,   { min: -10, max: 110 });
const elbowDeg    = param('elbowDeg',   -120,  { min: -150, max: -30 });
const wristDeg    = param('wristDeg',   -40,   { min: -90,  max:   0 });

// ---- geometry ------------------------------------------------------------
// Base disc (sits on z=0, generous radius so the lamp doesn't tip visually).
const BASE_R   = 70;
const BASE_H   = 14;

// Neck riser (lifts the shoulder pivot above the disc).
const NECK_R   = 14;
const NECK_H   = 18;

// Shoulder pivot Z in world frame.
const SHOULDER_Z = BASE_H + NECK_H;       // 32 mm

// Lower arm.
const L_LOWER  = 200;
const ARM_W    = 12;                       // Y dimension (cross-arm width)
const ARM_T    = 10;                       // Z dimension (arm thickness)

// Upper arm.
const L_UPPER  = 170;

// Lamp shade (truncated cone): narrow end at the wrist, wide end is the
// opening. Authored as a revolved profile around the local Z axis, then
// rotated so the shade's mouth points along +X in the wrist-local frame.
const SHADE_R_SMALL = 22;
const SHADE_R_LARGE = 55;
const SHADE_LEN     = 70;
const SHADE_T       = 2;   // shell thickness for the shade rim

// Knuckle sphere radius (visual joint covers).
const KNUCKLE_R = 12;

// ---- BASE part (root, identity in world) --------------------------------
// Disc base + neck riser, both authored stacked on the desk.
const arm = assembly('luxo-lamp');

const baseDisc = cylinder(BASE_H, BASE_R, 64)
  .material({
    baseColor: '#c8cdd3',     // light brushed-steel — visible on dark viewport
    metalness: 0.4,
    roughness: 0.55,
  });

const neckRiser = cylinder(NECK_H, NECK_R, 48)
  .translate(0, 0, BASE_H)
  .material({
    baseColor: '#b8bdc3',
    metalness: 0.4,
    roughness: 0.55,
  });

// Shoulder knuckle sphere — sits at the shoulder pivot in world frame.
const shoulderKnuckle = sphere(KNUCKLE_R)
  .translate(0, 0, SHOULDER_Z)
  .material({
    baseColor: '#3a4250',
    metalness: 0.9,
    roughness: 0.35,
  });

const baseShape = baseDisc.union(neckRiser).union(shoulderKnuckle);
const basePart = arm.part('base', baseShape);

// ---- LOWER ARM (child of shoulder) --------------------------------------
// Authored in lower-arm part-local frame: origin at shoulder pivot.
// Arm extends along +X. Local rotation about -Y at the shoulder lifts the
// lower arm up; that rotation is supplied by arm.revolute(shoulderDeg).
//
// Visual: slim rectangular bar with chamfered ends + an elbow knuckle sphere
// at the distal tip so the shape reads as "arm" not "plank".
const lowerArmBeam = box(L_LOWER, ARM_W, ARM_T, true)
  .translate(L_LOWER / 2, 0, 0)
  .material({
    baseColor: '#c9c1a8',     // warm cream — Pixar Luxo arm tone
    metalness: 0.25,
    roughness: 0.55,
  });

const elbowKnuckle = sphere(KNUCKLE_R)
  .translate(L_LOWER, 0, 0)
  .material({
    baseColor: '#3a4250',
    metalness: 0.9,
    roughness: 0.35,
  });

// Small cap at the shoulder end of the arm so the arm visibly meets the
// shoulder knuckle even with the rotation extreme.
const lowerShoulderCap = sphere(ARM_W * 0.7)
  .translate(0, 0, 0)
  .material({
    baseColor: '#c9c1a8',
    metalness: 0.25,
    roughness: 0.55,
  });

const lowerArmShape = lowerArmBeam.union(elbowKnuckle).union(lowerShoulderCap);
const lowerArmPart = arm.part('lower-arm', lowerArmShape);

// ---- UPPER ARM (child of elbow) -----------------------------------------
// Authored at part-local origin = elbow pivot. Extends along +X.
// Adds a wrist knuckle at its tip.
const upperArmBeam = box(L_UPPER, ARM_W, ARM_T, true)
  .translate(L_UPPER / 2, 0, 0)
  .material({
    baseColor: '#c9c1a8',
    metalness: 0.25,
    roughness: 0.55,
  });

const wristKnuckle = sphere(KNUCKLE_R)
  .translate(L_UPPER, 0, 0)
  .material({
    baseColor: '#3a4250',
    metalness: 0.9,
    roughness: 0.35,
  });

const upperShoulderCap = sphere(ARM_W * 0.7)
  .translate(0, 0, 0)
  .material({
    baseColor: '#c9c1a8',
    metalness: 0.25,
    roughness: 0.55,
  });

const upperArmShape = upperArmBeam.union(wristKnuckle).union(upperShoulderCap);
const upperArmPart = arm.part('upper-arm', upperArmShape);

// ---- LAMP HEAD (child of wrist) -----------------------------------------
// Authored at part-local origin = wrist pivot. The shade's narrow end is at
// the wrist; the opening (wide end) faces +X in part-local frame so that
// rotating the wrist around -Y tilts the opening downward.
//
// Build approach: revolve a trapezoid around Z to get a truncated cone whose
// axis is +Z; then rotate the whole shape so the +Z axis maps to +X (i.e.
// rotate -90 deg around Y). Origin stays at the small end (radius
// SHADE_R_SMALL).
const shadeProfile = path()
  .moveTo(SHADE_R_SMALL, 0)
  .lineTo(SHADE_R_LARGE, SHADE_LEN)
  .lineTo(SHADE_R_LARGE - SHADE_T, SHADE_LEN)
  .lineTo(SHADE_R_SMALL - SHADE_T * 0.6, 0)
  .close();

// Solid revolved cone (open via the trapezoid offset above — it's a
// thin-walled shell).
const shadeRaw = shadeProfile.revolve();

// Rotate so the axis aligns with +X in part-local frame: shade narrow end
// stays at origin, opens toward +X. Rotation of +90° about +Y maps the
// original +Z direction (cone axis) to +X.
const shade = shadeRaw
  .rotate([0, 1, 0], 90)
  .material({
    baseColor: '#d8b85a',     // brass — classic Luxo head
    metalness: 0.85,
    roughness: 0.3,
  });

// A small neck collar where the head meets the wrist knuckle.
const shadeCollar = cylinder(8, SHADE_R_SMALL + 2, 48)
  .rotate([0, 1, 0], 90)
  .translate(-4, 0, 0)
  .material({
    baseColor: '#3a4250',
    metalness: 0.9,
    roughness: 0.35,
  });

// Inner glow bulb — small bright sphere centered well inside the shade so
// it reads as a bulb visible through the open end. Sits a third of the way
// down the cone from the narrow (wrist) end so it's enveloped by the shade
// from most viewing angles.
const bulb = sphere(SHADE_R_SMALL * 0.55)
  .translate(SHADE_LEN * 0.28, 0, 0)
  .material({
    baseColor: '#fff5d6',
    metalness: 0.0,
    roughness: 0.2,
  });

const headShape = shade.union(shadeCollar).union(bulb);
const headPart = arm.part('lamp-head', headShape);

// ---- JOINTS --------------------------------------------------------------
// Body-tree FK convention: joint origin lives in the PARENT's local frame.

arm.revolute('shoulder', basePart, lowerArmPart, {
  axis: [0, -1, 0],
  origin: [0, 0, SHOULDER_Z],
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

// ---- POSE ---------------------------------------------------------------
// The lamp's knuckle joints intentionally overlap by design: each arm carries
// a small sphere cap at its proximal end that meshes into the parent's
// knuckle sphere, so the silhouette reads as a continuous mechanical joint
// instead of two visibly disjoint sticks. Those contacts are real BREP
// overlaps and would otherwise trip `assembly.interference.overlap` under
// `validate: 'error'` — we silence them granularly via `ignore` instead of
// disabling the whole validator (`validate: 'off'`), so the rest of the
// gates (mate types, joint limits, etc.) keep running.
//
// Studio HUD note: the status-bar interferences counter reads RAW pairs
// (pre-filter), so the user still sees these knuckles + any extra clashes
// they drive into via the Params slider. The Validity tab honors `ignore`
// and only flags clashes the script didn't pre-approve.
return arm.solvedModel(
  {
    shoulder: shoulderDeg,
    elbow:    elbowDeg,
    wrist:    wristDeg,
  },
  {
    ignore: [
      ['base', 'lower-arm'],       // shoulder knuckle on base meets lower-arm's shoulder cap
      ['lower-arm', 'upper-arm'],  // elbow knuckle on lower-arm meets upper-arm's shoulder cap
      ['upper-arm', 'lamp-head'],  // wrist knuckle on upper-arm meets lamp-head's collar
    ],
  },
);
