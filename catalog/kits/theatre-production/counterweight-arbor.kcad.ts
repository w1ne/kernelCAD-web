// SPDX-License-Identifier: CC0-1.0
// Counterweight arbor: the weight carriage of a counterweight fly system. It
// runs up and down the side wall of the stage house in a T-track, balancing
// the batten of scenery or lights it is roped to.
// What makes it an arbor rather than a weight rack: two long arbor rods
// clamping a stack of notched cast-iron bricks between a top and a bottom
// plate, galvanised spreader plates every few bricks, a locking collar on the
// rods above the stack, nylon guide shoes riding on the T-track bars, wire
// rope lift lines with turnbuckles leaving the top plate for the head block,
// and the thick hand-line (purchase line) tied to both plates running down to
// the floor block. The brick load shows how heavy the flown piece is.
// Generic visualization geometry at about real size (about 0.75 m wide, 2.6 m
// tall with the track and lines), millimetres, Z up, operating side on -Y,
// standing on z = 0.

meta({
  name: "counterweight-arbor",
  license: 'CC0-1.0',
  title: "Counterweight arbor",
  description: "Counterweight fly-system arbor at about real size: two arbor rods clamping notched cast-iron bricks between top and bottom plates, galvanised spreader plates, locking collar, nylon guide shoes on a pair of T-track bars, wire-rope lift lines with turnbuckles and a hemp-look purchase line to the floor block, resting on rubber stops. Choose the brick load (light, half or full). Material controls: painted arbor frame and track, cast-iron bricks, galvanised plates and lift lines, purchase rope. houseShow, touring and safetyMarked presets.",
  tags: ['counterweight arbor', 'fly system', 'rigging', 'counterweight', 'stage weights', 'T-track', 'purchase line', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const load = param('load', 'half', { choices: ['light', 'half', 'full'], label: 'Brick load' });

const paintedSteel = param('paintedSteel', '#2f3438', { label: 'Painted arbor frame and track' });
const castIron = param('castIron', '#5b6166', { label: 'Cast-iron bricks' });
const galvanizedSteel = param('galvanizedSteel', '#b3bdc1', { label: 'Galvanised plates and lift lines' });
const rope = param('rope', '#c9a86a', { label: 'Purchase line rope' });

presets({
  houseShow: { paintedSteel: '#2f3438', castIron: '#5b6166', galvanizedSteel: '#b3bdc1', rope: '#c9a86a' },
  touring: { paintedSteel: '#1e2124', castIron: '#3f4448', galvanizedSteel: '#9aa5aa', rope: '#3b3f44' },
  safetyMarked: { paintedSteel: '#d8b12a', castIron: '#6c7277', galvanizedSteel: '#c4ccd0', rope: '#e7e2d2' },
});

const NYLON = '#e9e6dc';
const RUBBER = '#161819';

const p = assembly("counterweight-arbor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const circle = (r: number, n: number) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0: number[], p1: number[], r: number, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const RX = 250; // arbor rod centres
const BZ = 150; // bottom plate underside (resting on the rubber stops)
const TZ = 2050; // top plate underside
const TRACK = 350; // T-track bar centres
const TRACK_H = 2600;

// T-track: a vertical guide bar on each side with its wall flange behind.
for (const sx of [-1, 1]) {
  add(`track-bar-${sx}`, box(20, 70, TRACK_H, true).translate(sx * TRACK, 15, TRACK_H / 2).color(paintedSteel));
  add(`track-flange-${sx}`, box(110, 14, TRACK_H, true).translate(sx * TRACK, 57, TRACK_H / 2).color(paintedSteel));
}

// Rubber stops on the floor and the bottom plate resting on them.
for (const sx of [-1, 1]) add(`stop-${sx}`, box(120, 100, BZ, true).translate(sx * 170, 0, BZ / 2).color(RUBBER));
add("bottom-plate", box(2 * RX + 110, 150, 50, true).translate(0, 0, BZ + 25).color(paintedSteel));
add("top-plate", box(2 * RX + 110, 150, 60, true).translate(0, 0, TZ + 30).color(paintedSteel));
// Nylon guide shoes at both ends of both plates, straddling the track bars.
for (const sx of [-1, 1])
  for (const z of [BZ + 25, TZ + 30])
    add(`guide-shoe-${sx}-${z}`, extrudePolygon([[-40, -50], [40, -50], [40, 50], [14, 50], [14, -10], [-14, -10], [-14, 50], [-40, 50]], 140).translate(sx * TRACK, 0, z - 70).color(NYLON));

// Arbor rods clamping the stack.
for (const sx of [-1, 1]) add(`arbor-rod-${sx}`, rod([sx * RX, 0, BZ + 50], [sx * RX, 0, TZ], 13, 8).color(galvanizedSteel));

// Brick stack: notched cast-iron bricks with a spreader plate every six bricks.
const brickOutline = [
  [-RX - 30, -55], [RX + 30, -55], [RX + 30, -18], [RX - 16, -18], [RX - 16, 18], [RX + 30, 18],
  [RX + 30, 55], [-RX - 30, 55], [-RX - 30, 18], [-RX + 16, 18], [-RX + 16, -18], [-RX - 30, -18],
];
const BRICK = 48;
const count = load.value === 'full' ? 30 : load.value === 'half' ? 18 : 8;
let z = BZ + 50;
for (let k = 0; k < count; k++) {
  if (k > 0 && k % 6 === 0) {
    add(`spreader-${k}`, box(2 * RX + 70, 130, 8, true).translate(0, 0, z + 4).color(galvanizedSteel));
    z += 8;
  }
  add(`brick-${k}`, extrudePolygon(brickOutline, BRICK - 2).translate(0, 0, z).color(castIron));
  z += BRICK;
}
// Locking collar clamped to the rods above the stack.
add("lock-plate", box(2 * RX + 70, 130, 14, true).translate(0, 0, z + 12).color(galvanizedSteel));
for (const sx of [-1, 1]) {
  add(`collar-${sx}`, cylinder(40, 26, 10).translate(sx * RX, 0, z + 19).color(galvanizedSteel));
  add(`collar-screw-${sx}`, rod([sx * RX, -24, z + 39], [sx * RX, -70, z + 39], 7, 6).color(galvanizedSteel));
  add(`collar-handle-${sx}`, box(70, 12, 12, true).translate(sx * RX, -74, z + 39).color(paintedSteel));
}

// Wire rope lift lines leaving the top plate for the head block, with turnbuckles.
for (const x of [-150, -50, 50, 150]) {
  add(`lift-eye-${x}`, box(16, 40, 40, true).translate(x, 0, TZ + 80).color(galvanizedSteel));
  add(`turnbuckle-${x}`, cylinder(140, 13, 8).translate(x, 0, TZ + 100).color(galvanizedSteel));
  add(`lift-line-${x}`, cylinder(TRACK_H - TZ - 240, 4, 6).translate(x, 0, TZ + 240).color(galvanizedSteel));
}

// Purchase line tied to the top and bottom plates on the operating side,
// running up to the head block and down to the floor tension block.
const PY = -95;
add("purchase-tie-top", box(70, 50, 50, true).translate(0, PY + 20, TZ + 30).color(paintedSteel));
add("purchase-tie-bottom", box(70, 50, 50, true).translate(0, PY + 20, BZ + 25).color(paintedSteel));
add("purchase-up", cylinder(TRACK_H - TZ - 30, 12, 8).translate(0, PY, TZ + 30).color(rope));
add("purchase-down", cylinder(BZ + 25 - 120, 12, 8).translate(0, PY, 120).color(rope));
add("floor-block", cylinder(50, 80, 16).rotateY(90).translate(-25, PY - 70, 90).color(paintedSteel));
add("floor-block-sheave", torus(68, 12, 16).rotateY(90).translate(0, PY - 70, 90).color(galvanizedSteel));
add("floor-block-mount", box(120, 120, 16, true).translate(0, PY - 70, 8).color(paintedSteel));
add("floor-block-cheek", box(16, 120, 80, true).translate(-35, PY - 70, 50).color(paintedSteel));
add("purchase-return", cylinder(TRACK_H - 160, 12, 8).translate(0, PY - 140, 90).color(rope));

return p.model();
