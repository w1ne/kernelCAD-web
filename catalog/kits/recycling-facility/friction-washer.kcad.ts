// SPDX-License-Identifier: CC0-1.0
// Friction washer: the inclined high-speed paddle washer of a plastics wash
// line. Shredded flake drops in at the low end, a fast paddle shaft scrubs it
// against itself and the screen while spray water rinses it, and the clean
// flake is flung out of the high end while dirty water drains away below.
// What makes it that machine rather than a tank: a long tube tilted at about
// 21°, a helix of paddles on a central shaft (shown through the open
// inspection cover), a flared feed hopper at the low end, a spray-water
// header with drop nozzles along the top, a belt-guarded motor at the high
// end, a dirty-water tray under the screen section draining to a sump tank,
// and a discharge chute into a flake tote.
// Generic visualization geometry at about real size (4.3 m long, discharge
// end at 2.1 m), millimetres, Z up, feed end on -X, front on -Y.

meta({
  name: "friction-washer",
  license: 'CC0-1.0',
  title: "Friction washer",
  description: "Inclined high-speed friction washer for plastic flake at about real size: tilted tube with a helix of paddles on the shaft behind an open (or closed) inspection cover, flared feed hopper with flake, spray-water header with drop nozzles, belt-guarded drive motor at the high end, dirty-water tray draining to a sump tank and a discharge chute into a flake tote. Material controls: frame paint, stainless tube, drive paint and plastic flake. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "friction washer", "plastics washing", "wash line", "flake", "pet", "hdpe", "paddle washer", "materials recovery", "waste management", "plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#41627a', { label: 'Stand and tray (paint)' });
const tube = param('tube', '#bfc6c8', { label: 'Washer tube and hopper (stainless)' });
const drive = param('drive', '#2f7d4f', { label: 'Motor and bearings (paint)' });
const flake = param('flake', '#7fc2e0', { label: 'Plastic flake' });
const cover = param('cover', 'open', { choices: ['open', 'closed'], label: 'Inspection cover' });

presets({
  plant: { frame: '#41627a', tube: '#bfc6c8', drive: '#2f7d4f', flake: '#7fc2e0' },
  weathered: { frame: '#56605f', tube: '#a2a8a6', drive: '#4f5e52', flake: '#9fb4a6' },
  hdpeLine: { frame: '#3a3f44', tube: '#c8cdcf', drive: '#2f5d9a', flake: '#e8e2cc' },
  highVisibility: { frame: '#f0c419', tube: '#c8cdcf', drive: '#c8322a', flake: '#5fb95f' },
});

const p = assembly("friction-washer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const loftXY = (sections: [number, number, number][], x: number, y = 0) => rect(sections[0][1], sections[0][2]).loft(sections.slice(1).map(([, w, d]) => rect(w, d)), {
  planes: sections.map(([z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
  ruled: true,
});
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const dark = '#2b2f33';
const water = '#5b8fb0';

// The washer is built along local +X on its own axis, then tilted up into place.
const X0 = -1800, Z0 = 700, RISE = 1400, RUN = 3600;
const A = Math.atan2(RISE, RUN), ANG = (A * 180) / Math.PI, L = Math.hypot(RISE, RUN);
const R = 350;
const T = (s: Shape) => s.rotateY(-ANG).translate(X0, 0, Z0);
const axisZ = (x: number) => Z0 + (x - X0) * Math.tan(A);
const open = cover.value === 'open';

// Tube: a hollow stainless shell with end plates; the open cover is a window cut in its top.
let shell = cylinder(L, R, 20).rotateY(90).subtract(cylinder(L + 40, R - 14, 20).rotateY(90).translate(-20, 0, 0));
if (open) shell = shell.subtract(blk(L / 2 + 250, 0, R * 0.3, L - 1500, 2 * R + 60, R));
add("tube", T(shell).color(tube));
for (const x of [-40, L]) add(`end-plate-${x > 0 ? 'top' : 'feed'}`, T(cylinder(40, R + 40, 20).rotateY(90).translate(x, 0, 0)).color(tube));
for (const x of [1000, 2000, 3000]) add(`band-${x}`, T(cylinder(30, R + 18, 20).rotateY(90).translate(x, 0, 0)).color(frame));
if (open) {
  for (const y of [-1, 1]) add(`cover-flange-${y > 0 ? 'b' : 'f'}`, T(blk(L / 2 + 250, y * (R - 10), R * 0.3, L - 1500, 40, 30)).color(frame));
} else {
  for (const x of [1300, 2200, 3100]) add(`hatch-${x}`, T(blk(x, 0, R - 40, 700, 440, 70)).color(tube));
  for (const x of [1300, 2200, 3100]) add(`hatch-handle-${x}`, T(blk(x, -150, R + 30, 300, 40, 40)).color(dark));
}

// Paddle shaft: a helix of paddles round a central shaft.
add("shaft", T(cylinder(L + 500, 70, 12).rotateY(90).translate(-250, 0, 0)).color(dark));
for (let k = 0; k < 20; k++) {
  add(`paddle-${k}`, T(box(70, 60, 2 * R - 90, true).rotateX(k * 37).rotateY(-12).translate(250 + k * ((L - 500) / 19), 0, 0)).color('#8f979c'));
}
if (open) add("flake-in-tube", T(blk(L / 2 + 300, 0, -R + 30, L - 1700, 2 * R * 0.72, 110)).color(flake));
for (const x of [-170, L + 130]) add(`bearing-${x > 0 ? 'top' : 'feed'}`, T(blk(x, 0, -110, 160, 260, 220)).color(drive));

// Spray-water header with drop nozzles along the top.
add("spray-header", T(cylinder(L - 600, 32, 10).rotateY(90).translate(300, -R + 120, R + 110)).color(water));
for (let k = 0; k < 7; k++) add(`spray-drop-${k}`, T(blk(500 + k * 520, -R + 120, R - 30, 36, 36, 140)).color(water));
add("water-valve", T(blk(240, -R + 120, R + 60, 120, 120, 120)).color('#c8322a'));

// Drive: motor on a bracket above the high end, belt guard on the end plate.
add("motor-bracket", T(blk(L - 260, 0, R - 20, 420, 360, 470)).color(frame));
add("motor", T(cylinder(560, 180, 16).rotateY(90).translate(L - 360, 0, 640)).color(drive));
add("motor-fan-cover", T(cylinder(60, 190, 16).rotateY(90).translate(L - 420, 0, 640)).color(dark));
add("terminal-box", T(blk(L - 100, -190, 600, 180, 60, 160)).color(drive));
add("belt-guard", T(blk(L + 260, 0, -160, 90, 360, 1000)).color('#f0c419'));

// Dirty-water tray under the screen section, draining to a sump tank.
const TX = 1900;
add("drain-tray", T(blk(TX, 0, -R - 230, 2000, 540, 230).subtract(blk(TX, 0, -R - 210, 1960, 500, 300))).color(frame));
add("drain-water", T(blk(TX, 0, -R - 200, 1960, 500, 50)).color('#6f7d62'));
const trayX = X0 + TX * Math.cos(A) + (R + 230) * Math.sin(A), trayZ = Z0 + TX * Math.sin(A) - (R + 230) * Math.cos(A);
add("drain-pipe", rod([trayX, 0, trayZ + 20], [trayX, 820, 640], 55).color(dark));
add("sump-tank", cylinder(620, 360, 18).translate(trayX, 820, 0).color(frame));
add("sump-rim", cylinder(40, 380, 18).translate(trayX, 820, 620).color(tube));
add("sump-water", cylinder(10, 340, 18).translate(trayX, 820, 600).color('#6f7d62'));

// Stand: two leg frames with cradles and a side brace.
for (const x of [-1450, 1450]) {
  const top = axisZ(x) - R / Math.cos(A) - 60;
  const tag = x > 0 ? 'top' : 'feed';
  for (const y of [-430, 430]) {
    add(`leg-${tag}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 120, 120, top).color(frame));
    add(`foot-${tag}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 220, 220, 20).color(frame));
  }
  add(`cradle-${tag}`, blk(x, 0, top, 160, 980, 140).color(frame));
  add(`cross-${tag}`, blk(x, 0, 300, 100, 860, 100).color(frame));
}
for (const y of [-430, 430]) add(`brace-${y > 0 ? 'b' : 'f'}`, rod([-1450, y, 380], [1450, y, axisZ(1450) - 700], 40, 8).color(frame));

// Feed hopper at the low end, with flake heaped in it.
const HX = -1420, HZ0 = axisZ(HX) + R - 60, HZ1 = 1900;
add("feed-hopper", loftXY([[HZ0, 620, 560], [HZ1 - 40, 1250, 1100], [HZ1, 1300, 1150]], HX)
  .subtract(loftXY([[HZ0 - 10, 560, 500], [HZ1 - 40, 1190, 1040], [HZ1 + 10, 1230, 1080]], HX)).color(tube));
add("hopper-rim", blk(HX, 0, HZ1, 1340, 1190, 40).subtract(blk(HX, 0, HZ1 - 10, 1230, 1080, 60)).color(frame));
add("hopper-flake", sphere(420).scale([1.35, 1.2, 0.35]).translate(HX, 0, HZ1 - 70).color(flake));

// Discharge chute from the high end into a wheeled flake tote.
const DX = 1640;
add("discharge-chute", loftXY([[1020, 320, 320], [1380, 520, 460], [axisZ(DX) - R / Math.cos(A) + 60, 600, 560]], DX)
  .subtract(loftXY([[1000, 280, 280], [1380, 480, 420], [axisZ(DX) - R / Math.cos(A) + 80, 560, 520]], DX)).color(tube));
add("tote", blk(DX, 0, 120, 1000, 900, 780).subtract(blk(DX, 0, 180, 940, 840, 800)).color('#3d6fb0'));
add("tote-flake", sphere(400).scale([1.15, 1.05, 0.45]).translate(DX, 0, 820).color(flake));
for (const x of [-1, 1]) for (const y of [-1, 1]) add(`tote-wheel-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, cylinder(50, 58, 12).rotateX(90).translate(DX + x * 400, y * 360 + 25, 56).subtract(blk(DX + x * 400, y * 360, -40, 140, 70, 40)).color(dark));

// Control box on a post at the feed end.
add("control-post", blk(-2350, -350, 0, 80, 80, 1250).color(frame));
add("control-box", blk(-2350, -440, 1000, 360, 160, 460).color('#d9d9d4'));
add("estop", cylinder(30, 48, 10).rotateX(90).translate(-2250, -520, 1360).color('#d62f2a'));
add("start-button", cylinder(25, 30, 10).rotateX(90).translate(-2440, -520, 1360).color('#2f9a4f'));
add("speed-dial", cylinder(20, 40, 10).rotateX(90).translate(-2350, -520, 1180).color(dark));

return p.model();
