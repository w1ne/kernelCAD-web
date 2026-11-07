// SPDX-License-Identifier: CC0-1.0
// Motorized chain hoist: the one-ton electric chain motor that lifts lighting
// truss and scenery, hung from a steel beam on a round-sling basket.
// What makes it a chain hoist rather than a box on a stick: a round cast body
// lying sideways with a ribbed gear case in the middle, a motor end cap on one
// side and a brake end on the other, a carry handle on top, a swivel hook into
// a sling round the beam, real link chain running out of the bottom to a load
// hook with a safety latch, a canvas chain bag catching the slack, and a control
// cable to a multipin connector. Theatre rigs also hang them upside down
// ("climbing"): the chain hook goes to the beam and the motor climbs the chain
// with its own hook carrying the truss.
// Generic visualization geometry at real size (body about 0.55 m long, beam
// about 1.9 m up), millimetres, Z up, ground on z = 0.

meta({
  name: "motorized-chain-hoist",
  license: 'CC0-1.0',
  title: "Motorized chain hoist",
  description: "Electric chain hoist on a beam: round cast body with ribbed gear case, motor end cap, brake end and carry handle, swivel hook in a round sling round an I-beam stub, link chain to a latched load hook, canvas chain bag for the slack, and a control cable with multipin connector. Standard rig (motor on the beam) or climbing rig (chain hook on the beam, motor inverted on the chain). Material controls: painted body, galvanized chain and beam, black sling, cable and bag, plated hooks. houseShow and touring presets.",
  tags: ['chain hoist', 'chain motor', 'lodestar', 'rigging', 'truss motor', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const rig = param('rig', 'standard', { choices: ['standard', 'climbing'], label: 'Rig orientation' });

const paintedSteel = param('paintedSteel', '#3c4349', { label: 'Hoist body, end caps and handle (painted cast steel)' });
const galvanizedSteel = param('galvanizedSteel', '#aab5b9', { label: 'Load chain and beam (galvanized steel)' });
const rubber = param('rubber', '#22262a', { label: 'Round sling, control cable and chain bag (black polyester and rubber)' });
const hardware = param('hardware', '#c28f3e', { label: 'Hooks, latches and connector (plated steel)' });

presets({
  houseShow: {
    paintedSteel: '#2b3137',
    galvanizedSteel: '#c0c8ca',
    rubber: '#1d2023',
    hardware: '#c5a052',
  },
  touring: {
    paintedSteel: '#dda21f',
    galvanizedSteel: '#dce2e2',
    rubber: '#5b2a7a',
    hardware: '#e2b347',
  },
});

const p = assembly("motorized-chain-hoist");
// Parts are collected, then the whole model is lifted so its lowest point
// rests on z = 0.
const parts = [];
const add = (name, shape) => parts.push([name, shape]);
const climbing = rig.value === 'climbing';

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Revolve an [r, x] profile about the X axis (the hoist body axis).
const turnedX = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().rotateY(90);
};
const turnedZ = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Forged hook: eye/shank at the top (z 124..185), open bowl at the bottom, seat
// near z = 40, in the XZ plane, 38 mm thick.
const hook = () => path()
  .moveTo(-44, 185).lineTo(44, 185).lineTo(44, 124).lineTo(27, 124)
  .lineTo(23, 82).lineTo(9, 49).lineTo(-13, 27).lineTo(-39, 0)
  .lineTo(-63, 34).lineTo(-76, 58).lineTo(-73, 81).lineTo(-60, 96)
  .lineTo(-45, 85).lineTo(-53, 68).lineTo(-46, 52).lineTo(-31, 43)
  .lineTo(-15, 47).lineTo(-4, 61).lineTo(0, 82).lineTo(0, 124)
  .lineTo(-44, 124).close().extrude(38).rotateX(90).translate(0, 19, 0);
// Load chain from `top` straight down to `bottom`, alternating link planes.
const chain = (name, x, top, bottom) => {
  const pitch = 34;
  const n = Math.floor((top - bottom) / pitch);
  for (let i = 0; i < n; i += 1) {
    const link = i % 2 === 0 ? box(8, 26, 44, true) : box(26, 8, 44, true);
    add(`${name}-${i}`, link.translate(x, 0, top - 22 - i * pitch).color(galvanizedSteel));
  }
};

// Beam and round sling, common to both rigs.
const BZ = 1820; // beam centreline
add('beam', extrudePolygon([
  [-60, -100], [60, -100], [60, -88], [6, -88], [6, 88], [60, 88], [60, 100], [-60, 100], [-60, 88], [-6, 88], [-6, -88], [-60, -88],
], 900).rotateX(90).translate(0, 450, BZ).color(galvanizedSteel));
const SB = BZ - 260; // bottom of the sling basket
for (const s of [-1, 1]) add(`sling-${s}`, rod([s * 70, 0, BZ + 104], [s * 12 - 23, 0, SB], 16, 6).color(rubber));
add('sling-top', rod([-74, 0, BZ + 112], [74, 0, BZ + 112], 16, 6).color(rubber));

// Hoist body around its own origin: axis along X, top at z = +130.
const bodyParts = [
  ['gear-case', turnedX([[0, -95], [128, -95], [128, 95], [0, 95]]), paintedSteel],
  ['motor-cover', turnedX([[0, 95], [112, 95], [112, 250], [95, 290], [0, 290]]), paintedSteel],
  ['motor-end-cap', turnedX([[0, 290], [70, 290], [70, 312], [0, 312]]), paintedSteel],
  ['brake-end', turnedX([[0, -95], [118, -95], [110, -200], [80, -232], [0, -232]]), paintedSteel],
  ['connector', turnedX([[0, 312], [32, 312], [32, 360], [0, 360]]), hardware],
  ['suspension-block', box(110, 90, 40, true).translate(0, 0, 140), paintedSteel],
  ['chain-guide', box(90, 80, 50, true).translate(0, 0, -145), paintedSteel],
  ['handle-l', rod([-170, 0, 100], [-170, 0, 200], 11, 6), paintedSteel],
  ['handle-r', rod([170, 0, 100], [170, 0, 200], 11, 6), paintedSteel],
  ['handle-grip', rod([-180, 0, 200], [180, 0, 200], 15, 6), paintedSteel],
  // Swivel hook out of the top, bowl uppermost.
  ['swivel', turnedZ([[0, 160], [24, 160], [24, 200], [0, 200]]), hardware],
  ['body-hook', hook().rotateX(180).translate(0, 0, 385), hardware],
  ['body-hook-latch', box(10, 30, 60, true).translate(-30, 0, 330), hardware],
];
for (const x of [-60, -20, 20, 60]) {
  bodyParts.push([`gear-rib-${x}`, turnedX([[120, x - 6], [136, x - 6], [136, x + 6], [120, x + 6]]), paintedSteel]);
}
for (const x of [130, 175, 220]) {
  bodyParts.push([`motor-fin-${x}`, turnedX([[105, x - 5], [120, x - 5], [120, x + 5], [105, x + 5]]), paintedSteel]);
}

if (!climbing) {
  // Standard: body hook in the sling, chain down from the body to the load hook.
  const ZB = SB - 345; // body centre so the hook seat sits on the sling
  for (const [name, shape, colour] of bodyParts) add(name, shape.translate(0, 0, ZB).color(colour));
  chain('chain', 0, ZB - 170, 210);
  add('load-hook', hook().translate(0, 0, 10).color(hardware));
  add('load-latch', box(10, 30, 60, true).translate(-30, 0, 130).color(hardware));
  // Chain bag on the brake end catching the slack.
  add('chain-bag', turnedZ([[0, 0], [95, 0], [120, 260], [110, 300], [0, 300]]).translate(-330, 0, ZB - 420).color(rubber));
  add('bag-strap', rod([-330, 0, ZB - 120], [-200, 0, ZB - 20], 8, 5).color(rubber));
  // Control cable from the connector down to the floor.
  add('control-cable-0', rod([360, 0, ZB], [430, 0, ZB - 250], 12, 6).color(rubber));
  add('control-cable-1', rod([430, 0, ZB - 250], [470, 60, 20], 12, 6).color(rubber));
} else {
  // Climbing: chain hook in the sling, motor upside down on the chain with its
  // own hook carrying the load.
  add('load-hook', hook().rotateX(180).translate(0, 0, SB + 345 - 300).color(hardware));
  add('load-latch', box(10, 30, 60, true).translate(-30, 0, SB - 50).color(hardware));
  const ZB = 600;
  chain('chain', 0, SB - 140, ZB + 170);
  for (const [name, shape, colour] of bodyParts) add(name, shape.rotateX(180).translate(0, 0, ZB).color(colour));
  add('chain-bag', turnedZ([[0, 0], [95, 0], [120, 260], [110, 300], [0, 300]]).translate(-330, 0, ZB - 420).color(rubber));
  add('bag-strap', rod([-330, 0, ZB - 120], [-200, 0, ZB - 20], 8, 5).color(rubber));
  add('control-cable-0', rod([360, 0, ZB], [440, 0, ZB - 300], 12, 6).color(rubber));
  add('control-cable-1', rod([440, 0, ZB - 300], [480, 60, 20], 12, 6).color(rubber));
}

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
