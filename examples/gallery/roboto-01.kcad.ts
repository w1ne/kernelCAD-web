// RoboParty ROBOTO 01 (RP1) — parametric B-rep gallery assembly.
//
// The 24-DoF URDF skeleton is preserved exactly (25 links, 24 revolute joint
// names/parents/children/origins/axes/limits). Every body is newly authored
// kernelCAD geometry: primitive/extruded solids, booleans and fillets. No
// No mesh-import path is used.
//
// Joint construction:
//   * clevis joints (hip pitch/roll, knee, ankle pitch, waist roll, shoulder
//     pitch/roll, elbow): the parent carries two fork cheeks and a central
//     axle; the child carries a bored hub ring and a root arm. The child bone
//     runs in the axial gap between the cheeks, with a 0.6 mm axial gap and a
//     0.5 mm radial bearing clearance.
//   * collar joints (hip yaw, waist yaw, shoulder yaw, wrist, ankle roll):
//     the child body is coaxial with the joint, so the parent carries a bored
//     collar boss instead of a pin. The child shaft runs in the collar with
//     the same clearance, and the child body starts one axial gap beyond the
//     collar face.
//
// Dimensions are editable params; the joint table is the single source of
// truth, so left/right links are mirrored from the URDF data.
//
// Source of the kinematic description and design proportions:
// https://github.com/Roboparty/RP1_description @ 84529a55649b5c9796d49093c266208c879f9f29
// Hardware attribution: CERN-OHL-W-2.0, see the adjacent NOTICE.
// URDF translations are metres -> millimetres; joint limits rad -> degrees.

const shellWhite = '#f2f3f4';
const graphite = '#34383d';
const anodized = '#a8b3bd';
const rubber = '#202326';

// ---- Pose controls (24 URDF revolute joints) -------------------------------
const left_hip_pitchDeg = param('left_hip_pitchDeg', 0, { min: -163.865929, max: 163.865929, description: 'left_hip_pitch_joint URDF angle (degrees)' });
const left_hip_rollDeg = param('left_hip_rollDeg', 0, { min: -42.398877, max: 148.969027, description: 'left_hip_roll_joint URDF angle (degrees)' });
const left_hip_yawDeg = param('left_hip_yawDeg', 0, { min: -158.136351, max: 158.136351, description: 'left_hip_yaw_joint URDF angle (degrees)' });
const left_kneeDeg = param('left_kneeDeg', 0, { min: -162.147056, max: 3.437747, description: 'left_knee_joint URDF angle (degrees)' });
const left_ankle_pitchDeg = param('left_ankle_pitchDeg', 0, { min: -44.690708, max: 34.950426, description: 'left_ankle_pitch_joint URDF angle (degrees)' });
const left_ankle_rollDeg = param('left_ankle_rollDeg', 0, { min: -14.896903, max: 14.896903, description: 'left_ankle_roll_joint URDF angle (degrees)' });
const right_hip_pitchDeg = param('right_hip_pitchDeg', 0, { min: -163.865929, max: 163.865929, description: 'right_hip_pitch_joint URDF angle (degrees)' });
const right_hip_rollDeg = param('right_hip_rollDeg', 0, { min: -148.969027, max: 42.398877, description: 'right_hip_roll_joint URDF angle (degrees)' });
const right_hip_yawDeg = param('right_hip_yawDeg', 0, { min: -158.136351, max: 158.136351, description: 'right_hip_yaw_joint URDF angle (degrees)' });
const right_kneeDeg = param('right_kneeDeg', 0, { min: -3.437747, max: 162.147056, description: 'right_knee_joint URDF angle (degrees)' });
const right_ankle_pitchDeg = param('right_ankle_pitchDeg', 0, { min: -44.690708, max: 34.950426, description: 'right_ankle_pitch_joint URDF angle (degrees)' });
const right_ankle_rollDeg = param('right_ankle_rollDeg', 0, { min: -14.896903, max: 14.896903, description: 'right_ankle_roll_joint URDF angle (degrees)' });
const waist_rollDeg = param('waist_rollDeg', 0, { min: -40.107046, max: 40.107046, description: 'waist_roll_joint URDF angle (degrees)' });
const waist_yawDeg = param('waist_yawDeg', 0, { min: -166.730718, max: 166.730718, description: 'waist_yaw_joint URDF angle (degrees)' });
const left_shoulder_pitchDeg = param('left_shoulder_pitchDeg', 0, { min: -194.805650, max: 134.645082, description: 'left_shoulder_pitch_joint URDF angle (degrees)' });
const left_shoulder_rollDeg = param('left_shoulder_rollDeg', 0, { min: -26.929016, max: 166.157761, description: 'left_shoulder_roll_joint URDF angle (degrees)' });
const left_shoulder_yawDeg = param('left_shoulder_yawDeg', 0, { min: -164.438887, max: 164.438887, description: 'left_shoulder_yaw_joint URDF angle (degrees)' });
const left_elbowDeg = param('left_elbowDeg', 0, { min: -91.673247, max: 71.046767, description: 'left_elbow_joint URDF angle (degrees)' });
const left_wristDeg = param('left_wristDeg', 0, { min: -146.677196, max: 146.677196, description: 'left_wrist_joint URDF angle (degrees)' });
const right_shoulder_pitchDeg = param('right_shoulder_pitchDeg', 0, { min: -134.645082, max: 194.805650, description: 'right_shoulder_pitch_joint URDF angle (degrees)' });
const right_shoulder_rollDeg = param('right_shoulder_rollDeg', 0, { min: -166.157761, max: 26.929016, description: 'right_shoulder_roll_joint URDF angle (degrees)' });
const right_shoulder_yawDeg = param('right_shoulder_yawDeg', 0, { min: -164.438887, max: 164.438887, description: 'right_shoulder_yaw_joint URDF angle (degrees)' });
const right_elbowDeg = param('right_elbowDeg', 0, { min: -71.046767, max: 91.673247, description: 'right_elbow_joint URDF angle (degrees)' });
const right_wristDeg = param('right_wristDeg', 0, { min: -146.677196, max: 146.677196, description: 'right_wrist_joint URDF angle (degrees)' });

