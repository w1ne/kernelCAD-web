// LeRobot SO-ARM-100 reference hero.
//
// Imports the pre-assembled 5-DOF follower arm + gripper from LeRobot's
// upstream STEP file. Every mate — servo-to-bracket, shaft-to-horn,
// horn-to-link, jaw-coupling — is done by LeRobot's CAD engineers. We
// trust their fit; we don't re-position individual parts blindly.
//
// Authoring rule demonstrated:
//   - Vendor catalog assembly (the whole arm) via `lib.fromSTEP(path)`.
//     No re-modelling of internal parts. No guessing positions.
//   - Scene-specific custom geometry (the engineered base plate it sits
//     on) authored with primitives. This is the part an SO-100 builder
//     would fabricate themselves.
//
// Why this composition and not a hand-assembled chain of individual
// STEPs: positioning individual link STEPs correctly requires the
// per-link mating-frame coordinates, which only LeRobot's source CAD
// knows. The mate-connector API in v0.6 (per
// kernelCAD-private/docs/specs/2026-05-11-assembly-mates-validator-design.md)
// will close this gap; until then, single-import is the honest path.

const armShape = (await lib.fromSTEP('parts/SO100_Assembly.step')).color('frame');

// Engineered base plate: 220x180 mm rounded-rect at 10 mm thick, with
// four corner feet. Authored from primitives, finished with a 1.5 mm
// fillet on the top edges.
const PLATE_W = 220, PLATE_D = 180, PLATE_H = 10;
const FOOT_R = 7, FOOT_H = 5;
const FOOT_INSET = 18;
const basePlateRaw = extrudeRoundedRect(PLATE_W, PLATE_D, 14, PLATE_H);
const foot = (sx: number, sy: number): Shape => cylinder(FOOT_H, FOOT_R)
  .translate(sx * (PLATE_W / 2 - FOOT_INSET), sy * (PLATE_D / 2 - FOOT_INSET), -FOOT_H);

// The upstream assembled STEP has its base at z=-54.2 mm. Plate top sits
// at z=-55 (0.8 mm clearance) so the arm rests cleanly on it.
const PLATE_TOP_Z = -55;
const basePlate = basePlateRaw
  .fillet(1.5)
  .union(foot(-1, -1), foot(1, -1), foot(-1, 1), foot(1, 1))
  .translate(0, 50, PLATE_TOP_Z - PLATE_H / 2)
  .color('plate');

const scene = assembly('so100');
const basePart = scene.part('base-plate', basePlate);
const armPart  = scene.part('arm',        armShape);

// Topology: the arm bolts to the base plate via its bottom mounting
// flange. One fixed joint expresses the connection — the assembly
// validator sees a connected mechanism.
scene.fixed('arm-on-base', basePart, armPart);

return scene.solvedModel({});
