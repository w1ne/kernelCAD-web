// SPDX-License-Identifier: CC0-1.0
// Double-deck inclined vibrating screen, the sizing machine between crushing
// stages. What makes it one: a long open box of two heavy side plates with
// bolted vertical stiffeners and tubular cross-members, two screening decks
// one above the other (the top deck lined with modular panels and carrying
// ore), the whole body tilted down towards the discharge end and floating on
// coil springs at the four corners; an exciter beam across the top with
// unbalance housings outside each side plate, driven by a cardan shaft from a
// motor on the stand; a feed box at the high end, discharge lips for each
// deck at the low end and an undersize hopper underneath.
// Millimetres, Z up, screen length along X, discharge (low) end towards +X.
meta({
  name: "double-deck-screen",
  license: 'CC0-1.0',
  title: "Double-deck vibrating screen",
  description: "Inclined double-deck vibrating screen at about real size: 6 m by 2.4 m body of stiffened side plates and tubular cross-members, modular top-deck panels carrying ore and a lower deck, exciter beam with unbalance housings driven by a cardan shaft from a stand-mounted motor, four corner coil springs on a steel stand, feed box at the high end, oversize and mid-size discharge lips at the low end, undersize hopper. Material controls: screen body coating, stand steel, screen panel polyurethane, springs and exciter steel, plus an incline choice (15, 20, 25 degrees). weathered, highVisibility and greyPlant presets.",
  tags: ['mining', 'mineral processing', 'screening', 'vibrating screen', 'double deck', 'sizing', 'crushing plant', 'aggregate'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#2f8f6a', { label: 'Screen body coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Stand steel' });
const polyurethane = param('polyurethane', '#d95f2b', { label: 'Screen panel polyurethane' });
const stainlessSteel = param('stainlessSteel', '#b9c1c3', { label: 'Springs and exciter steel' });
const incline = param('incline', '20', { choices: ['15', '20', '25'], label: 'Deck incline (degrees)' });
presets({
  weathered: { coatedSteel: '#5f7166', structuralSteel: '#666a66', polyurethane: '#9b6a4f', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', polyurethane: '#2a7fc0', stainlessSteel: '#c5ccca' },
  greyPlant: { coatedSteel: '#b9bec0', structuralSteel: '#2f5a8a', polyurethane: '#3a9a52', stainlessSteel: '#d0d6d6' },
});

const p = assembly("double-deck-screen");
// Built with the feed end at -X, then turned so the low discharge end faces
// the viewer at -X and the drive side sits at -Y.
const add = (name, shape) => p.part(name, shape.rotateZ(180).scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Closed (x, z) side profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const rock = '#8a7d6c', rockDark = '#6f6457', dark = '#1e2123', rubber = '#25292b';
const deg = Number(incline.value);
const th = (deg * Math.PI) / 180;
const Hc = 2900; // height of the body pivot (local origin) above the ground
// The body is built level in local coordinates (x along the deck, z up from
// the body bottom), then tilted so +X runs downhill.
const T = (s) => s.rotateY(deg).translate(0, 0, Hc);
const world = (x, z) => [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th) + Hc];
const L = 3000, W = 1250; // half length, half width between side plates

// ---- Vibrating body (local coordinates) ----
for (const [k, y] of [-1, 1].entries()) {
  const y0 = y * W - (y < 0 ? 30 : 0), y1 = y0 + 30;
  add(`side-plate-${k}`, T(sideY([[-L, 0], [L, 0], [L, 900], [L - 500, 1100], [-L + 300, 1250], [-L, 1150]], y0, y1)).color(coatedSteel));
  for (const x of [-2400, -1600, -800, 0, 800, 1600, 2400]) {
    add(`stiffener-${k}-${x}`, T(blk(x - 40, y * (W + 30) - 60, 50, x + 40, y * (W + 30) + 60, 1050)).color(coatedSteel));
  }
  add(`side-flange-${k}`, T(blk(-L, y * (W + 30) - 80, 0, L, y * (W + 30) + 80, 60)).color(coatedSteel));
  add(`support-bracket-feed-${k}`, T(blk(-2700, y * (W + 150) - 120, 150, -2300, y * (W + 150) + 120, 400)).color(structuralSteel));
  add(`support-bracket-discharge-${k}`, T(blk(2300, y * (W + 150) - 120, 150, 2700, y * (W + 150) + 120, 400)).color(structuralSteel));
}
// Tubular cross-members under each deck.
for (const x of [-2200, -800, 600, 2000]) {
  add(`cross-member-low-${x}`, T(latheY([[90, -W], [90, W]], x, 230, 8)).color(coatedSteel));
  add(`cross-member-high-${x}`, T(latheY([[90, -W], [90, W]], x, 680, 8)).color(coatedSteel));
}
// Lower deck: wire-mesh cloth in a single panel.
add('lower-deck', T(blk(-L + 100, -W, 320, L, W, 360)).color(dark));
add('lower-discharge-lip', T(blk(L, -W, 300, L + 350, W, 360)).color(stainlessSteel));
// Top deck: modular polyurethane panels with dark frame lines.
add('top-deck', T(blk(-L + 100, -W, 780, L, W, 830)).color(polyurethane));
for (let x = -L + 100; x <= L; x += 600) add(`deck-rail-x-${x}`, T(blk(x - 20, -W, 830, x + 20, W, 860)).color(dark));
for (const y of [-W / 2, 0, W / 2]) add(`deck-rail-y-${y}`, T(blk(-L + 100, y - 20, 830, L, y + 20, 860)).color(dark));
add('top-discharge-lip', T(blk(L, -W, 760, L + 450, W, 830)).color(stainlessSteel));
// Ore spread on the top deck, thickest at the feed end.
add('ore-bed', T(path().moveTo(-L + 100, 860).lineTo(1800, 860).lineTo(-L + 900, 1120).lineTo(-L + 100, 1150).close()
  .extrude(2 * W - 200).rotateX(90).translate(0, W - 100, 0)).color(rock));
for (const [k, [x, y]] of [[-1400, -700], [-900, 400], [-300, -200], [300, 600], [800, -500], [1300, 100], [-2000, 800]].entries()) {
  add(`ore-lump-${k}`, T(sphere(110).translate(x, y, 920)).color(rockDark));
}
// Feed box at the high end.
add('feed-box', T(blk(-L - 500, -W, 800, -L + 100, W, 1700)).subtract(T(blk(-L - 400, -W + 100, 1000, -L + 200, W - 100, 1800))).color(coatedSteel));
// Exciter beam across the top with unbalance housings outside each plate.
const ex = -400, ez = 1600;
add('exciter-beam', T(latheY([[180, -W - 30], [180, W + 30]], ex, ez, 12)).color(stainlessSteel));
for (const [k, y] of [-1, 1].entries()) {
  const ya = y < 0 ? -W - 320 : W + 30, yb = ya + 290;
  add(`exciter-housing-${k}`, T(latheY([[380, ya], [380, yb]], ex, ez, 16)).color(stainlessSteel));
  add(`exciter-cover-${k}`, T(latheY([[300, y < 0 ? ya - 40 : yb], [300, y < 0 ? ya : yb + 40]], ex, ez, 16)).color(coatedSteel));
  add(`exciter-gusset-${k}`, T(blk(ex - 300, y * (W + 15) - 15, 1100, ex + 300, y * (W + 15) + 15, ez)).color(coatedSteel));
}

// ---- Coil springs on the stand (world coordinates) ----
const springTops = [];
for (const y of [-1, 1]) for (const x of [-2500, 2500]) {
  const [wx, wz] = world(x, 150);
  springTops.push([wx, y * (W + 150), wz]);
}
for (const [k, [x, y, zt]] of springTops.entries()) {
  const zb = zt - 600;
  add(`spring-seat-${k}`, blk(x - 250, y - 250, zb - 60, x + 250, y + 250, zb).color(structuralSteel));
  for (let c = 0; c < 4; c++) add(`spring-coil-${k}-${c}`, torus(170, 32, 8).translate(x, y, zb + 75 + c * 150).color(stainlessSteel));
  add(`stand-column-${k}`, blk(x - 150, y - 150, 0, x + 150, y + 150, zb - 60).color(structuralSteel));
  add(`column-base-${k}`, blk(x - 300, y - 300, 0, x + 300, y + 300, 40).color(structuralSteel));
}
for (const y of [-1, 1]) {
  const a = springTops.find(([, sy, z]) => sy === y * (W + 150) && z === Math.max(...springTops.map((s) => s[2])));
  const b = springTops.find(([, sy, z]) => sy === y * (W + 150) && z === Math.min(...springTops.map((s) => s[2])));
  add(`stand-tie-${y}`, tube([a[0], y * (W + 150), 700], [b[0], y * (W + 150), 700], 80, 6).color(structuralSteel));
}

// ---- Drive: motor on a stand bracket and cardan shaft to the exciter ----
const [exw, ezw] = world(ex, ez);
const motorY = W + 1500, motorZ = ezw - 500;
add('motor-plate', blk(exw - 600, motorY - 500, motorZ - 520, exw + 600, motorY + 500, motorZ - 450).color(structuralSteel));
for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
  add(`motor-leg-${dx}-${dy}`, blk(exw + dx * 520 - 60, motorY + dy * 420 - 60, 0, exw + dx * 520 + 60, motorY + dy * 420 + 60, motorZ - 520).color(structuralSteel));
}
add('motor-leg-brace', tube([exw - 520, motorY - 420, 300], [exw + 520, motorY - 420, motorZ - 600], 45, 6).color(structuralSteel));
add('motor', latheY([[470, motorY - 400], [470, motorY + 300], [420, motorY + 400]], exw, motorZ, 16).color(structuralSteel));
add('motor-fan-cowl', latheY([[420, motorY + 400], [380, motorY + 600]], exw, motorZ, 16).color(dark));
add('cardan-shaft', tube([exw, W + 360, ezw], [exw, motorY - 400, motorZ], 70, 8).color(stainlessSteel));
add('cardan-guard', tube([exw, W + 450, ezw + 20], [exw, motorY - 500, motorZ + 30], 140, 6).color('#e8c21e'));

// ---- Undersize hopper under the body ----
add('undersize-hopper', lathe([[500, 400], [1500, 1400]], 4).rotateZ(45).translate(world(0, 0)[0] + 700, 0, 0)
  .subtract(lathe([[420, 500], [1420, 1500]], 4).rotateZ(45).translate(world(0, 0)[0] + 700, 0, 0)).color(structuralSteel));
add('undersize-spout', rod(380, 0, 420, 8).translate(world(0, 0)[0] + 700, 0, 0).color(rubber));

return p.model();