// ---- Envelope / link dimensions (mm) ---------------------------------------
const pelvisWidth = param('pelvisWidth', 112, { min: 100, max: 132, description: 'Pelvis outside width across the hips (mm).' });
const pelvisDepth = param('pelvisDepth', 140, { min: 110, max: 180, description: 'Pelvis front-to-back depth (mm).' });
const pelvisHeight = param('pelvisHeight', 160, { min: 120, max: 200, description: 'Pelvis vertical height (mm).' });
const torsoWidth = param('torsoWidth', 80, { min: 70, max: 120, description: 'Chest outside width at the shoulder line (mm).' });
const torsoDepth = param('torsoDepth', 80, { min: 64, max: 130, description: 'Chest front-to-back depth (mm).' });
const torsoHeight = param('torsoHeight', 298, { min: 240, max: 340, description: 'Chest height from the waist collar to the neck (mm).' });
const headWidth = param('headWidth', 120, { min: 90, max: 160, description: 'Head / sensor-bar width (mm).' });
const headDepth = param('headDepth', 90, { min: 70, max: 130, description: 'Head front-to-back depth (mm).' });
const headHeight = param('headHeight', 80, { min: 60, max: 110, description: 'Head height (mm).' });
const hipPodWidth = param('hipPodWidth', 16, { min: 12, max: 36, description: 'Hip pitch/roll actuator pod width (mm).' });
const hipPodDepth = param('hipPodDepth', 14, { min: 10, max: 32, description: 'Hip pitch/roll actuator pod thickness (mm).' });
const thighWidth = param('thighWidth', 10, { min: 8, max: 30, description: 'Thigh shell width (mm).' });
const thighDepth = param('thighDepth', 8, { min: 6, max: 26, description: 'Thigh shell thickness along the knee axis (mm).' });
const shinWidth = param('shinWidth', 10, { min: 8, max: 30, description: 'Shin shell width (mm).' });
const shinDepth = param('shinDepth', 8, { min: 6, max: 26, description: 'Shin shell thickness along the ankle axis (mm).' });
const upperArmWidth = param('upperArmWidth', 22, { min: 18, max: 40, description: 'Upper-arm shell width (mm).' });
const upperArmDepth = param('upperArmDepth', 20, { min: 16, max: 36, description: 'Upper-arm shell thickness along the elbow axis (mm).' });
const forearmWidth = param('forearmWidth', 20, { min: 16, max: 38, description: 'Forearm shell width (mm).' });
const forearmDepth = param('forearmDepth', 18, { min: 14, max: 34, description: 'Forearm shell thickness along the wrist axis (mm).' });
const shoulderPodWidth = param('shoulderPodWidth', 24, { min: 18, max: 42, description: 'Shoulder pitch/roll pod width (mm).' });
const shoulderPodDepth = param('shoulderPodDepth', 22, { min: 16, max: 38, description: 'Shoulder pitch/roll pod thickness (mm).' });
const waistBlockWidth = param('waistBlockWidth', 50, { min: 36, max: 80, description: 'Waist roll/yaw bearing block width (mm).' });
const waistBlockDepth = param('waistBlockDepth', 30, { min: 24, max: 48, description: 'Waist roll/yaw bearing block depth (mm).' });
const footLength = param('footLength', 150, { min: 120, max: 200, description: 'Foot sole length from the ankle (mm).' });
const footWidth = param('footWidth', 70, { min: 55, max: 95, description: 'Foot sole width (mm).' });
const footHeight = param('footHeight', 26, { min: 18, max: 40, description: 'Foot sole thickness (mm).' });
const handLength = param('handLength', 100, { min: 80, max: 135, description: 'Hand length from the wrist flange (mm).' });
const handWidth = param('handWidth', 60, { min: 44, max: 80, description: 'Hand palm width (mm).' });
const handThickness = param('handThickness', 24, { min: 16, max: 38, description: 'Hand palm thickness (mm).' });
const hipJointR = param('hipJointR', 26, { min: 20, max: 34, description: 'Hip bearing outer radius (mm).' });
const kneeJointR = param('kneeJointR', 28, { min: 22, max: 36, description: 'Knee bearing outer radius (mm).' });
const ankleJointR = param('ankleJointR', 7, { min: 6, max: 10, description: 'Ankle pitch bearing outer radius (mm).' });
const footJointR = param('footJointR', 7, { min: 6, max: 10, description: 'Ankle roll collar outer radius (mm).' });
const waistJointR = param('waistJointR', 28, { min: 22, max: 36, description: 'Waist bearing outer radius (mm).' });
const shoulderJointR = param('shoulderJointR', 22, { min: 17, max: 30, description: 'Shoulder bearing outer radius (mm).' });
const elbowJointR = param('elbowJointR', 19, { min: 14, max: 26, description: 'Elbow bearing outer radius (mm).' });
const wristJointR = param('wristJointR', 15, { min: 11, max: 21, description: 'Wrist collar outer radius (mm).' });

