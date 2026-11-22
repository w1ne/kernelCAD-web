// SPDX-License-Identifier: CC0-1.0
// Hose drying tower: the freestanding rack a station hoists washed lengths of
// fire hose onto so they hang doubled and drain dry. What makes it one: two
// tall braced masts on splayed feet, an overhead head beam carrying a
// sheave and rope hoist, a row of padded saddle hooks the hose folds over,
// several lengths of flat-laid hose hanging in long doubled loops with
// their brass couplings dangling at the bottom, a drip tray along the
// floor and the rope cleat on one mast. Millimetres, Z up, base origin, the
// hoses hang in a row along X.
meta({
  name: "hose-drying-tower",
  license: 'CC0-1.0',
  title: "Hose drying tower",
  description: "Freestanding fire-hose drying tower: two braced masts on splayed feet, head beam with hoist sheave, rope and mast cleat, four padded saddle hooks, four lengths of flat jacketed hose hanging in doubled loops with brass couplings at the bottom, and a floor drip tray. Material controls: frame paint, hose jacket, couplings and saddle pads; apparatus-red, clean-zone, mixed-hose and weathered presets.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "CC0", "hose", "drying", "tower", "rack", "fire hose"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const frame = param('frame', '#3f4a50', { label: 'Masts, head beam and tray' });
const jacket = param('jacket', '#e8e2c8', { label: 'Hose jacket' });
const coupling = param('coupling', '#c9a54a', { label: 'Brass hose couplings' });
const pads = param('pads', '#252a2d', { label: 'Saddle pads, feet and rope' });

presets({
  'apparatus-red': { frame: '#b83d34', jacket: '#f0ece0' },
  'clean-zone': { frame: '#4e8c87', jacket: '#e9e9e4' },
  'mixed-hose': { jacket: '#c92a2a', coupling: '#b7bcbf' },
  weathered: { frame: '#4b4a45', jacket: '#c9bf9e', coupling: '#9c8448', pads: '#3a3c3b' },
});

const p = assembly("hose-drying-tower");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Turned parts with the axis along +X, and facing out of the -Y front.
const alongX = (shape) => shape.rotateY(90);
const facingFront = (shape) => shape.rotateX(90);

const mx = 620, H = 3100; // mast half spacing, head beam height

// ---- Splayed feet, braced masts, head beam ----
for (const x of [-mx, mx]) {
  add(`foot-${x}`, prismX([[-420, 0], [420, 0], [380, 60], [-380, 60]], x - 60, x + 60).color(frame));
  for (const y of [-400, 400]) add(`foot-pad-${x}-${y}`, turned([[0, -10], [55, -10], [55, 10], [0, 10]]).translate(x, y, 10).color(pads));
  add(`mast-${x}`, blk(x - 45, -45, 60, x + 45, 45, H).color(frame));
  for (const y of [-1, 1]) {
    add(`foot-brace-${x}-${y}`, blk(x - 15, -12, -300, x + 15, 12, 300).rotateX(y * 52).translate(0, y * 190, 260).color(frame));
  }
}
add('head-beam', prismX([[-90, H - 60], [90, H - 60], [90, H + 60], [60, H + 90], [-60, H + 90], [-90, H + 60]], -mx - 120, mx + 120).color(frame));
add('mid-tie', blk(-mx, 130, 1500, mx, 170, 1550).color(frame));

// ---- Hoist sheave and rope down to a cleat on the right mast ----
add('sheave-bracket', blk(mx + 60, -60, H - 40, mx + 200, 60, H + 60).color(frame));
add('sheave', facingFront(turned([[0, -30], [110, -30], [90, 0], [110, 30], [0, 30]])).translate(mx + 210, 0, H - 120).color(pads));
add('rope', rod(9, 1100, H - 120).translate(mx + 320, 0, 0).color(pads));
add('rope-cleat', blk(mx + 45, -40, 1080, mx + 110, 40, 1260).color(pads));

// ---- Saddle hooks with pads, and the doubled hose lengths ----
const sx = [-360, -120, 120, 360];
sx.forEach((x, i) => {
  add(`hook-arm-${i}`, blk(x - 18, -40, H - 210, x + 18, 40, H - 60).color(frame));
  add(`saddle-${i}`, alongX(turned([[0, -60], [70, -60], [70, 60], [0, 60]])).translate(x, 0, H - 260).color(pads));
});
const lengths = [2650, 2200, 2500, 1900];
lengths.forEach((drop, i) => {
  const x = sx[i];
  const bottom = H - 260 - drop;
  // A flat hose folded over the saddle: two flat legs and a rounded top bend.
  for (const y of [-85, 85]) {
    add(`hose-${i}-leg-${y}`, blk(x - 75, y - 9, bottom, x + 75, y + 9, H - 260).color(jacket));
  }
  add(`hose-${i}-bend`, alongX(ring(76, 94, x - 75, x + 75)).translate(0, 0, H - 260).color(jacket));
  add(`coupling-${i}-a`, turned([[0, 0], [52, 0], [52, 40], [60, 40], [60, 90], [42, 110], [0, 110]]).translate(x, -85, bottom - 110).color(coupling));
  add(`coupling-${i}-b`, turned([[0, 0], [52, 0], [52, 40], [60, 40], [60, 90], [42, 110], [0, 110]]).translate(x, 85, bottom - 70).color(coupling));
});

// ---- Drip tray along the floor between the feet ----
add('drip-tray', blk(-mx + 70, -200, 0, mx - 70, 200, 25).color(frame));
for (const y of [-200, 190]) add(`tray-lip-${y}`, blk(-mx + 70, y, 25, mx - 70, y + 10, 90).color(frame));

return p.model();
