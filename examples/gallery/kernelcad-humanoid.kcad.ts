// kernelCAD humanoid: a parametric 13-joint blockout authored entirely in kernelCAD.
// Every link is a primitive (box, cylinder, sphere) built in its own joint frame and
// placed by a revolute mate, so the chain moves when a joint param changes.
// These are PLACEHOLDER blockouts for kinematics, not catalog geometry: no vendor
// model is used. Each link stops 2 mm short of its joint so mated parts do not overlap.
// Units: millimetres. Front is +X, left is +Y, up is +Z.

const graphite = '#34383d';
const anodized = '#a8b3bd';
const shellWhite = '#f2f3f4';
const rubber = '#202326';

// Joint controls (degrees). Left and right limbs share one control per joint.
const waist_yawDeg = param('waist_yawDeg', 0, { min: -60, max: 60, description: 'waist yaw (deg)' });
const neck_pitchDeg = param('neck_pitchDeg', 0, { min: -30, max: 30, description: 'neck pitch (deg)' });
const shoulder_pitchDeg = param('shoulder_pitchDeg', 0, { min: -90, max: 120, description: 'shoulder pitch, forward positive (deg)' });
const elbowDeg = param('elbowDeg', 0, { min: 0, max: 120, description: 'elbow flexion (deg)' });
const hip_pitchDeg = param('hip_pitchDeg', 0, { min: -40, max: 90, description: 'hip pitch, forward positive (deg)' });
const kneeDeg = param('kneeDeg', 0, { min: 0, max: 120, description: 'knee flexion (deg)' });
const ankle_pitchDeg = param('ankle_pitchDeg', 0, { min: -30, max: 30, description: 'ankle pitch (deg)' });

// Link geometry, each in its own joint frame: the joint is at the origin, a leg or
// arm hangs along -Z, and the torso and head rise along +Z.
const parts = {
  pelvis: box(160, 180, 60, true).color(graphite),
  torso: box(120, 180, 238).translate(-60, -90, 2).color(shellWhite),
  head: cylinder(38, 22).translate(0, 0, 2).union(sphere(90).translate(0, 0, 125)).color(graphite),
  upper_arm_L: cylinder(256, 40).translate(0, 0, -258).color(anodized),
  upper_arm_R: cylinder(256, 40).translate(0, 0, -258).color(anodized),
  forearm_L: cylinder(226, 32).translate(0, 0, -228).color(graphite),
  forearm_R: cylinder(226, 32).translate(0, 0, -228).color(graphite),
  thigh_L: cylinder(298, 42).translate(0, 0, -300).color(graphite),
  thigh_R: cylinder(298, 42).translate(0, 0, -300).color(graphite),
  shin_L: cylinder(298, 36).translate(0, 0, -300).color(anodized),
  shin_R: cylinder(298, 36).translate(0, 0, -300).color(anodized),
  foot_L: box(180, 80, 36).translate(-50, -40, -38).color(rubber),
  foot_R: box(180, 80, 36).translate(-50, -40, -38).color(rubber),
};

const humanoid = assembly('kernelcad-humanoid');
const refs: Record<string, ReturnType<typeof humanoid.part>> = {};
for (const [name, shape] of Object.entries(parts)) refs[name] = humanoid.part(name, shape);

// Each joint: a parent connector (in the parent frame) and a child connector at the
// child origin, on the same axis. Right-side joints use the mirrored axis so motion is symmetric.
type Joint = { name: string; parent: string; child: string; xyz: [number, number, number]; axis: [number, number, number]; limitsDeg: [number, number]; pose: Editable<number> };
const joints: Joint[] = [
  { name: 'waist', parent: 'pelvis', child: 'torso', xyz: [0, 0, 30], axis: [0, 0, 1], limitsDeg: [-60, 60], pose: waist_yawDeg },
  { name: 'neck', parent: 'torso', child: 'head', xyz: [0, 0, 240], axis: [0, 1, 0], limitsDeg: [-30, 30], pose: neck_pitchDeg },
  { name: 'shoulder_L', parent: 'torso', child: 'upper_arm_L', xyz: [0, 130, 215], axis: [0, 1, 0], limitsDeg: [-90, 120], pose: shoulder_pitchDeg },
  { name: 'shoulder_R', parent: 'torso', child: 'upper_arm_R', xyz: [0, -130, 215], axis: [0, -1, 0], limitsDeg: [-90, 120], pose: shoulder_pitchDeg },
  { name: 'elbow_L', parent: 'upper_arm_L', child: 'forearm_L', xyz: [0, 0, -258], axis: [0, 1, 0], limitsDeg: [0, 120], pose: elbowDeg },
  { name: 'elbow_R', parent: 'upper_arm_R', child: 'forearm_R', xyz: [0, 0, -258], axis: [0, -1, 0], limitsDeg: [0, 120], pose: elbowDeg },
  { name: 'hip_L', parent: 'pelvis', child: 'thigh_L', xyz: [0, 46, -30], axis: [0, 1, 0], limitsDeg: [-40, 90], pose: hip_pitchDeg },
  { name: 'hip_R', parent: 'pelvis', child: 'thigh_R', xyz: [0, -46, -30], axis: [0, -1, 0], limitsDeg: [-40, 90], pose: hip_pitchDeg },
  { name: 'knee_L', parent: 'thigh_L', child: 'shin_L', xyz: [0, 0, -300], axis: [0, -1, 0], limitsDeg: [0, 120], pose: kneeDeg },
  { name: 'knee_R', parent: 'thigh_R', child: 'shin_R', xyz: [0, 0, -300], axis: [0, 1, 0], limitsDeg: [0, 120], pose: kneeDeg },
  { name: 'ankle_L', parent: 'shin_L', child: 'foot_L', xyz: [0, 0, -300], axis: [0, 1, 0], limitsDeg: [-30, 30], pose: ankle_pitchDeg },
  { name: 'ankle_R', parent: 'shin_R', child: 'foot_R', xyz: [0, 0, -300], axis: [0, -1, 0], limitsDeg: [-30, 30], pose: ankle_pitchDeg },
];

for (const j of joints) {
  refs[j.parent]!.connector(j.name + '_parent', { type: 'axis', origin: { kind: 'vec3', value: j.xyz }, axis: j.axis });
  refs[j.child]!.connector(j.name + '_child', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: j.axis });
  humanoid.mate(j.name, j.parent + '.' + j.name + '_parent', j.child + '.' + j.name + '_child', 'revolute', { pose: j.pose, limitsDeg: j.limitsDeg, exposure: 'concealed' });
}

animationView({ param: 'waist_yawDeg', from: -60, to: 60, durationMs: 4000, fps: 15 });

return humanoid.solvedModel({});
