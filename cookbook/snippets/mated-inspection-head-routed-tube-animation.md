---
id: mated-inspection-head-routed-tube-animation
title: 2-DOF pan/tilt inspection head with a rigid routed service tube and animationView
tags: [assembly, connector, mate, revolute, joint, kinematic, parameter, actuator, tube, route, sweep, material]
keywords:
  - pan tilt inspection head
  - two DOF inspection head
  - yaw stage tilt yoke
  - mated revolute inspection head
  - routed service tube
  - rigid swept tube fastened to moving head
  - not a flexible hose
  - animationView inspection cycle
  - param yawDeg tiltDeg co-located
  - mechanicalJoint mechanism real
  - bend radius circular sweep
when_to_use: >-
  Prompt asks for a production 2-DOF pan/tilt inspection head: grounded
  base, yaw stage, tilt yoke with cheeks and a servo shelf fused into the
  parent solid, two revolute mates with limits, mechanicalJoint intent, and
  a rigid swept service tube fastened to the moving head (NOT a flexible
  hose). Declare yawDeg and tiltDeg with param() in the same block as
  animationView — tracks must name those live params; dropping param()
  while keeping tracks throws animation.param.unknown. Prefer design_loop
  until evaluate_script reports mechanism=real, then open_in_studio and
  capture_animation from a file with pose-interference verification.
  Closed-loop FK and joint.scissorLift are unsupported — stop and say so.
---

2-DOF open-chain inspection head. The service tube is a rigid swept solid
owned by the tilt head through a fastened mate. It is not a flexible hose,
a tensioned cable, or a closed-loop linkage. Do not invent
`joint.scissorLift`.

`param('yawDeg')` / `param('tiltDeg')` sit in the same block as
`animationView`. Track strings are not linked to mate poses: a rewrite that
inlines the angles and keeps the tracks fails with `animation.param.unknown`
and `featureCount: 0`.