// ---- ParamRef-aware arithmetic ------------------------------------------------
type E = Editable<number>;
type V3 = [number, number, number];
const pad = (a: E, b: E): E => (typeof a === 'number' ? (typeof b === 'number' ? a + b : b.add(a)) : a.add(b));
const psub = (a: E, b: E): E => (typeof a === 'number' ? (typeof b === 'number' ? a - b : b.negate().add(a)) : a.subtract(b));
const pmul = (a: E, b: E): E => (typeof a === 'number' ? (typeof b === 'number' ? a * b : b.multiply(a)) : a.multiply(b));
const pdiv = (a: E, b: E): E => (typeof a === 'number' ? (typeof b === 'number' ? a / b : b.negate().add(a)) : a.divide(b));
const pneg = (a: E): E => (typeof a === 'number' ? -a : a.negate());
const pmin = (a: E, b: E): E => (typeof a === 'number' ? (typeof b === 'number' ? Math.min(a, b) : b.min(a)) : a.min(b));
const half = (a: E): E => pmul(a, 0.5);
const vadd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vmul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const vdot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlen = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const vnorm = (a: V3): V3 => { const l = vlen(a); return l > 0 ? vmul(a, 1 / l) : [0, 0, 1]; };
const vcross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vmid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const axisOffset = (p: V3, dir: V3, d: E): [E, E, E] => [
  pad(p[0], pmul(dir[0], d)),
  pad(p[1], pmul(dir[1], d)),
  pad(p[2], pmul(dir[2], d)),
];

type S = ReturnType<typeof box>;

function roundedBox(width: E, thickness: E, length: E, r = 3): S {
  const b = box(width, thickness, length, true);
  return r > 0 ? b.fillet(r) : b;
}

/** Roll that makes a box's local +Y follow `up` after alongAxis. */
function rollFor(dir: V3, up: V3): number {
  let y0: V3;
  if (Math.abs(dir[2] - 1) < 1e-9) {
    y0 = [0, 1, 0];
  } else if (Math.abs(dir[2] + 1) < 1e-9) {
    y0 = [0, -1, 0];
  } else {
    const k = vnorm(vcross([0, 0, 1], dir));
    const ang = Math.acos(Math.max(-1, Math.min(1, dir[2])));
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const t = 1 - c;
    y0 = [
      s * k[2] + t * k[0] * k[1],
      c + t * k[1] * k[1],
      -s * k[0] + t * k[1] * k[2],
    ];
  }
  let ref = vsub(up, vmul(dir, vdot(up, dir)));
  if (vlen(ref) < 1e-7) ref = y0;
  ref = vnorm(ref);
  const signed = Math.atan2(vdot(dir, vcross(y0, ref)), vdot(y0, ref));
  return signed * 180 / Math.PI;
}

/** Oriented rounded box from a to b; thickness follows upHint. */
function beamBox(a: V3, b: V3, width: E, thickness: E, upHint: V3, r = 3): S {
  const d = vsub(b, a);
  const len = vlen(d);
  if (len < 1e-6) return box(width, thickness, 1, true);
  const dir = vnorm(d);
  const roll = rollFor(dir, upHint);
  return roundedBox(width, thickness, len, r)
    .alongAxis(dir)
    .rotate(dir, roll)
    .translate(...vmid(a, b));
}

/** Cylinder between two numeric points. */
function cylBetween(a: V3, b: V3, radius: E, segments = 32): S {
  const d = vsub(b, a);
  const len = vlen(d);
  const dir = vnorm(d);
  return cylinder(len, radius, segments)
    .translate(0, 0, -len / 2)
    .alongAxis(dir)
    .translate(...vmid(a, b));
}

/** Cylinder along a joint axis, spanning axial lo..hi (mm) around point p. */
function axialCylinder(p: V3, axis: V3, lo: E, hi: E, radius: E, segments = 48): S {
  const length = psub(hi, lo);
  const centre = pdiv(pad(lo, hi), 2);
  return cylinder(length, radius, segments)
    .translate(0, 0, pneg(half(length)))
    .alongAxis(vnorm(axis))
    .translate(...axisOffset(p, vnorm(axis), centre));
}

