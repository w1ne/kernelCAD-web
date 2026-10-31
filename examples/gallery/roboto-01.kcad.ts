// RoboParty ROBOTO 01 (RP1), authored from the official 24-DoF URDF.
// The 25 full-detail URDF visual STLs are bundled under roboto-01/meshes; see its NOTICE and MESH-SOURCES.txt.
// Source: https://github.com/Roboparty/RP1_description @ 84529a55649b5c9796d49093c266208c879f9f29
// Hardware license attribution per Andrii's decision: CERN-OHL-W-2.0 from
// https://github.com/Roboparty/rp1_hardware. See the adjacent NOTICE.
// Hub: https://roboparty.com/documents/roboto-01
// URDF SI translations are converted m -> mm; joint limits rad -> degrees.

const shellWhite = '#f2f3f4';
const graphite = '#34383d';
const anodized = '#a8b3bd';
const rubber = '#202326';
// Editable joint controls are declared below from the 24-DoF URDF.
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

type V3 = [number, number, number];
type Joint = { name: string; parent: string; child: string; xyz: V3; axis: V3; limitsDeg: [number, number]; pose: Editable<number> };
const joints: Joint[] = [
  { name: 'left_hip_pitch_joint', parent: 'base_link', child: 'left_hip_pitch_link', xyz: [-38.43, 62.987, -51.639], axis: [0.0, 1.0, 0.0], limitsDeg: [-163.865929, 163.865929], pose: left_hip_pitchDeg },
  { name: 'left_hip_roll_joint', parent: 'left_hip_pitch_link', child: 'left_hip_roll_link', xyz: [31.915, 61.254, -60.672], axis: [1.0, 0.0, 0.0], limitsDeg: [-42.398877, 148.969027], pose: left_hip_rollDeg },
  { name: 'left_hip_yaw_joint', parent: 'left_hip_roll_link', child: 'left_hip_yaw_link', xyz: [-12.698, 0.0, -129.0], axis: [0.0, 0.0, -1.0], limitsDeg: [-158.136351, 158.136351], pose: left_hip_yawDeg },
  { name: 'left_knee_joint', parent: 'left_hip_yaw_link', child: 'left_knee_link', xyz: [-33.201, -30.809, -165.09], axis: [0.0, -1.0, 0.0], limitsDeg: [-162.147056, 3.437747], pose: left_kneeDeg },
  { name: 'left_ankle_pitch_joint', parent: 'left_knee_link', child: 'left_ankle_pitch_link', xyz: [31.31, 30.811, -305.33], axis: [0.0, 1.0, 0.0], limitsDeg: [-44.690708, 34.950426], pose: left_ankle_pitchDeg },
  { name: 'left_ankle_roll_joint', parent: 'left_ankle_pitch_link', child: 'left_ankle_roll_link', xyz: [13.067, 0.0, -18.922], axis: [0.999993677858222, 0.0, 0.00355587451777954], limitsDeg: [-14.896903, 14.896903], pose: left_ankle_rollDeg },
  { name: 'right_hip_pitch_joint', parent: 'base_link', child: 'right_hip_pitch_link', xyz: [-38.43, -69.013, -51.639], axis: [0.0, -1.0, 0.0], limitsDeg: [-163.865929, 163.865929], pose: right_hip_pitchDeg },
  { name: 'right_hip_roll_joint', parent: 'right_hip_pitch_link', child: 'right_hip_roll_link', xyz: [31.915, -61.254, -60.672], axis: [1.0, 0.0, 0.0], limitsDeg: [-148.969027, 42.398877], pose: right_hip_rollDeg },
  { name: 'right_hip_yaw_joint', parent: 'right_hip_roll_link', child: 'right_hip_yaw_link', xyz: [-12.698, 0.0, -129.0], axis: [0.0, 0.0, -1.0], limitsDeg: [-158.136351, 158.136351], pose: right_hip_yawDeg },
  { name: 'right_knee_joint', parent: 'right_hip_yaw_link', child: 'right_knee_link', xyz: [-33.201, 30.808967, -165.090023], axis: [0.0, 1.0, 0.0], limitsDeg: [-3.437747, 162.147056], pose: right_kneeDeg },
  { name: 'right_ankle_pitch_joint', parent: 'right_knee_link', child: 'right_ankle_pitch_link', xyz: [31.31, -30.809, -305.33], axis: [0.0, 1.0, 0.0], limitsDeg: [-44.690708, 34.950426], pose: right_ankle_pitchDeg },
  { name: 'right_ankle_roll_joint', parent: 'right_ankle_pitch_link', child: 'right_ankle_roll_link', xyz: [13.067, 0.0, -18.922], axis: [0.999993677858222, 0.0, 0.00355587451777984], limitsDeg: [-14.896903, 14.896903], pose: right_ankle_rollDeg },
  { name: 'waist_roll_joint', parent: 'base_link', child: 'waist_roll_link', xyz: [-7.579949, -3.012699, 52.98383], axis: [1.0, 0.0, 0.0], limitsDeg: [-40.107046, 40.107046], pose: waist_rollDeg },
  { name: 'waist_yaw_joint', parent: 'waist_roll_link', child: 'waist_yaw_link', xyz: [-30.845, 0.0, 68.0], axis: [0.0, 0.0, -1.0], limitsDeg: [-166.730718, 166.730718], pose: waist_yawDeg },
  { name: 'left_shoulder_pitch_joint', parent: 'waist_yaw_link', child: 'left_shoulder_pitch_link', xyz: [0.0, 116.496195, 198.487156], axis: [0.0, 0.99619, 0.087156], limitsDeg: [-194.80565, 134.645082], pose: left_shoulder_pitchDeg },
  { name: 'left_shoulder_roll_joint', parent: 'left_shoulder_pitch_link', child: 'left_shoulder_roll_link', xyz: [28.743295, 65.349445, -14.608907], axis: [1.0, 0.0, 0.0], limitsDeg: [-26.929016, 166.157761], pose: left_shoulder_rollDeg },
  { name: 'left_shoulder_yaw_joint', parent: 'left_shoulder_roll_link', child: 'left_shoulder_yaw_link', xyz: [-19.057493, 0.0, -105.00004], axis: [0.0, 0.0, -1.0], limitsDeg: [-164.438887, 164.438887], pose: left_shoulder_yawDeg },
  { name: 'left_elbow_joint', parent: 'left_shoulder_yaw_link', child: 'left_elbow_link', xyz: [20.796, -31.888, -104.14], axis: [0.0, -1.0, 0.0], limitsDeg: [-91.673247, 71.046767], pose: left_elbowDeg },
  { name: 'left_wrist_joint', parent: 'left_elbow_link', child: 'left_wrist_link', xyz: [116.093382, 31.859446, -18.792758], axis: [1.0, 0.0, 0.0], limitsDeg: [-146.677196, 146.677196], pose: left_wristDeg },
  { name: 'right_shoulder_pitch_joint', parent: 'waist_yaw_link', child: 'right_shoulder_pitch_link', xyz: [0.0, -116.496195, 198.487156], axis: [0.0, -0.99619, 0.087156], limitsDeg: [-134.645082, 194.80565], pose: right_shoulder_pitchDeg },
  { name: 'right_shoulder_roll_joint', parent: 'right_shoulder_pitch_link', child: 'right_shoulder_roll_link', xyz: [28.743295, -65.349445, -14.608907], axis: [1.0, 0.0, 0.0], limitsDeg: [-166.157761, 26.929016], pose: right_shoulder_rollDeg },
  { name: 'right_shoulder_yaw_joint', parent: 'right_shoulder_roll_link', child: 'right_shoulder_yaw_link', xyz: [-19.057392, 0.0, -105.000126], axis: [0.0, 0.0, -1.0], limitsDeg: [-164.438887, 164.438887], pose: right_shoulder_yawDeg },
  { name: 'right_elbow_joint', parent: 'right_shoulder_yaw_link', child: 'right_elbow_link', xyz: [20.79568, 31.887526, -104.135223], axis: [0.0, 1.0, 0.0], limitsDeg: [-71.046767, 91.673247], pose: right_elbowDeg },
  { name: 'right_wrist_joint', parent: 'right_elbow_link', child: 'right_wrist_link', xyz: [116.093344, -31.85937, -18.79273], axis: [1.0, 0.0, 0.0], limitsDeg: [-146.677196, 146.677196], pose: right_wristDeg },
];

