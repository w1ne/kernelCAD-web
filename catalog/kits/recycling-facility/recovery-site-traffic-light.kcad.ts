// SPDX-License-Identifier: CC0-1.0
// Recovery-site traffic light: the red/green signal at the weighbridge that
// tells a lorry driver when to roll on and off the scale. What makes it a
// site signal rather than a post with a box: a two-aspect signal head with
// round lenses under tunnel visors, a black backboard with a white border,
// a galvanised pole on a bolted base flange and concrete plinth, a "wait
// for green" instruction sign under the head, an intercom call point at
// cab height, and a small controller cabinet with a cable duct at the foot.
// The lit aspect is a choice, so the same asset stands for stop or go.
// Generic visualization geometry at about real size (about 3.4 m tall),
// millimetres, Z up, lenses facing -Y.

meta({
  name: "recovery-site-traffic-light",
  license: 'CC0-1.0',
  title: "Recovery-site traffic light",
  description: "Weighbridge traffic signal at about real size: two-aspect red/green head with tunnel visors, black backboard with white border, galvanised pole on a flange and concrete plinth, wait-for-green sign, driver intercom call point and a foot-of-pole controller cabinet. Lit aspect choice (red, green). Material controls: pole, signal head, backboard border and sign, concrete plinth. standard, highVisibility and weathered presets.",
  tags: ['traffic light', 'traffic signal', 'weighbridge signal', 'red green signal', 'site entrance', 'reception', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pole = param('pole', '#a9b1b3', { label: 'Pole and flange (galvanised)' });
const head = param('head', '#1d1f21', { label: 'Signal head and backboard' });
const signage = param('signage', '#f2f1ea', { label: 'Backboard border and sign face' });
const concrete = param('concrete', '#a5a29a', { label: 'Plinth (concrete)' });
const aspect = param('aspect', 'red', { choices: ['red', 'green'], label: 'Lit aspect' });

presets({
  standard: { pole: '#a9b1b3', head: '#1d1f21', signage: '#f2f1ea', concrete: '#a5a29a' },
  highVisibility: { pole: '#e2b51e', head: '#1d1f21', signage: '#f4d33a', concrete: '#a5a29a' },
  weathered: { pole: '#8a8b84', head: '#2c2c2a', signage: '#d6d1bf', concrete: '#8c897f' },
});

const p = assembly("recovery-site-traffic-light");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const red = aspect.value === 'red';
const RED = red ? '#ff3b2a' : '#4a1612';
const GREEN = red ? '#103d22' : '#2fe36a';

const PZ = 3400;
const HZ = 2700;

// Plinth, base flange with bolts, and the pole.
add("plinth", blk(0, 0, 0, 600, 600, 150).color(concrete));
add("base-flange", blk(0, 0, 150, 340, 340, 20).color(pole));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(`anchor-nut-${sx}-${sy}`, cylinder(40, 22, 6).translate(sx * 130, sy * 130, 170).color(pole));
add("pole", cylinder(PZ - 170, 60, 16).translate(0, 0, 170).color(pole));
add("pole-cap", sphere(64).scale([1, 1, 0.5]).translate(0, 0, PZ).color(pole));

// Signal head: backboard with white border, housing, visors and lenses.
const HY = -150;
add("mount-bracket-top", blk(0, -80, HZ + 560, 80, 160, 50).color(head));
add("mount-bracket-low", blk(0, -80, HZ + 40, 80, 160, 50).color(head));
add("backboard-border", blk(0, HY + 70, HZ - 70, 560, 14, 790).color(signage));
add("backboard", blk(0, HY + 62, HZ - 40, 500, 14, 730).color(head));
add("housing", blk(0, HY, HZ, 300, 230, 650).color(head));
for (const [z, col, t] of [[HZ + 480, RED, 'red'], [HZ + 170, GREEN, 'green']]) {
  add(`lens-${t}`, cylinder(20, 105, 20).rotateX(90).translate(0, HY - 115, z).color(col));
  add(`visor-${t}`, cylinder(110, 128, 20).subtract(cylinder(130, 116, 20).translate(0, 0, -10)).subtract(blk(0, -200, -20, 400, 400, 260)).rotateX(90).translate(0, HY - 115, z).color(head));
}
// Instruction sign clamped to the pole below the head.
add("sign-clamp", blk(0, -70, 1850, 80, 80, 380).color(pole));
add("sign-face", blk(0, -115, 1720, 560, 10, 420).color(signage));
add("sign-band", blk(0, -122, 2000, 560, 4, 110).color('#c0302a'));
// "STOP" strip in the red band and two instruction lines below.
for (const [x, w] of [[-170, 70], [-60, 70], [50, 70], [160, 70]]) add(`sign-letter-${x}`, blk(x, -125, 2025, w, 3, 60).color(signage));
for (const [z, w] of [[1880, 440], [1820, 380], [1760, 420]]) add(`sign-line-${z}`, blk(0, -125, z, w, 3, 26).color(head));
add("sign-arrow", blk(0, -125, 1700, 60, 3, 120).color('#2a8c48'));

// Driver intercom call point at cab height on a short arm toward the lane.
add("intercom-arm", blk(-250, -40, 2150, 440, 60, 60).color(pole));
add("intercom-box", blk(-520, -40, 1950, 220, 160, 360).color('#d5a422'));
add("intercom-grille", blk(-520, -125, 2170, 140, 8, 90).color(head));
add("intercom-button", cylinder(20, 30, 12).rotateX(90).translate(-520, -122, 2040).color('#2a8c48'));
add("intercom-hood", blk(-520, -60, 2310, 260, 240, 24).color('#d5a422'));

// Controller cabinet and cable duct at the foot of the pole.
add("cabinet", blk(320, 120, 150, 260, 220, 640).color(pole));
add("cabinet-roof", blk(320, 120, 790, 300, 260, 30).color(pole));
add("cabinet-lock", cylinder(16, 14, 8).rotateX(90).translate(410, 10, 520).color(head));
add("cabinet-label", blk(300, 8, 600, 140, 4, 90).color('#e2b51e'));
add("cable-duct", blk(150, 50, 150, 140, 60, 80).color(head));

return p.model();