// ---- URDF joint table --------------------------------------------------------
type JointKind = 'fork' | 'collar';
type Joint = {
  name: string;
  parent: string;
  child: string;
  xyz: V3;
  axis: V3;
  limitsDeg: [number, number];
  pose: Editable<number>;
  kind: JointKind;
  hubR: E;
  nomR: number;
};
const joints: Joint[] = [
  { name: 'left_hip_pitch_joint', parent: 'base_link', child: 'left_hip_pitch_link', xyz: [-38.43, 62.987, -51.639], axis: [0, 1, 0], limitsDeg: [-163.865929, 163.865929], pose: left_hip_pitchDeg, kind: 'fork', hubR: hipJointR, nomR: 26 },
  { name: 'left_hip_roll_joint', parent: 'left_hip_pitch_link', child: 'left_hip_roll_link', xyz: [31.915, 61.254, -60.672], axis: [1, 0, 0], limitsDeg: [-42.398877, 148.969027], pose: left_hip_rollDeg, kind: 'fork', hubR: hipJointR, nomR: 26 },
  { name: 'left_hip_yaw_joint', parent: 'left_hip_roll_link', child: 'left_hip_yaw_link', xyz: [-12.698, 0, -129], axis: [0, 0, -1], limitsDeg: [-158.136351, 158.136351], pose: left_hip_yawDeg, kind: 'collar', hubR: hipJointR, nomR: 26 },
  { name: 'left_knee_joint', parent: 'left_hip_yaw_link', child: 'left_knee_link', xyz: [-33.201, -30.809, -165.09], axis: [0, -1, 0], limitsDeg: [-162.147056, 3.437747], pose: left_kneeDeg, kind: 'fork', hubR: kneeJointR, nomR: 28 },
  { name: 'left_ankle_pitch_joint', parent: 'left_knee_link', child: 'left_ankle_pitch_link', xyz: [31.31, 30.811, -305.33], axis: [0, 1, 0], limitsDeg: [-44.690708, 34.950426], pose: left_ankle_pitchDeg, kind: 'fork', hubR: ankleJointR, nomR: 7 },
  { name: 'left_ankle_roll_joint', parent: 'left_ankle_pitch_link', child: 'left_ankle_roll_link', xyz: [13.067, 0, -18.922], axis: [0.999993677858222, 0, 0.00355587451777954], limitsDeg: [-14.896903, 14.896903], pose: left_ankle_rollDeg, kind: 'collar', hubR: footJointR, nomR: 7 },
  { name: 'right_hip_pitch_joint', parent: 'base_link', child: 'right_hip_pitch_link', xyz: [-38.43, -69.013, -51.639], axis: [0, -1, 0], limitsDeg: [-163.865929, 163.865929], pose: right_hip_pitchDeg, kind: 'fork', hubR: hipJointR, nomR: 26 },
  { name: 'right_hip_roll_joint', parent: 'right_hip_pitch_link', child: 'right_hip_roll_link', xyz: [31.915, -61.254, -60.672], axis: [1, 0, 0], limitsDeg: [-148.969027, 42.398877], pose: right_hip_rollDeg, kind: 'fork', hubR: hipJointR, nomR: 26 },
  { name: 'right_hip_yaw_joint', parent: 'right_hip_roll_link', child: 'right_hip_yaw_link', xyz: [-12.698, 0, -129], axis: [0, 0, -1], limitsDeg: [-158.136351, 158.136351], pose: right_hip_yawDeg, kind: 'collar', hubR: hipJointR, nomR: 26 },
  { name: 'right_knee_joint', parent: 'right_hip_yaw_link', child: 'right_knee_link', xyz: [-33.201, 30.808967, -165.090023], axis: [0, 1, 0], limitsDeg: [-3.437747, 162.147056], pose: right_kneeDeg, kind: 'fork', hubR: kneeJointR, nomR: 28 },
  { name: 'right_ankle_pitch_joint', parent: 'right_knee_link', child: 'right_ankle_pitch_link', xyz: [31.31, -30.809, -305.33], axis: [0, 1, 0], limitsDeg: [-44.690708, 34.950426], pose: right_ankle_pitchDeg, kind: 'fork', hubR: ankleJointR, nomR: 7 },
  { name: 'right_ankle_roll_joint', parent: 'right_ankle_pitch_link', child: 'right_ankle_roll_link', xyz: [13.067, 0, -18.922], axis: [0.999993677858222, 0, 0.00355587451777984], limitsDeg: [-14.896903, 14.896903], pose: right_ankle_rollDeg, kind: 'collar', hubR: footJointR, nomR: 7 },
  { name: 'waist_roll_joint', parent: 'base_link', child: 'waist_roll_link', xyz: [-7.579949, -3.012699, 52.98383], axis: [1, 0, 0], limitsDeg: [-40.107046, 40.107046], pose: waist_rollDeg, kind: 'fork', hubR: waistJointR, nomR: 28 },
  { name: 'waist_yaw_joint', parent: 'waist_roll_link', child: 'waist_yaw_link', xyz: [-30.845, 0, 68], axis: [0, 0, -1], limitsDeg: [-166.730718, 166.730718], pose: waist_yawDeg, kind: 'collar', hubR: waistJointR, nomR: 28 },
  { name: 'left_shoulder_pitch_joint', parent: 'waist_yaw_link', child: 'left_shoulder_pitch_link', xyz: [0, 116.496195, 198.487156], axis: [0, 0.99619, 0.087156], limitsDeg: [-194.80565, 134.645082], pose: left_shoulder_pitchDeg, kind: 'fork', hubR: shoulderJointR, nomR: 22 },
  { name: 'left_shoulder_roll_joint', parent: 'left_shoulder_pitch_link', child: 'left_shoulder_roll_link', xyz: [28.743295, 65.349445, -14.608907], axis: [1, 0, 0], limitsDeg: [-26.929016, 166.157761], pose: left_shoulder_rollDeg, kind: 'fork', hubR: shoulderJointR, nomR: 22 },
  { name: 'left_shoulder_yaw_joint', parent: 'left_shoulder_roll_link', child: 'left_shoulder_yaw_link', xyz: [-19.057493, 0, -105.00004], axis: [0, 0, -1], limitsDeg: [-164.438887, 164.438887], pose: left_shoulder_yawDeg, kind: 'collar', hubR: shoulderJointR, nomR: 22 },
  { name: 'left_elbow_joint', parent: 'left_shoulder_yaw_link', child: 'left_elbow_link', xyz: [20.796, -31.888, -104.14], axis: [0, -1, 0], limitsDeg: [-91.673247, 71.046767], pose: left_elbowDeg, kind: 'fork', hubR: elbowJointR, nomR: 19 },
  { name: 'left_wrist_joint', parent: 'left_elbow_link', child: 'left_wrist_link', xyz: [116.093382, 31.859446, -18.792758], axis: [1, 0, 0], limitsDeg: [-146.677196, 146.677196], pose: left_wristDeg, kind: 'collar', hubR: wristJointR, nomR: 15 },
  { name: 'right_shoulder_pitch_joint', parent: 'waist_yaw_link', child: 'right_shoulder_pitch_link', xyz: [0, -116.496195, 198.487156], axis: [0, -0.99619, 0.087156], limitsDeg: [-134.645082, 194.80565], pose: right_shoulder_pitchDeg, kind: 'fork', hubR: shoulderJointR, nomR: 22 },
  { name: 'right_shoulder_roll_joint', parent: 'right_shoulder_pitch_link', child: 'right_shoulder_roll_link', xyz: [28.743295, -65.349445, -14.608907], axis: [1, 0, 0], limitsDeg: [-166.157761, 26.929016], pose: right_shoulder_rollDeg, kind: 'fork', hubR: shoulderJointR, nomR: 22 },
  { name: 'right_shoulder_yaw_joint', parent: 'right_shoulder_roll_link', child: 'right_shoulder_yaw_link', xyz: [-19.057392, 0, -105.000126], axis: [0, 0, -1], limitsDeg: [-164.438887, 164.438887], pose: right_shoulder_yawDeg, kind: 'collar', hubR: shoulderJointR, nomR: 22 },
  { name: 'right_elbow_joint', parent: 'right_shoulder_yaw_link', child: 'right_elbow_link', xyz: [20.79568, 31.887526, -104.135223], axis: [0, 1, 0], limitsDeg: [-71.046767, 91.673247], pose: right_elbowDeg, kind: 'fork', hubR: elbowJointR, nomR: 19 },
  { name: 'right_wrist_joint', parent: 'right_elbow_link', child: 'right_wrist_link', xyz: [116.093344, -31.85937, -18.79273], axis: [1, 0, 0], limitsDeg: [-146.677196, 146.677196], pose: right_wristDeg, kind: 'collar', hubR: wristJointR, nomR: 15 },
];

