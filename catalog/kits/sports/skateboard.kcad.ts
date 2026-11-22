// SPDX-License-Identifier: CC0-1.0
// Street skateboard: what makes it one is the popsicle deck — a symmetric
// seven-ply maple board with rounded ends kicked up into nose and tail — with
// black grip tape on top, a printed graphic underneath, and two kingpin trucks
// (baseplate, angled hanger, urethane bushings, axle) carrying four small hard
// wheels with bearing cores. Generic visualization geometry at about real size
// (8.0 x 31.9 inch deck, 14 inch wheelbase, 54 mm wheels), millimetres, Z up,
// board along X, wheels on z = 0.
meta({
  name: 'skateboard',
  license: 'CC0-1.0',
  title: 'Skateboard',
  description: "Street skateboard at about real size: 8.0 x 31.9 inch popsicle deck with kicked nose and tail, seven-ply maple edge, grip tape and an underside graphic; two kingpin trucks with baseplates, hangers, bushings and axles; four 54 mm urethane wheels with bearing cores. Material controls: maple deck, grip tape, truck aluminium, urethane wheels, graphic accent; clubColors, neonCruiser and weathered presets.",
  tags: ['skateboard', 'skateboarding', 'board sport', 'popsicle deck', 'trucks', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const mapleDeck = param('mapleDeck', '#c99a63', { label: 'Maple deck plies' });
const gripTape = param('gripTape', '#26282a', { label: 'Grip tape' });
const truckAluminium = param('truckAluminium', '#a9b2b6', { label: 'Truck aluminium' });
const urethaneWheel = param('urethaneWheel', '#efe9d6', { label: 'Urethane wheels' });
const graphicAccent = param('graphicAccent', '#d9432f', { label: 'Graphic and bushings' });
presets({
  clubColors: { graphicAccent: '#2f6fb0', urethaneWheel: '#f1d24a' },
  neonCruiser: { mapleDeck: '#7fc6c0', graphicAccent: '#e83f8c', urethaneWheel: '#9de24f', truckAluminium: '#2b2e33' },
  weathered: { mapleDeck: '#9c7a55', gripTape: '#4a4a48', truckAluminium: '#7e8487', urethaneWheel: '#bfb59a', graphicAccent: '#8f4a3a' },
});

const p = assembly('skateboard');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y = 0.
const side = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Turned profile [[r, z], ...] revolved about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 810;          // deck length
const W = 203;          // deck width
const FLAT = 280;       // half-length of the flat between the kicks
const KICK = 19;        // kick angle, degrees
const T = 12;           // deck thickness
const DECK_Z = 88;      // underside of the deck over the trucks
const WB = 356;         // wheelbase (inner truck holes)

// Deck centreline in side view: flat middle, kicked ends.
const deckBand = (z0, z1) => {
  const top = [];
  const bot = [];
  for (const x of [-L / 2 - 10, -FLAT - 30, -FLAT - 20, -FLAT - 10, -FLAT, FLAT, FLAT + 10, FLAT + 20, FLAT + 30, L / 2 + 10]) {
    const ax = Math.abs(x);
    const lift = ax <= FLAT ? 0 : ax <= FLAT + 30 ? ((ax - FLAT) ** 2 / 60) * Math.tan((KICK * Math.PI) / 180) : (ax - FLAT - 15) * Math.tan((KICK * Math.PI) / 180);
    top.push([x, DECK_Z + z1 + lift]);
    bot.push([x, DECK_Z + z0 + lift]);
  }
  return [...bot, ...top.reverse()];
};
// Plan outline: parallel sides with fully rounded (semicircular-ish) nose and tail.
const planOutline = (inset) => {
  const pts = [];
  const hw = W / 2 - inset;
  const tipX = L / 2 - inset;
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    pts.push([tipX - hw + hw * Math.cos(a) * 1.0, hw * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / n;
    pts.push([-tipX + hw + hw * Math.cos(a), hw * Math.sin(a)]);
  }
  return pts;
};
const planPrism = (inset) => extrudePolygon(planOutline(inset), 300).translate(0, 0, DECK_Z - 50);

// Maple deck: kicked side band cut to the popsicle plan.
add('deck', side(deckBand(0, T), W + 20).intersect(planPrism(0)).color(mapleDeck));
// Grip tape on top, set in a little from the edge so the maple plies show.
add('grip-tape', side(deckBand(T - 0.2, T + 1.2), W + 20).intersect(planPrism(3)).color(gripTape));
// Underside graphic: a printed band and a chevron toward the nose.
add('graphic-band', side(deckBand(-0.8, 0.2), W + 20).intersect(box(300, W + 20, 400, true).translate(0, 0, DECK_Z)).intersect(planPrism(2)).color(graphicAccent));
add('graphic-chevron', side(deckBand(-0.8, 0.2), W + 20)
  .intersect(extrudePolygon([[180, -90], [250, 0], [180, 90], [205, 90], [275, 0], [205, -90]], 300).translate(0, 0, DECK_Z - 50))
  .intersect(planPrism(2)).color(graphicAccent));

// Trucks: baseplate under the deck, kingpin and bushings, angled hanger and axle.
const AXLE_Z = 27;
for (const [label, sx] of [['front', -1], ['rear', 1]]) {
  const cx = sx * (WB / 2 + 28);
  add(`${label}-baseplate`, extrudePolygon(filletPolygon([[-32, -30], [32, -30], [32, 30], [-32, 30]], 8), 6).translate(cx, 0, DECK_Z - 6).color(truckAluminium));
  add(`${label}-pivot-block`, side([[cx - 30 * sx, DECK_Z - 6], [cx + 4 * sx, DECK_Z - 6], [cx + 10 * sx, DECK_Z - 26], [cx - 18 * sx, DECK_Z - 26]], 30).color(truckAluminium));
  for (const [i, dz] of [0, 1].entries()) {
    add(`${label}-bushing-${i + 1}`, cylinder(9, 14, 16).translate(cx + 8 * sx, 0, DECK_Z - 38 + dz * 13).color(graphicAccent));
  }
  add(`${label}-kingpin`, cylinder(46, 4, 10).translate(cx + 8 * sx, 0, DECK_Z - 44).color(truckAluminium));
  // Hanger: a wide triangle seen from the front, tapering from the pivot down to the axle.
  add(`${label}-hanger`, extrudePolygon([[-108 / 2 - 22, AXLE_Z - 7], [108 / 2 + 22, AXLE_Z - 7], [36, AXLE_Z + 9], [12, AXLE_Z + 26], [-12, AXLE_Z + 26], [-36, AXLE_Z + 9]], 22)
    .rotateX(90).rotateZ(90).translate(cx + 4 * sx, 0, 0).color(truckAluminium));
  add(`${label}-axle`, cylinder(212, 4, 10).rotateX(90).translate(cx + 4 * sx, 106, AXLE_Z).color(truckAluminium));
  for (const sy of [-1, 1]) {
    const wy = sy * 82;
    // Wheel: 54 mm diameter, 32 mm wide, rounded outer lip; bearing core and axle nut.
    add(`${label}-wheel-${sy < 0 ? 'left' : 'right'}`, turned([[11, -16], [24, -16], [27, -11], [27, 13], [25, 16], [11, 16]]).rotateX(90).translate(cx + 4 * sx, wy, AXLE_Z).color(urethaneWheel));
    add(`${label}-bearing-${sy < 0 ? 'left' : 'right'}`, cylinder(30, 11, 14).translate(0, 0, -15).rotateX(90).translate(cx + 4 * sx, wy, AXLE_Z).color(gripTape));
    add(`${label}-axle-nut-${sy < 0 ? 'left' : 'right'}`, cylinder(6, 6, 6).translate(0, 0, -3).rotateX(90).translate(cx + 4 * sx, sy * 101, AXLE_Z).color(truckAluminium));
  }
  // Four mounting bolt heads on the grip tape.
  for (const [bx, by] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) {
    add(`${label}-bolt-${bx > 0 ? 'o' : 'i'}${by > 0 ? 'r' : 'l'}`, cylinder(1.6, 4, 8).translate(cx + bx, by, DECK_Z + T + 1).color(truckAluminium));
  }
}

return p.model();