const rp1 = assembly('roboto-01-rp1');

// Each mesh stays in its link frame: URDF visual origins are identity, so the
// STL is already expressed relative to its link. The joint mates place every
// child at its parent's joint origin and drive it with the pose parameters, so
// no transform is pre-baked into the mesh (that would double-place the chain).
// The base_link visual includes the waist joint cover. It is painted anodized
// light grey so the open multi-shell cover reads as joint hardware instead of
// a blown-out white glue patch between the torso and hips.
// The geometry is untouched; only the finish changes.
const paintFor = (name: string) => name === 'base_link' ? anodized
  : name.includes('ankle_roll') ? rubber
  : name.includes('hip') || name.includes('shoulder') || name.includes('elbow') || name.includes('ankle_pitch') ? anodized
  : name.includes('waist') ? graphite
  : name.includes('knee') || name.includes('wrist') ? graphite : shellWhite;
// Geometry stays byte-identical to the upstream STL. Only the unit scale and
// the PBR finish are applied; no shape operations are allowed here.
const loadLink = async (name: string) =>
  (await lib.meshFromSTL(`./roboto-01/meshes/${name}.STL`))
    .scale(1000)
    .material({ baseColor: paintFor(name), metalness: 0.05, roughness: 0.75 });
const refs: Record<string, ReturnType<typeof rp1.part>> = {
  base_link: rp1.part('base_link', await loadLink('base_link')),
};
for (const j of joints) {
  refs[j.child] = rp1.part(j.child, await loadLink(j.child));
  // The parent connector sits at the URDF joint origin; the child connector is its local zero.
  refs[j.parent].connector(j.name + '_parent', { type: 'axis', origin: { kind: 'vec3', value: j.xyz }, axis: j.axis });
  refs[j.child].connector(j.name + '_child', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: j.axis });
  rp1.mate(j.name, j.parent + '.' + j.name + '_parent', j.child + '.' + j.name + '_child', 'revolute', { pose: j.pose, limitsDeg: j.limitsDeg, exposure: 'concealed' });
}

// Demo timeline: the waist swings through its URDF range while the mates carry the chain.
animationView({ param: 'waist_yawDeg', from: -60, to: 60, durationMs: 4000, fps: 15 });

return rp1.solvedModel({});