const childrenOf = (link: string) => joints.filter((j) => j.parent === link);
const incomingOf = (link: string) => joints.find((j) => j.child === link);

// ---- Per-link envelope specs --------------------------------------------------
type LinkSpec = { width: E; thickness: E; nomT: number; color: string };
const linkSpecs: Record<string, LinkSpec> = {
  base_link: { width: pelvisWidth, thickness: pelvisDepth, nomT: 140, color: shellWhite },
  waist_roll_link: { width: waistBlockWidth, thickness: waistBlockDepth, nomT: 70, color: anodized },
  waist_yaw_link: { width: torsoWidth, thickness: torsoDepth, nomT: 120, color: graphite },
  left_hip_pitch_link: { width: hipPodWidth, thickness: hipPodDepth, nomT: 46, color: anodized },
  left_hip_roll_link: { width: hipPodWidth, thickness: hipPodDepth, nomT: 46, color: anodized },
  left_hip_yaw_link: { width: thighWidth, thickness: thighDepth, nomT: 50, color: shellWhite },
  left_knee_link: { width: shinWidth, thickness: shinDepth, nomT: 44, color: graphite },
  left_ankle_pitch_link: { width: 18, thickness: 18, nomT: 18, color: anodized },
  left_ankle_roll_link: { width: footWidth, thickness: footHeight, nomT: 30, color: rubber },
  right_hip_pitch_link: { width: hipPodWidth, thickness: hipPodDepth, nomT: 46, color: anodized },
  right_hip_roll_link: { width: hipPodWidth, thickness: hipPodDepth, nomT: 46, color: anodized },
  right_hip_yaw_link: { width: thighWidth, thickness: thighDepth, nomT: 50, color: shellWhite },
  right_knee_link: { width: shinWidth, thickness: shinDepth, nomT: 44, color: graphite },
  right_ankle_pitch_link: { width: 18, thickness: 18, nomT: 18, color: anodized },
  right_ankle_roll_link: { width: footWidth, thickness: footHeight, nomT: 30, color: rubber },
  left_shoulder_pitch_link: { width: shoulderPodWidth, thickness: shoulderPodDepth, nomT: 42, color: anodized },
  left_shoulder_roll_link: { width: shoulderPodWidth, thickness: shoulderPodDepth, nomT: 42, color: anodized },
  left_shoulder_yaw_link: { width: upperArmWidth, thickness: upperArmDepth, nomT: 44, color: shellWhite },
  left_elbow_link: { width: forearmWidth, thickness: forearmDepth, nomT: 40, color: graphite },
  left_wrist_link: { width: handWidth, thickness: handThickness, nomT: 28, color: graphite },
  right_shoulder_pitch_link: { width: shoulderPodWidth, thickness: shoulderPodDepth, nomT: 42, color: anodized },
  right_shoulder_roll_link: { width: shoulderPodWidth, thickness: shoulderPodDepth, nomT: 42, color: anodized },
  right_shoulder_yaw_link: { width: upperArmWidth, thickness: upperArmDepth, nomT: 44, color: shellWhite },
  right_elbow_link: { width: forearmWidth, thickness: forearmDepth, nomT: 40, color: graphite },
  right_wrist_link: { width: handWidth, thickness: handThickness, nomT: 28, color: graphite },
};


// ---- Joint hardware styles ---------------------------------------------------
// Numeric values derived from the default joint scale.  The body envelopes stay
// parametric; joint hardware uses these nominal dimensions (the task allows
// numeric defaults for the hardware).
type ClevisStyleN = { knuckleR: number; forkGapY: number; tongueY: number; plateT: number; pinR: number };
type CollarStyleN = {
  hubR: number; collarW: number; collarR: number; shaftR: number; collarInner: number;
  neckLen: number; flangeR: number; flangeT: number; gap: number;
};

function clevisStyle(j: Joint): ClevisStyleN {
  const tightWaist = j.name === 'waist_roll_joint';
  const tightAnkle = j.name.includes('ankle_pitch');
  const tightKnee = j.name.includes('knee');
  const R = tightWaist ? 12 : tightAnkle ? 8 : tightKnee ? 8 : Math.max(10, Math.round(j.nomR * 0.8));
  const tongueY = Math.max(7, Math.round(R * 0.65));
  const plateT = Math.max(3, Math.round(R * 0.22));
  const pinR = Math.max(3, Math.round(R * 0.28));
  return { knuckleR: R, forkGapY: tongueY + 1, tongueY, plateT, pinR };
}

