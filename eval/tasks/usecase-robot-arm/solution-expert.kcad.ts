// U7: 3-axis desktop robot arm. IN PROGRESS / UNVERIFIED -- last edit was
// blocked by a live kernelCAD 502 outage before a clean evaluate_script run.
// Do not trust this file without re-running evaluate_script + review_cad.
//
// Design log (for whoever resumes this):
// - v1: joint bosses were symmetric boxes straddling the pivot on BOTH
//   sides -> base/rotor/upper-arm/forearm interpenetrate at every angle
//   (classic "square corner sweeps into the mating part" hinge mistake).
// - v2: made each part's boss occupy only ITS OWN side of the pivot (flush
//   at the joint, not straddling) -> fixed the boxes-not-overlapping-at-rest
//   case, but interference reappeared at swung poses (base+upper-arm at
//   shoulder:100, upper-arm+forearm at elbow:-100/10) because a revolute
//   joint's mating boxes still sweep into each other through 3D rotation
//   unless the boss geometry is made rotation-invariant.
// - v3 (this file): use the fact that rotation about the Y axis leaves each
//   point's Y-coordinate unchanged. Give each side of a Y-axis joint a
//   DISJOINT Y-range (rotor's bracket vs upper-arm's body; upper-arm's body
//   vs forearm's body) so the two parts can never intersect at ANY swing
//   angle, by construction, not just at the tested corner poses. Narrowed
//   shoulder limitsDeg to [-10,35] (hand math: pivot is 56mm above the
//   base's 16mm-tall top face; a downward shoulder swing only clears the
//   base once tan(angle) < roughly 40/35, i.e. below ~49 deg, so 35 deg was
//   chosen with margin).
// - STILL UNVERIFIED: the joint-mesh-gap diagnostic (connector origin must
//   be within 1mm of its own part's material) fights the disjoint-Y trick,
//   because moving a connector's Y also shifts that whole part's effective
//   world alignment (the solver aligns mated connector origins), which can
//   silently re-close the Y gap you just built. The fix attempted below is
//   to build each part's geometry so its OWN near-joint boss already
//   touches local y=0 (no need to move the connector away from y=0 at
//   all) -- but this was never confirmed against the live server because
//   of the 502s. Re-run evaluate_script (skipMechanismCheck: false) first;
//   if joint-mesh-gap or interpenetration reappear, re-derive per the notes
//   above rather than guessing again.
// - Still TODO even once green: URDF + STEP export, reachability check via
//   inspect/verify, servo-pocket dimension check, render sanity check.

const baseW = 70, baseD = 70, baseH = 16;
const rotorTowerH = 20, rotorTowerR = 8;
const bracketW = 50, bracketD = 20, bracketH = 20;
const upperLen = 120;
const foreLen = 100;
const pocket = { x: 24, y: 13, z: 9 }; // SG90-size servo pocket (SG90 body ~23x12.2x29mm)

const arm = assembly('u7-3axis-arm');

let baseShape = box(baseW, baseD, baseH, true).translate(0, 0, baseH / 2);
const baseServoPocket = box(pocket.x, pocket.y, pocket.z, false)
  .translate(10, -pocket.y / 2, baseH - pocket.z);
baseShape = baseShape.subtract(baseServoPocket);
const base = arm.part('base', baseShape);
base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, baseH] }, axis: [0, 0, 1] });

// Bracket spans y[-20,0] -- touches the shoulder joint plane (y=0) exactly on
// its own side; tower kept slim (R=8) so it barely enters y>0.
let rotorShape = cylinder(rotorTowerH, rotorTowerR)
  .union(box(bracketW, bracketD, bracketH, false).translate(-bracketW, -bracketD, rotorTowerH));
const rotorServoPocket = box(pocket.x, pocket.y, pocket.z, false)
  .translate(-bracketW + 4, -bracketD + 3, rotorTowerH + bracketH - pocket.z);
rotorShape = rotorShape.subtract(rotorServoPocket);
const rotor = arm.part('rotor', rotorShape);
rotor.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
rotor.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, rotorTowerH + bracketH] }, axis: [0, 1, 0] });

// Upper arm: both end-bosses share the same y half-width (13) so a single
// uniform +13 shift makes the WHOLE body span y[0,26] -- touching the
// shoulder joint plane (y=0) on the rotor side, and the elbow joint plane
// (also y=0, this part's OWN local frame) on the forearm side.
let upperShape = box(upperLen, 20, 16, true).translate(upperLen / 2, 0, 0)
  .union(box(20, 26, 26, false).translate(0, -13, -13))
  .union(box(26, 26, 22, false).translate(upperLen - 26, -13, -11));
upperShape = upperShape.translate(0, 13, 0); // -> y in [0,26]
const upperServoPocket = box(pocket.x, pocket.y, pocket.z, false)
  .translate(upperLen - 26 + 1, 13 - pocket.y / 2, 11 - pocket.z);
upperShape = upperShape.subtract(upperServoPocket);
const upperArm = arm.part('upper-arm', upperShape);
upperArm.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
upperArm.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [upperLen, 0, 0] }, axis: [0, 1, 0] });

// Forearm: near-elbow boss half-width is 10, so a uniform -10 shift makes it
// span y[-20,0] -- touching the SAME elbow joint plane from the other side.
let foreShape = box(foreLen, 16, 14, true).translate(foreLen / 2, 0, 0)
  .union(box(20, 20, 20, false).translate(0, -10, -10))
  .union(box(16, 16, 16, false).translate(foreLen - 16, -8, -8));
foreShape = foreShape.translate(0, -10, 0); // -> near-elbow boss in y[-20,0]
const forearm = arm.part('forearm', foreShape);
forearm.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
forearm.connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [foreLen, -10, 0] } });

arm.mate('base-yaw', 'base.yaw', 'rotor.yaw', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('shoulder', 'rotor.shoulder', 'upper-arm.shoulder', 'revolute', { limitsDeg: [-10, 35] });
arm.mate('elbow', 'upper-arm.elbow', 'forearm.elbow', 'revolute', { limitsDeg: [-100, 10] });

return arm.solvedModel({});