```typescript
// 2-DOF pan/tilt inspection head + rigid routed service tube.
// Tube is a swept solid fastened to the moving head — NOT a flexible hose.
// No joint.scissorLift and no closed-loop FK (unsupported).
// KEEP param() immediately beside animationView. Tracks must name those
// live numeric params; do not replace them with literals when rewriting.

const yawDeg = param('yawDeg', 18, { min: -70, max: 70 });
const tiltDeg = param('tiltDeg', 18, { min: -10, max: 35 });
animationView({
  name: 'inspection cycle',
  tracks: [
    {
      param: 'yawDeg',
      keys: [
        { atMs: 0, value: -25 },
        { atMs: 1400, value: 35, ease: 'easeInOut' },
        { atMs: 2800, value: -25, ease: 'easeInOut' },
      ],
    },
    {
      param: 'tiltDeg',
      keys: [
        { atMs: 0, value: 8 },
        { atMs: 1400, value: 30, ease: 'easeInOut' },
        { atMs: 2800, value: 8, ease: 'easeInOut' },
      ],
    },
  ],
  fps: 24,
});

const tiltZ = 78;
const headLen = 78;
const bendR = 10;
const tubeR = 3.1;
const arm = assembly('inspection-head-2dof');

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: number[], s: number) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: number[]) => { const n = len(a); return n < 1e-9 ? [0, 0, 0] : scale(a, 1 / n); };

function filletedRail(pts: number[][], R: number, arcSamples: number) {
  const rail: number[][] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const A = pts[i - 1], P = pts[i], B = pts[i + 1];
    const uIn = norm(sub(P, A)), uOut = norm(sub(B, P));
    const alpha = Math.acos(Math.min(1, Math.max(-1, dot(uIn, uOut))));
    if (alpha < 1e-6) continue;
    const d = R / Math.tan(alpha / 2);
    const T1 = sub(P, scale(uIn, d));
    const cr = cross(uIn, uOut);
    const center = add(T1, scale(norm(cross(cr, uIn)), R));
    const v0 = sub(T1, center), axis = norm(cr);
    for (let s = 0; s <= arcSamples; s += 1) {
      const ang = alpha * (s / arcSamples), c = Math.cos(ang), si = Math.sin(ang), k = dot(axis, v0);
      rail.push(add(center, add(add(scale(v0, c), scale(cross(axis, v0), si)), scale(axis, k * (1 - c)))));
    }
  }
  rail.push(pts[pts.length - 1]);
  return rail;
}

// Local waypoints: first segment +Z (profile in XY); rotateY(-90) maps onto tilt-head +X.
const tubeWaypoints = [[0, 0, 0], [0, 0, 36], [0, -14, 36], [12, -14, 36]];
const sampled = filletedRail(tubeWaypoints, bendR, 10);
const rail: number[][] = [sampled[0]];
for (let i = 1; i < sampled.length; i += 1) {
  const p = sampled[i], q = rail[rail.length - 1];
  if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-4) rail.push(p);
}
const tubeSolid = path()
  .circle(0, 0, tubeR, 24)
  .sweep(rail, { spine: 'polyline', transitionMode: 'round' })
  .rotateY(-90);

function roundPlate(w: number, d: number, r: number, t: number, x: number, y: number, z: number) {
  return extrudeRoundedRect(w, d, r, t).translate(x, y, z);
}

// Hobby-servo stand-in: rounded body, mounting ears, short output boss.
// Built with its origin at the body center.
function servoBody(w: number, d: number, h: number) {
  const earT = Math.min(5, d * 0.4);
  return extrudeRoundedRect(w, d, Math.min(3, d * 0.2), h).translate(0, 0, -h / 2)
    .union(extrudeRoundedRect(w + 10, earT, 1.4, 2.6).translate(0, 0, h / 2 - 2.6))
    .union(cylinder(3.4, Math.min(5.5, d * 0.32)).translate(0, -d / 2 + 1, 0));
}

const base = arm.part(
  'base-frame',
  roundPlate(124, 104, 14, 8, 0, 0, 0)
    .union(cylinder(34, 17).translate(0, 0, 6.5))
    .union(cylinder(3.4, 24).translate(0, 0, 39.5))
    .union(cylinder(5.2, 15).translate(0, 0, 42.2))
    .union(cylinder(1.4, 8).translate(0, 0, 47))
    .union(servoBody(34, 26, 22).translate(-48, 0, 18))
    .finish('aluminium-brushed'),
  { material: 'aluminum-6061' },
);
base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 48] }, axis: [0, 0, 1] });

const yawStage = arm.part(
  'yaw-stage',
  cylinder(32, 14).translate(0, 0, -1)
    .union(roundPlate(18, 54, 3, 8, 0, 0, 30))
    .union(roundPlate(20, 7, 2, 32, 0, 21, 14))
    .union(roundPlate(20, 7, 2, 32, 0, -21, 14))
    .union(roundPlate(12, 8, 2, 40, 0, 21, 6))
    .union(roundPlate(12, 8, 2, 40, 0, -21, 6))
    .union(roundPlate(32, 22, 3, 8, -16, 34, 24))
    .union(cylinder(16, 5).rotate([1, 0, 0], 90).translate(0, 8, tiltZ - 48))
    .finish('anodized', { color: '#8aa0ad' }),
  { material: 'aluminum-6061' },
);
yawStage.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
yawStage.connector('tilt', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, tiltZ - 48] }, axis: [0, 1, 0] });
yawStage.connector('tilt-servo-mount', { type: 'frame', origin: { kind: 'vec3', value: [-14, 32, tiltZ - 48] } });

const tiltServo = arm.part(
  'tilt-servo',
  servoBody(26, 18, 28).translate(-14, 32, tiltZ - 48).finish('abs', { color: '#243140' }),
  { material: 'nylon' },
);
tiltServo.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [-14, 32, tiltZ - 48] } });

const tiltHead = arm.part(
  'tilt-head',
  // Tube starts at x = 3, inside the r 4.2 tilt axle (from x = 10 the axle
  // and hubs floated off it: union.disconnected); its far end is unchanged.
  cylinder(headLen - 11, 6.2).rotate([0, 1, 0], 90).translate(3, 0, 0)
    .union(cylinder(92, 4.2).rotate([1, 0, 0], 90).translate(0, 46, 0))
    .union(cylinder(8, 8).rotate([1, 0, 0], 90).translate(0, 16, 0))
    .union(cylinder(8, 8).rotate([1, 0, 0], 90).translate(0, -10, 0))
    .union(cylinder(20, 11).rotate([0, 1, 0], 90).translate(headLen - 8, 0, -5))
    .union(cylinder(3, 13).rotate([0, 1, 0], 90).translate(headLen + 6, 0, -5))
    .subtract(cylinder(6, 6).rotate([0, 1, 0], 90).translate(headLen + 8, 0, -5))
    .union(cylinder(14, 5.2).translate(46, 0, 0))
    .finish('anodized', { color: '#d5dde3' }),
  { material: 'aluminum-6061' },
);
tiltHead.connector('tilt', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
tiltHead.connector('tube-mount', { type: 'frame', origin: { kind: 'vec3', value: [48, 0, 10] } });

const serviceTube = arm.part(
  'service-tube',
  tubeSolid.translate(48, 0, 10).finish('abs', { color: '#e07a3d' }),
  { material: 'nylon' },
);
serviceTube.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [48, 0, 10] } });

arm.mate('base-yaw', 'base-frame.yaw', 'yaw-stage.yaw', 'revolute', { pose: yawDeg, limitsDeg: [-70, 70] });
arm.mate('tilt-pitch', 'yaw-stage.tilt', 'tilt-head.tilt', 'revolute', { pose: tiltDeg, limitsDeg: [-10, 35] });
arm.mate('tilt-servo-fix', 'yaw-stage.tilt-servo-mount', 'tilt-servo.mount', 'fastened');
arm.mate('tube-fix', 'tilt-head.tube-mount', 'service-tube.mount', 'fastened');

arm.mechanicalJoint('yaw-drive', {
  mate: 'base-yaw', actuator: 'base-frame', shaft: 'base-frame', supports: ['base-frame'], output: 'yaw-stage',
  requiredSupport: { kind: 'bearing', around: 'base-frame.yaw', supports: ['base-frame'], minBearingLengthMm: 18 },
});
arm.mechanicalJoint('tilt-drive', {
  mate: 'tilt-pitch', actuator: 'tilt-servo', shaft: 'yaw-stage', supports: ['yaw-stage'], output: 'tilt-head',
  requiredSupport: { kind: 'hinge-bracket', around: 'yaw-stage.tilt', supports: ['yaw-stage'], minBearingLengthMm: 28 },
});

// After evaluate_script ok + mechanism=real: open_in_studio, then
// capture_animation({ file }) with pose-interference verification on.
// Report collisions even if a video is written. Do not claim a flexible hose.

return arm.solvedModel({}, {
  ignore: [
    ['base-frame', 'yaw-stage'], ['yaw-stage', 'tilt-head'], ['yaw-stage', 'tilt-servo'],
    ['tilt-servo', 'tilt-head'], ['tilt-head', 'service-tube'], ['yaw-stage', 'service-tube'],
    ['base-frame', 'service-tube'], ['tilt-servo', 'service-tube'],
  ],
});
```
