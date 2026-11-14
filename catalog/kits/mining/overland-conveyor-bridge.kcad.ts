// SPDX-License-Identifier: CC0-1.0
// Overland conveyor bridge, the trussed gallery that lifts a long overland
// belt conveyor over a haul road. What makes one: a box truss about 26 m
// long with top and bottom chords, verticals and diagonals on both sides,
// carried 6 m up on two four-legged braced towers on concrete footings. Inside
// it a troughed belt rides on three-roll idler sets under arched belt hoods,
// with the return belt below, beside a grated walkway along the -Y side.
// A clearance sign hangs from the bottom chord over the road.
// The cover choice puts arched hoods over the belt or leaves it open; the
// load choice shows the belt loaded with ore or running empty.
// Millimetres, Z up, belt running along X.
meta({
  name: "overland-conveyor-bridge",
  license: 'CC0-1.0',
  title: "Overland conveyor bridge",
  description: "Overland conveyor road crossing at about real size: 26 m box truss gallery with top and bottom chords, verticals, diagonals, floor beams and top lateral ties, carried 6 m above a haul road on two braced four-legged towers with concrete footings, a 1200 mm troughed belt on three-roll idler sets with return belt and arched belt hoods, a grated walkway along one side and a clearance sign over the road. Cover choice (hooded, open) and load choice (loaded, empty). Material controls: truss steel, belt hood sheeting, belt rubber and ore. weathered, coalHandling and desertRed presets.",
  tags: ['mining', 'conveyor', 'overland conveyor', 'truss', 'gallery', 'bridge', 'materials handling'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 6500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cover = param('cover', 'hooded', { choices: ['hooded', 'open'], label: 'Belt hoods' });
const load = param('load', 'loaded', { choices: ['loaded', 'empty'], label: 'Belt load' });
const trussSteel = param('trussSteel', '#5f7f5a', { label: 'Truss steel' });
const hoodSheet = param('hoodSheet', '#c9ccc6', { label: 'Belt hood sheeting' });
const beltRubber = param('beltRubber', '#25282a', { label: 'Belt rubber' });
const ore = param('ore', '#7a6552', { label: 'Ore' });
presets({
  weathered: { trussSteel: '#6a6a60', hoodSheet: '#9a9890', beltRubber: '#34322f', ore: '#8a7462' },
  coalHandling: { trussSteel: '#3f4a52', hoodSheet: '#d39a22', beltRubber: '#1f2123', ore: '#1c1c1e' },
  desertRed: { trussSteel: '#9a9e9a', hoodSheet: '#b8462e', beltRubber: '#26292b', ore: '#a0603c' },
});

const p = assembly("overland-conveyor-bridge");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
const rod = (r, z0, z1, n = 12) => ngon(r, n).loft([ngon(r, n)], {
  planes: [{ plane: 'XY', origin: [0, 0, z0] }, { plane: 'XY', origin: [0, 0, z1] }],
  ruled: true,
});
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed (y, z) outline extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

const footing = '#a19d94', asphalt = '#3a3c3e', roadLine = '#e8e4d8', idlerPaint = '#2f6f4a', signYellow = '#f0c020', signBlack = '#1d1f21', grating = '#7d8488';
const X0 = -13000, X1 = 13000; // gallery ends
const PANEL = 2000;
const ZB = 6000; // bottom chord
const ZT = 8500; // top chord
const WY = 1700; // half gallery width
const YC = 350; // belt centre line
const BW = 600; // half belt width
const ZL = ZB + 750; // belt line
const TOWERS = [-9000, 9000];

// ---- Road under the bridge ----
add('haul-road', blk(-4500, -6000, 0, 4500, 6000, 25).color(asphalt));
for (let i = 0, y = -5600; y < 5600; y += 1600, i++) add(`road-dash-${i}`, blk(-80, y, 25, 80, y + 900, 32).color(roadLine));

// ---- Towers ----
for (const [t, tx] of TOWERS.entries()) {
  const legs = [[-1000, -WY], [1000, -WY], [1000, WY], [-1000, WY]];
  for (const [k, [dx, y]] of legs.entries()) {
    add(`tower-${t}-footing-${k}`, blk(tx + dx - 400, y - 400, 0, tx + dx + 400, y + 400, 350).color(footing));
    add(`tower-${t}-leg-${k}`, blk(tx + dx - 110, y - 110, 350, tx + dx + 110, y + 110, ZB).color(trussSteel));
  }
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = legs[k], [bx, by] = legs[(k + 1) % 4];
    for (const [l, [z0, z1]] of [[400, 3200], [3200, ZB]].entries()) {
      add(`tower-${t}-brace-${k}-${l}`, tube([tx + ax, ay, z0], [tx + bx, by, z1], 50, 6).color(trussSteel));
      add(`tower-${t}-tie-${k}-${l}`, tube([tx + ax, ay, z1], [tx + bx, by, z1], 55, 6).color(trussSteel));
    }
  }
}

// ---- Truss sides ----
for (const [s, y] of [-WY, WY].entries()) {
  add(`bottom-chord-${s}`, blk(X0, y - 120, ZB - 300, X1, y + 120, ZB).color(trussSteel));
  add(`top-chord-${s}`, blk(X0, y - 110, ZT - 220, X1, y + 110, ZT).color(trussSteel));
  for (let k = 0, x = X0; x <= X1; x += PANEL, k++) {
    add(`vertical-${s}-${k}`, blk(x - 70, y - 70, ZB, x + 70, y + 70, ZT - 220).color(trussSteel));
    if (x < X1) {
      // Pratt pattern: diagonals lean towards mid-span.
      const [xa, xb] = x + PANEL / 2 <= 0 ? [x + PANEL, x] : [x, x + PANEL];
      add(`diagonal-${s}-${k}`, tube([xa, y, ZB], [xb, y, ZT - 220], 55, 6).color(trussSteel));
    }
  }
}
for (let k = 0, x = X0; x <= X1; x += PANEL, k++) {
  add(`floor-beam-${k}`, blk(x - 80, -WY, ZB - 260, x + 80, WY, ZB).color(trussSteel));
  add(`top-tie-${k}`, blk(x - 60, -WY, ZT - 180, x + 60, WY, ZT - 60).color(trussSteel));
}
for (let k = 0, x = X0; x + 2 * PANEL <= X1; x += 2 * PANEL, k++) add(`top-lateral-${k}`, tube([x, -WY, ZT - 120], [x + 2 * PANEL, WY, ZT - 120], 40, 6).color(trussSteel));
add('walkway-grating', blk(X0, -WY + 120, ZB, X1, -380, ZB + 40).color(grating));
add('walkway-kick-plate', blk(X0, -390, ZB + 40, X1, -350, ZB + 190).color(trussSteel));

// ---- Belt and idlers ----
for (const [k, s] of [-1, 1].entries()) add(`belt-stringer-${k}`, blk(X0, YC + s * 800 - 60, ZB + 220, X1, YC + s * 800 + 60, ZB + 380).color(trussSteel));
const trough = [[-BW, 190], [-200, -65], [200, -65], [BW, 190], [BW, 208], [200, -47], [-200, -47], [-BW, 208]].map(([y, z]) => [YC + y, ZL + z]);
add('belt-carry', prismX(trough, X0 - 200, X1 + 200).color(beltRubber));
add('belt-return', blk(X0 - 200, YC - BW + 40, ZB + 120, X1 + 200, YC + BW - 40, ZB + 138).color(beltRubber));
if (load.value === 'loaded') {
  add('ore-load', prismX([[-430, 70], [-200, -47], [200, -47], [430, 70], [260, 190], [0, 250], [-260, 190]].map(([y, z]) => [YC + y, ZL + z]), X0 - 200, X1 + 200).color(ore));
}
for (let i = 0, x = X0 + 500; x < X1; x += 1500, i++) {
  add(`idler-${i}-centre`, tube([x, YC - 195, ZL - 130], [x, YC + 195, ZL - 130], 65, 8).color(idlerPaint));
  for (const [k, s] of [-1, 1].entries()) add(`idler-${i}-wing-${k}`, tube([x, YC + s * 215, ZL - 130], [x, YC + s * 560, ZL + 115], 65, 8).color(idlerPaint));
  add(`idler-${i}-frame`, blk(x - 40, YC - 800, ZB + 380, x + 40, YC + 800, ZL - 200).color(trussSteel));
}

// ---- Belt hoods ----
if (cover.value === 'hooded') {
  const hood = [];
  for (let i = 0; i <= 8; i++) {
    const t = (Math.PI * i) / 8;
    hood.push([YC - 760 * Math.cos(t), ZL + 160 + 560 * Math.sin(t)]);
  }
  for (let i = 8; i >= 0; i--) {
    const t = (Math.PI * i) / 8;
    hood.push([YC - 730 * Math.cos(t), ZL + 160 + 530 * Math.sin(t)]);
  }
  // Every fourth bay is left open as an inspection gap.
  for (let i = 0, x = X0 + 200; x + 1800 <= X1; x += 2000, i++) {
    if (i % 4 !== 2) add(`belt-hood-${i}`, prismX(hood, x, x + 1800).color(hoodSheet));
  }
}

// ---- Clearance sign over the road ----
add('clearance-sign', blk(-900, -WY - 160, ZB - 900, 900, -WY - 130, ZB - 300).color(signYellow));
add('clearance-sign-band', blk(-760, -WY - 170, ZB - 700, 760, -WY - 160, ZB - 500).color(signBlack));
for (const [k, x] of [-700, 700].entries()) add(`clearance-sign-hanger-${k}`, blk(x - 30, -WY - 150, ZB - 300, x + 30, -WY - 110, ZB - 100).color(trussSteel));

return p.model();
