// SPDX-License-Identifier: CC0-1.0
// Gym bench: an adjustable flat/incline/decline (FID) weight bench. What makes
// it one: a single square-tube spine between a front and a rear stabiliser
// foot; a short seat pad and a long backrest pad, upholstered over dark
// boards, hinged next to each other; a back support arm that drops into a
// toothed adjustment ladder on the spine; transport wheels on the front foot
// and a carry handle at the rear. The backrest position is a real control.
// Generic visualization geometry at about real size (about 1.35 m long,
// 0.62 m wide, seat 0.44 m high), millimetres, Z up, lowest point on z = 0.
meta({
  name: 'gym-bench',
  license: 'CC0-1.0',
  title: 'Gym bench',
  description: "Adjustable FID weight bench: square-tube spine on front and rear stabiliser feet, upholstered seat and backrest pads on dark boards, back support arm in a toothed adjustment ladder, transport wheels and rear handle. Controls: backrest position (flat, 30-degree incline, 55-degree steep, 80-degree upright), vinyl upholstery, frame steel, foot rubber, adjuster accent; clubColors, homeBlack and weathered presets.",
  tags: ['gym bench', 'weight bench', 'adjustable bench', 'incline bench', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const backPosition = param('backPosition', 'incline', { choices: ['flat', 'incline', 'steep', 'upright'], label: 'Backrest position' });
const backIncline = { flat: 0, incline: 30, steep: 55, upright: 80 }[backPosition.value];
const vinylUpholstery = param('vinylUpholstery', '#2f3a44', { label: 'Vinyl upholstery' });
const frameSteel = param('frameSteel', '#c4362f', { label: 'Frame steel (powder coat)' });
const footRubber = param('footRubber', '#30363a', { label: 'Foot rubber and pad boards' });
const adjusterAccent = param('adjusterAccent', '#b9c2c6', { label: 'Adjuster and pin metal' });
presets({
  clubColors: { vinylUpholstery: '#87463d', frameSteel: '#8e999d' },
  homeBlack: { vinylUpholstery: '#25282b', frameSteel: '#3a3f44', adjusterAccent: '#d7a63a' },
  weathered: { vinylUpholstery: '#4a4542', frameSteel: '#8a5a50', footRubber: '#3b3b38', adjusterAccent: '#8b8f8c' },
});

const p = assembly('gym-bench');
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Square tube or round bar from p0 to p1.
const orient = (shape, p0, p1) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return { len, place: (s) => s.rotateY((Math.acos(d[2] / len) * 180) / Math.PI).rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI).translate(p0[0], p0[1], p0[2]) };
};
const squareTube = (p0, p1, w) => { const o = orient(null, p0, p1); return o.place(box(w, w, o.len, true).translate(0, 0, o.len / 2)); };
const rod = (p0, p1, r, n = 10) => { const o = orient(null, p0, p1); return o.place(extrudePolygon(circle(r, n), o.len)); };
// Rounded-corner pad outline in XY, length along +X from 0, width centred on Y.
const padOutline = (len, w, r) => {
  const pts = [];
  const corners = [[len - r, w / 2 - r, 0], [r, w / 2 - r, 90], [r, -w / 2 + r, 180], [len - r, -w / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= 3; k++) {
      const a = ((a0 + k * 30) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};
// Pad on its board, laid along +X from the hinge, tilted up by `deg`.
const pad = (name, len, w, deg, hinge) => {
  const tilt = (s) => s.rotateY(-deg).translate(hinge[0], 0, hinge[1]);
  add(`${name}-board`, tilt(extrudePolygon(padOutline(len, w - 10, 30), 16)).color(footRubber));
  add(`${name}-cushion`, tilt(extrudePolygon(padOutline(len, w, 50), 64).translate(0, 0, 16)).color(vinylUpholstery));
  add(`${name}-piping`, tilt(extrudePolygon(padOutline(len + 6, w + 6, 52), 6).translate(-3, 0, 44)).color(footRubber));
};

const SPINE_Z = 150;
const FRONT_X = -560;
const REAR_X = 640;
const HINGE_X = -60;
const PAD_Z = 360;

// Spine and stabiliser feet.
add('spine', squareTube([FRONT_X - 35, 0, SPINE_Z], [REAR_X + 35, 0, SPINE_Z], 70).color(frameSteel));
add('rear-post', squareTube([REAR_X, 0, 80], [REAR_X, 0, SPINE_Z], 70).color(frameSteel));
add('front-foot', box(80, 600, 70, true).translate(FRONT_X, 0, 45).color(frameSteel));
add('rear-foot', box(80, 480, 70, true).translate(REAR_X, 0, 45).color(frameSteel));
for (const s of [-1, 1]) {
  add(`front-end-cap-${s < 0 ? 'left' : 'right'}`, box(84, 20, 74, true).translate(FRONT_X, s * 305, 45).color(footRubber));
  add(`front-wheel-${s < 0 ? 'left' : 'right'}`, cylinder(36, 50, 14).rotateX(90).translate(FRONT_X - 70, s * 270 + 18, 50).color(footRubber));
  add(`rear-pad-${s < 0 ? 'left' : 'right'}`, box(90, 70, 10, true).translate(REAR_X, s * 200, 5).color(footRubber));
  add(`front-pad-${s < 0 ? 'left' : 'right'}`, box(90, 70, 10, true).translate(FRONT_X, s * 250, 5).color(footRubber));
}
add('front-post', squareTube([FRONT_X + 20, 0, 80], [FRONT_X + 20, 0, SPINE_Z + 40], 70).color(frameSteel));
add('rear-handle', rod([REAR_X + 40, -150, 80], [REAR_X + 170, -150, 120], 16).color(adjusterAccent));
add('rear-handle-2', rod([REAR_X + 40, 150, 80], [REAR_X + 170, 150, 120], 16).color(adjusterAccent));
add('rear-handle-grip', rod([REAR_X + 170, -170, 120], [REAR_X + 170, 170, 120], 18).color(footRubber));

// Seat: short pad on a post, slightly raised at the front edge.
add('seat-post', squareTube([HINGE_X - 170, 0, SPINE_Z - 20], [HINGE_X - 170, 0, PAD_Z - 10], 60).color(frameSteel));
add('seat-bracket', box(260, 120, 20, true).translate(HINGE_X - 170, 0, PAD_Z - 10).color(frameSteel));
pad('seat', 340, 300, -8, [HINGE_X - 350, PAD_Z - 8]);

// Backrest hinged just behind the seat and lifted by the support arm.
const inc = (backIncline * Math.PI) / 180;
add('hinge-bracket', squareTube([HINGE_X, 0, SPINE_Z], [HINGE_X, 0, PAD_Z - 20], 50).color(frameSteel));
add('hinge-pin', rod([HINGE_X, -45, PAD_Z - 20], [HINGE_X, 45, PAD_Z - 20], 12).color(adjusterAccent));
pad('backrest', 800, 300, backIncline, [HINGE_X, PAD_Z - 8]);

// Support arm from under the backrest down into the adjustment ladder.
const ARM_AT = 380;
const armTop = [HINGE_X + ARM_AT * Math.cos(inc) + 20 * Math.sin(inc), 0, PAD_Z - 20 + ARM_AT * Math.sin(inc) - 20 * Math.cos(inc)];
const LADDER_X0 = HINGE_X + 180;
const LADDER_LEN = 340;
const notch = Math.round(Math.min(1, Math.max(0, (backIncline - 0) / 80)) * 5);
const armFoot = [LADDER_X0 + 20 + (5 - notch) * 56, 0, SPINE_Z + 60];
add('support-arm', squareTube(armFoot, armTop, 50).color(frameSteel));
add('arm-roller', rod([armFoot[0], -50, armFoot[2]], [armFoot[0], 50, armFoot[2]], 18, 12).color(adjusterAccent));
add('ladder-base', box(LADDER_LEN, 110, 16, true).translate(LADDER_X0 + LADDER_LEN / 2, 0, SPINE_Z + 43).color(adjusterAccent));
for (let i = 0; i < 6; i++) {
  for (const s of [-1, 1]) {
    add(`ladder-tooth-${i + 1}-${s < 0 ? 'l' : 'r'}`, extrudePolygon([[-22, 0], [22, 0], [8, 40], [-8, 40]], 10).rotateX(90).translate(LADDER_X0 + 20 + i * 56, s * 50 + 5, SPINE_Z + 51).color(adjusterAccent));
  }
}
add('pop-pin', rod([HINGE_X - 170, -60, SPINE_Z + 120], [HINGE_X - 170, -110, SPINE_Z + 120], 12).color(adjusterAccent));
add('pop-pin-knob', cylinder(24, 22, 12).rotateX(90).translate(HINGE_X - 170, -110, SPINE_Z + 120).color(footRubber));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