function collarStyle(j: Joint): CollarStyleN {
  const tightWaist = j.name === 'waist_yaw_joint';
  const tightAnkle = j.name.includes('ankle_roll');
  const tightHipYaw = j.name.includes('hip_yaw');
  const hubR = tightWaist ? 10 : tightAnkle ? 4 : tightHipYaw ? 10 : Math.max(12, Math.round(j.nomR));
  const collarW = Math.max(8, Math.round(hubR * 0.8));
  const collarR = hubR + 4;
  const shaftR = Math.max(2, Math.round(hubR * 0.5));
  const collarInner = shaftR + 0.5;
  const neckLen = hubR + 8;
  const flangeR = Math.max(hubR, shaftR + 2);
  const flangeT = 4;
  const gap = 0.6;
  return { hubR, collarW, collarR, shaftR, collarInner, neckLen, flangeR, flangeT, gap };
}

const sideOf = (j: Joint): number => {
  const a = vnorm(j.axis);
  return vdot(j.xyz, a) >= 0 ? 1 : -1;
};

function podCentre(out: Joint): V3 {
  if (out.kind === 'fork') {
    const st = clevisStyle(out);
    const s = sideOf(out);
    const podR = st.knuckleR * 0.8;
    const off = st.forkGapY / 2 + st.plateT + podR + 2;
    return vadd(out.xyz, vmul(vnorm(out.axis), -s * off));
  }
  return out.xyz;
}

function podFor(out: Joint): S {
  if (out.kind === 'fork') {
    const st = clevisStyle(out);
    const A = vnorm(out.axis);
    const s = sideOf(out);
    const podR = st.knuckleR * 0.8;
    const centre = podCentre(out);
    const pod = axialCylinder(centre, A, -podR, podR, podR, 48);
    const plateFace = vadd(out.xyz, vmul(A, -s * (st.forkGapY / 2 + st.plateT)));
    const neck = cylBetween(centre, plateFace, Math.max(4, st.pinR + 2), 32);
    return pod.union(neck);
  }
  const st = collarStyle(out);
  const len = st.collarW + 2 * st.neckLen + 10;
  return axialCylinder(out.xyz, out.axis, -len / 2, len / 2, st.collarR, 48);
}



/** Half-space covering the side `coverSign * axis` from `boundary`. */
function halfSpaceAt(p: V3, axis: V3, boundary: number, coverSign: number): S {
  const centre = axisOffset(p, axis, boundary + coverSign * 200);
  return box(1000, 1000, 400, true).alongAxis(vnorm(axis)).translate(...centre);
}

function shellBetween(start: V3, end: V3, spec: LinkSpec, upHint: V3, lead: number, endClear: number): S | undefined {
  const d = vsub(end, start);
  const len = vlen(d);
  if (len <= lead + endClear + 10) return undefined;
  const dir = vnorm(d);
  const a = vadd(start, vmul(dir, lead));
  const b = vadd(end, vmul(dir, -endClear));
  return beamBox(a, b, spec.width, spec.thickness, upHint, 3);
}

// ---- Raw link bodies (no joint hardware) -------------------------------------
function rawLimb(link: string): S {
  const spec = linkSpecs[link]!;
  const incoming = incomingOf(link);
  const outgoing = childrenOf(link);
  if (incoming === undefined) throw new Error(`rawLimb: ${link} has no incoming joint`);
  if (outgoing.length === 0) throw new Error(`rawLimb: ${link} has no outgoing joint`);

  const bodyR = half(pmin(spec.width, spec.thickness));
  const bodyRN = spec.nomT / 2;
  let start: V3;
  let leadR: number;
  let leadEnd: V3;
  let lead: S | undefined;
  let firstBodyStart: V3;

  if (incoming.kind === 'fork') {
    const st = clevisStyle(incoming);
    const A = vnorm(incoming.axis);
    const target = outgoing[0]!.xyz;
    let perp = vsub(target, [0, 0, 0]);
    perp = vsub(perp, vmul(A, vdot(perp, A)));
    if (vlen(perp) < 1e-6) perp = vnorm(vcross(A, [0, 0, 1]));
    perp = vnorm(perp);
    const leadLen = st.knuckleR + bodyRN + 4;
    leadEnd = vmul(perp, leadLen);
    leadR = st.tongueY / 2;
    lead = cylBetween([0, 0, 0], leadEnd, leadR, 32);
    firstBodyStart = leadEnd;
  } else {
    const st = collarStyle(incoming);
    const s = sideOf(incoming);
    start = vmul(vnorm(incoming.axis), s * (st.collarW / 2 + st.gap + st.flangeT / 2));
    leadEnd = start;
    leadR = st.shaftR + 4;
    firstBodyStart = start;
  }

  let shape: S | undefined;
  for (const out of outgoing) {
    const pod = podFor(out);
    const podC = podCentre(out);
    const d = vsub(podC, firstBodyStart);
    const len = vlen(d);
    const dir = len > 1e-6 ? vnorm(d) : [0, 0, 1] as V3;
    const endClear = (out.kind === 'fork' ? clevisStyle(out).knuckleR : collarStyle(out).collarR) + bodyRN + 4;
    let part: S;
    if (len > endClear + 8) {
      const bodyEnd = vadd(podC, vmul(dir, -endClear));
      const body = cylBetween(firstBodyStart, bodyEnd, bodyR, 40);
      const spine = cylBetween(bodyEnd, podC, Math.min(leadR, 6), 32);
      const shell = shellBetween(firstBodyStart, bodyEnd, spec, out.axis, bodyRN + 4, bodyRN + 4);
      part = pod.union(body).union(spine);
      if (shell !== undefined) part = part.union(shell);
    } else {
      part = pod.union(cylBetween(firstBodyStart, podC, Math.min(leadR, 6), 32));
    }
    if (lead !== undefined && outgoing.indexOf(out) === 0) part = part.union(lead);
    shape = shape === undefined ? part : shape.union(part);
  }
  if (shape === undefined) throw new Error(`rawLimb: ${link} produced no body`);
  return shape;
}

