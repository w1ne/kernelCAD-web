// SPDX-License-Identifier: CC0-1.0
// Treadmill: a home/club motorised treadmill. What makes it one: a long low
// deck with a dark running belt between aluminium side rails, wrapped round a
// front and a rear roller; a moulded motor hood at the front end; two uprights
// rising from the hood to a tilted console with a screen, buttons and a red
// safety key; and two handrails running back from the console with foam grips.
// Generic visualization geometry at about real size (about 1.9 m long, 0.82 m
// wide, 1.4 m tall), millimetres, Z up, the runner faces +X, lowest point on
// z = 0.
meta({
  name: 'treadmill',
  license: 'CC0-1.0',
  title: 'Treadmill',
  description: "Motorised treadmill: running belt between aluminium side rails over front and rear rollers, moulded motor hood, uprights to a tilted console with screen, buttons and safety key, and foam-gripped handrails. Material controls: frame steel, running belt rubber, console glass, hood plastic; clubColors, homeWhite and weathered presets.",
  tags: ['treadmill', 'running machine', 'cardio', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const frameSteel = param('frameSteel', '#9aa4a9', { label: 'Frame steel' });
const runningBeltRubber = param('runningBeltRubber', '#282d31', { label: 'Running belt rubber' });
const consoleGlass = param('consoleGlass', '#4fb3d9', { label: 'Console glass' });
const hoodPlastic = param('hoodPlastic', '#30353a', { label: 'Hood and console plastic' });
presets({
  clubColors: { frameSteel: '#496b52', runningBeltRubber: '#282d31', hoodPlastic: '#2f3a34' },
  homeWhite: { frameSteel: '#c9cdd0', runningBeltRubber: '#33373a', consoleGlass: '#4f8fb5', hoodPlastic: '#e6e7e4' },
  weathered: { frameSteel: '#6f7470', runningBeltRubber: '#3a3a37', consoleGlass: '#7d9a9f', hoodPlastic: '#56585a' },
});

const p = assembly('treadmill');
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Round bar from p0 to p1.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Side profile [[x, z], ...] extruded symmetrically across Y.
const sideXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Cylinder lying across the deck (axis Y), centred on y = 0.
const acrossY = (r, len, n = 14) => cylinder(len, r, n).rotateX(90).translate(0, len / 2, 0);

const DECK_Z = 170;   // running surface height
const REAR_X = -920;
const FRONT_X = 560;  // front roller, under the hood
const BELT_W = 520;

// Running deck: belt over the board, wrapped round both rollers.
add('running-belt', box(FRONT_X - REAR_X, BELT_W, 10, true).translate((FRONT_X + REAR_X) / 2, 0, DECK_Z - 5).color(runningBeltRubber));
add('belt-underside', box(FRONT_X - REAR_X, BELT_W, 8, true).translate((FRONT_X + REAR_X) / 2, 0, DECK_Z - 86).color(runningBeltRubber));
add('rear-roller', acrossY(42, BELT_W + 20).translate(REAR_X, 0, DECK_Z - 45).color(runningBeltRubber));
add('front-roller', acrossY(42, BELT_W + 20).translate(FRONT_X, 0, DECK_Z - 45).color(runningBeltRubber));
add('deck-board', box(FRONT_X - REAR_X, BELT_W - 20, 18, true).translate((FRONT_X + REAR_X) / 2, 0, DECK_Z - 20).color(hoodPlastic));

// Side frame rails with flat aluminium foot rails on top.
for (const s of [-1, 1]) {
  add(`side-rail-${s < 0 ? 'left' : 'right'}`, sideXZ([
    [REAR_X - 40, 40], [FRONT_X + 120, 40], [FRONT_X + 120, DECK_Z - 10], [REAR_X - 10, DECK_Z - 10], [REAR_X - 40, DECK_Z - 40],
  ], 40).translate(0, s * (BELT_W / 2 + 30), 0).color(frameSteel));
  add(`foot-rail-${s < 0 ? 'left' : 'right'}`, box(FRONT_X - REAR_X - 80, 90, 14, true).translate((FRONT_X + REAR_X) / 2 - 40, s * (BELT_W / 2 + 55), DECK_Z + 2).color(frameSteel));
  add(`rear-end-cap-${s < 0 ? 'left' : 'right'}`, sideXZ([
    [REAR_X - 60, 0], [REAR_X + 40, 0], [REAR_X + 40, DECK_Z + 10], [REAR_X - 20, DECK_Z + 10], [REAR_X - 60, DECK_Z - 40],
  ], 70).translate(0, s * (BELT_W / 2 + 70), 0).color(hoodPlastic));
  add(`levelling-foot-${s < 0 ? 'left' : 'right'}`, cylinder(40, 30, 10).translate(-300, s * (BELT_W / 2 + 30), 0).color(runningBeltRubber));
  add(`transport-wheel-${s < 0 ? 'left' : 'right'}`, cylinder(30, 42, 14).rotateX(90).translate(FRONT_X + 210, s * (BELT_W / 2 + 70) + 15, 42).color(runningBeltRubber));
}
add('rear-crossbar', acrossY(18, BELT_W + 120).translate(REAR_X + 10, 0, 30).color(frameSteel));

// Motor hood: rounded moulding over the front roller and drive motor.
add('motor-hood', sideXZ([
  [FRONT_X - 140, DECK_Z + 4], [FRONT_X - 110, DECK_Z + 70], [FRONT_X - 20, DECK_Z + 120], [FRONT_X + 160, DECK_Z + 125],
  [FRONT_X + 260, DECK_Z + 70], [FRONT_X + 280, 20], [FRONT_X + 120, 20], [FRONT_X + 120, DECK_Z + 4],
], BELT_W + 230).color(hoodPlastic));
add('hood-badge', box(8, 160, 30, true).rotateY(-25).translate(FRONT_X + 266, 0, DECK_Z + 50).color(frameSteel));

// Uprights rising from the hood sides, leaning slightly forward, to the console.
const UP_Y = BELT_W / 2 + 85;
const consoleX = FRONT_X + 260;
const consoleZ = 1240;
for (const s of [-1, 1]) {
  add(`upright-${s < 0 ? 'left' : 'right'}`, rod([FRONT_X + 60, s * UP_Y, DECK_Z + 40], [consoleX - 40, s * UP_Y, consoleZ - 60], 32, 12).color(frameSteel));
  // Handrail runs back towards the runner, then turns down at the end.
  const railZ = 1080;
  add(`handrail-${s < 0 ? 'left' : 'right'}`, rod([consoleX - 60, s * (UP_Y + 20), consoleZ - 80], [FRONT_X - 240, s * (UP_Y + 20), railZ], 18, 10).color(frameSteel));
  add(`handrail-grip-${s < 0 ? 'left' : 'right'}`, rod([FRONT_X - 40, s * (UP_Y + 20), railZ + 20], [FRONT_X - 250, s * (UP_Y + 20), railZ - 1], 24, 10).color(runningBeltRubber));
  add(`pulse-sensor-${s < 0 ? 'left' : 'right'}`, rod([FRONT_X + 90, s * (UP_Y + 20), railZ + 40], [FRONT_X + 10, s * (UP_Y + 20), railZ + 30], 26, 10).color(frameSteel));
}

// Console: tilted moulding facing the runner, screen, button row and safety key.
add('console-body', sideXZ([
  [consoleX - 150, consoleZ - 80], [consoleX + 70, consoleZ - 110], [consoleX + 110, consoleZ - 10],
  [consoleX + 30, consoleZ + 170], [consoleX - 70, consoleZ + 170], [consoleX - 190, consoleZ - 30],
], 2 * UP_Y + 80).color(hoodPlastic));
// The runner-facing face rises at about 59 degrees; u runs up the face, v across it.
const onFace = (shape, u, v, lift) => shape.rotateY(31).translate(consoleX - 190 + 0.515 * u - 0.857 * lift, v, consoleZ - 30 + 0.857 * u + 0.515 * lift);
add('screen-bezel', onFace(box(6, 500, 170, true), 140, 0, 2).color(frameSteel));
add('console-screen', onFace(box(6, 430, 130, true), 140, 0, 5).color(consoleGlass));
for (let i = 0; i < 6; i++) {
  add(`speed-button-${i + 1}`, onFace(box(10, 38, 26, true), 36, (i - 2.5) * 56, 4).color(i < 3 ? frameSteel : consoleGlass));
}
add('safety-key', onFace(cylinder(16, 20, 12).rotateY(90).translate(-8, 0, 0), 40, UP_Y - 10, 4).color('#c7342c'));
add('bottle-tray', box(110, 2 * UP_Y - 80, 30, true).translate(consoleX - 190, 0, consoleZ - 90).color(hoodPlastic));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
