// LeRobot SO-ARM-100 reference hero.
//
// Imports the upstream pre-assembled 5-DOF arm + gripper STEP via
// `lib.fromSTEP(...)` and places it on a locally-authored desk plate.
//
// This is the v0.5.0 demonstration of "import real components, don't
// reinvent the wheel". The arm geometry — every screw, every printed
// link plate, every servo body — comes from the LeRobot upstream STEP
// file unchanged. The desk plate is locally authored because it's
// scene-specific and not something an SO-100 user would download.
//
// Authoring rule: vendor / upstream catalog parts via `lib.fromSTEP`,
// scene-specific custom geometry via primitives. The kernel handles the
// composition either way — both paths produce ordinary capture-proxy
// `Shape`s that compose with translate/rotate/color/arm.part.

const armShape = (await lib.fromSTEP('parts/SO100_Assembly.step')).color('frame');

// A desk plate provides visual context. The upstream assembly's base sits
// at z = -54.2 mm (its lowest point), so the desk top rests at z = -55
// and its 8 mm slab spans z = -63 .. z = -55. Half-millimetre of air
// keeps the BREP clash detector happy without a visible gap.
const deskTop = -55;
const desk = box(280, 240, 8, true)
  .translate(0, 70, deskTop - 4)
  .color('plate');

const scene = assembly('so100');
scene.part('desk', desk);
scene.part('arm', armShape);
return scene.solvedModel({});