function rawBase(): S {
  const pelvis = box(pelvisDepth, pelvisWidth, pelvisHeight, true)
    .fillet(8)
    .translate(-25, 0, psub(52, half(pelvisHeight)));
  const frontBoss = box(42, 70, 42, true).fillet(4).translate(42, -3, 53);
  let shape = pelvis.union(frontBoss);
  for (const out of childrenOf('base_link')) {
    const pod = podFor(out);
    const bridgeStart: V3 = out.name.includes('hip')
      ? [out.xyz[0], Math.sign(out.xyz[1]) * 45, out.xyz[2]]
      : [out.xyz[0], out.xyz[1], 45];
    const bridge = cylBetween(bridgeStart, podCentre(out), 12, 32);
    shape = shape.union(bridge).union(pod);
  }
  return shape;
}

function rawTorso(): S {
  const incoming = incomingOf('waist_yaw_link')!;
  const st = collarStyle(incoming);
  const bottom = st.collarW / 2 + st.gap + st.flangeT / 2;
  const torso = box(torsoDepth, torsoWidth, torsoHeight, true)
    .fillet(12)
    .translate(-20, 0, pad(bottom, half(torsoHeight)));
  const neck = cylinder(46, 27, 32).translate(-10, 0, psub(pad(bottom, torsoHeight), 6));
  const headBase = pad(bottom, torsoHeight);
  const headZ = pad(pad(headBase, 30), half(headHeight));
  const head = box(headDepth, headWidth, headHeight, true)
    .fillet(10)
    .translate(-10, 0, headZ);
  const visor = box(12, 130, 20, true)
    .fillet(3)
    .translate(40, 0, pad(headZ, 6));
  let shape = torso.union(neck).union(head).union(visor);
  shape = shape.subtract(box(18, 118, 14, true).translate(45, 0, psub(headZ, 10)));
  for (const out of childrenOf('waist_yaw_link')) {
    const pod = podFor(out);
    const ySign = Math.sign(out.xyz[1]);
    const bridgeStart: V3 = [out.xyz[0], ySign * 35, out.xyz[2]];
    const bridge = cylBetween(bridgeStart, podCentre(out), 12, 32);
    shape = shape.union(bridge).union(pod);
  }
  return shape;
}

function rawHand(name: string): S {
  const incoming = incomingOf(name)!;
  const st = collarStyle(incoming);
  const x0 = st.collarW / 2 + st.gap + st.flangeT / 2;
  const palmLen = 58;
  const fingerLen = psub(handLength, palmLen);
  const palm = box(palmLen, handWidth, handThickness, true)
    .fillet(4)
    .translate(x0 + palmLen / 2, 0, 0);
  let shape = palm;
  const fingerW = 11;
  const gap = 3;
  for (let i = 0; i < 4; i++) {
    const y = -1.5 * (fingerW + gap) + i * (fingerW + gap);
    shape = shape.union(
      box(fingerLen, fingerW, pmul(handThickness, 0.72), true)
        .fillet(3)
        .translate(pad(pad(x0, palmLen), psub(half(fingerLen), 4)), y, 0),
    );
  }
  const thumbY = pneg(pad(half(handWidth), 2));
  shape = shape.union(
    box(38, 16, pmul(handThickness, 0.8), true)
      .fillet(3)
      .translate(x0 + 26, thumbY, -4)
      .rotate([0, 0, 1], -18, [x0 + 26, thumbY, -4]),
  );
  return shape;
}

function rawFoot(name: string): S {
  const incoming = incomingOf(name)!;
  const st = collarStyle(incoming);
  const x0 = st.collarW / 2 + st.gap + st.flangeT / 2;
  const sole = box(footLength, footWidth, footHeight, true)
    .fillet(5)
    .translate(pad(x0, half(footLength)), 0, pneg(pad(half(footHeight), 12)));
  const cuff = box(40, 52, 26, true)
    .fillet(4)
    .translate(x0 + 18, 0, -11);
  return sole.union(cuff);
}

function rawBody(link: string): S {
  if (link === 'base_link') return rawBase();
  if (link === 'waist_yaw_link') return rawTorso();
  if (link.endsWith('_wrist_link')) return rawHand(link);
  if (link.endsWith('_ankle_roll_link')) return rawFoot(link);
  return rawLimb(link);
}

// ---- Collar joint hardware ---------------------------------------------------
function buildCollarJoint(parentBody: S, childBody: S, j: Joint): { parent: S; child: S } {
  const st = collarStyle(j);
  const A = vnorm(j.axis);
  const s = sideOf(j);
  const P = j.xyz;
  const parentEnd = -s * (st.collarW / 2 + st.neckLen);
  const childEnd = s * (st.collarW / 2);
  const bossLo = Math.min(parentEnd, childEnd);
  const bossHi = Math.max(parentEnd, childEnd);
  const boss = axialCylinder(P, A, bossLo, bossHi, st.collarR, 48);
  const boreA = parentEnd - s * 2;
  const boreB = childEnd + s * 2;
  const bore = axialCylinder(P, A, Math.min(boreA, boreB), Math.max(boreA, boreB), st.collarInner, 48);

  // Parent body: remove anything on the child side of the gap plane, then put
  // the boss back.  The boss guarantees the cut is never a no-op.
  const plane = s * (st.collarW / 2 + st.gap);
  const parentCut = halfSpaceAt(P, A, plane - s * 0.5, s);
  let parent = parentBody.union(boss);
  parent = parent.subtract(parentCut);
  parent = parent.union(boss);
  parent = parent.subtract(bore);

  // Child: shaft through the bore, flange at the child-side gap plane.
  const shaftHalf = st.collarW / 2 + st.gap + 2;
  const shaft = axialCylinder([0, 0, 0], A, -shaftHalf, shaftHalf, st.shaftR, 48);
  const flangeA = s * (st.collarW / 2 + st.gap);
  const flangeB = s * (st.collarW / 2 + st.gap + st.flangeT);
  const flange = axialCylinder([0, 0, 0], A, Math.min(flangeA, flangeB), Math.max(flangeA, flangeB), st.flangeR, 48);
  const childCut = halfSpaceAt([0, 0, 0], A, plane + s * 0.5, -s);
  let child = childBody.union(shaft).union(flange);
  child = child.subtract(childCut);
  child = child.union(shaft).union(flange);

  return { parent, child };
}

// ---- Assemble in topological order -------------------------------------------
const rp1 = assembly('roboto-01-rp1');
const raw = new Map<string, S>();
const shapes = new Map<string, S>();
type ConnectorSpec = { name: string; origin: V3; axis: V3; clearanceRadius: number };
type ClevisStructure = {
  kind: 'clevis-double-shear-v1'; source: 'joint.clevis';
  pinDiameterMm: number; boreDiameterMm: number; forkPlateThicknessMm: number;
  forkPlateCount: 2; tongueThicknessMm: number; forkGapMm: number;
  supportSpanMm: number; edgeDistanceMm: number;
};
type MateSpec = {
  name: string; parent: string; child: string; pose: Editable<number>;
  limitsDeg: [number, number]; capacity: { structure: ClevisStructure } | undefined;
};
const connectorSpecs = new Map<string, ConnectorSpec[]>();
const mateSpecs: MateSpec[] = [];
for (const link of Object.keys(linkSpecs)) connectorSpecs.set(link, []);

for (const link of Object.keys(linkSpecs)) raw.set(link, rawBody(link));
shapes.set('base_link', raw.get('base_link')!);

for (const j of joints) {
  const parentShape = shapes.get(j.parent);
  const childRaw = raw.get(j.child);
  if (parentShape === undefined || childRaw === undefined) {
    throw new Error(`joint ${j.name}: missing ${j.parent} or ${j.child}`);
  }

  let parentFinal: S;
  let childFinal: S;
  let parentConnector: ConnectorSpec;
  let childConnector: ConnectorSpec;
  let capacity: { structure: ClevisStructure } | undefined;

  if (j.kind === 'fork') {
    const st = clevisStyle(j);
    const c = joint.clevis({
      parentBody: parentShape,
      childBody: childRaw,
      axis: j.axis,
      pivotParent: j.xyz,
      pivotChild: [0, 0, 0],
      limitsDeg: j.limitsDeg,
      liftPivot: false,
      style: st,
    });
    parentFinal = c.parentGeometry;
    childFinal = c.childGeometry;
    parentConnector = {
      name: j.name + '_parent',
      origin: c.parentConnector.origin,
      axis: c.parentConnector.axis,
      clearanceRadius: c.parentConnector.clearanceRadius,
    };
    childConnector = {
      name: j.name + '_child',
      origin: c.childConnector.origin,
      axis: c.childConnector.axis,
      clearanceRadius: c.childConnector.clearanceRadius,
    };
    capacity = { structure: c.structural as ClevisStructure };
  } else {
    const c = buildCollarJoint(parentShape, childRaw, j);
    const st = collarStyle(j);
    parentFinal = c.parent;
    childFinal = c.child;
    parentConnector = {
      name: j.name + '_parent',
      origin: j.xyz,
      axis: j.axis,
      clearanceRadius: st.collarInner,
    };
    childConnector = {
      name: j.name + '_child',
      origin: [0, 0, 0],
      axis: j.axis,
      clearanceRadius: st.collarInner,
    };
    capacity = undefined;
  }

  shapes.set(j.parent, parentFinal);
  shapes.set(j.child, childFinal);
  connectorSpecs.get(j.parent)!.push(parentConnector);
  connectorSpecs.get(j.child)!.push(childConnector);
  mateSpecs.push({
    name: j.name,
    parent: j.parent,
    child: j.child,
    pose: j.pose,
    limitsDeg: j.limitsDeg,
    capacity,
  });
}

const refs = new Map<string, ReturnType<typeof rp1.part>>();
for (const link of Object.keys(linkSpecs)) {
  const shape = shapes.get(link);
  if (shape === undefined) throw new Error(`link ${link} has no solved shape`);
  const part = rp1.part(link, shape.color(linkSpecs[link].color as `#${string}`));
  refs.set(link, part);
  for (const c of connectorSpecs.get(link) ?? []) {
    part.connector(c.name, {
      type: 'axis',
      origin: { kind: 'vec3', value: c.origin },
      axis: c.axis,
      jointClearanceRadius: c.clearanceRadius,
    });
  }
}

for (const m of mateSpecs) {
  rp1.mate(m.name, m.parent + '.' + m.name + '_parent', m.child + '.' + m.name + '_child', 'revolute', {
    pose: m.pose,
    limitsDeg: m.limitsDeg,
    exposure: 'concealed',
    ...(m.capacity === undefined ? {} : { capacity: m.capacity }),
  });
}

// Demo timeline: the waist swings through its URDF range while the mates carry the chain.
animationView({ param: 'waist_yawDeg', from: -60, to: 60, durationMs: 4000, fps: 15 });

return rp1.solvedModel({});
