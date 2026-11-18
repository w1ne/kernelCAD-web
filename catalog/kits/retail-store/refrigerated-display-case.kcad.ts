// SPDX-License-Identifier: CC0-1.0
// Refrigerated display case: the open-front multideck chiller along a
// supermarket's dairy and ready-meal wall. What makes it a multideck
// rather than a shelf: side end panels whose open front rakes back as it
// rises, a deep insulated well at the bottom with an air-curtain grille
// on its front lip, four stepped stainless shelves that get shallower
// toward the top, each with a price-ticket strip, a lit canopy fascia
// with a rolled-up night blind under it, and a louvred kick plate over
// the compressor. Shelves and well are stocked with packs, pots and
// cartons. Generic visualization geometry at about real size (1.875 m
// wide, 2.05 m tall), millimetres, Z up, open front on -Y.

meta({
  name: "refrigerated-display-case",
  license: 'CC0-1.0',
  title: "Refrigerated display case",
  description: "Open-front supermarket multideck chiller at about real size: raked side end panels, deep insulated well with air-curtain grille, four stepped stainless shelves with price strips stocked with packs, pots and cartons, lit canopy fascia with rolled night blind and a louvred compressor kick plate. Material controls: cabinet, interior liner, shelves, canopy fascia. dairyBlue, freshGreen and nightRestock presets.",
  tags: ['multideck', 'chiller', 'refrigerated display', 'dairy case', 'open fridge', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#24527a', { label: 'Cabinet paint' });
const liner = param('liner', '#eef2f3', { label: 'Interior liner' });
const shelf = param('shelf', '#b6bfc3', { label: 'Stainless shelves' });
const fascia = param('fascia', '#d93a2b', { label: 'Canopy fascia' });

presets({
  dairyBlue: { cabinet: '#24527a', liner: '#eef2f3', shelf: '#b6bfc3', fascia: '#d93a2b' },
  freshGreen: { cabinet: '#2f6b45', liner: '#f1f3ec', shelf: '#c2c9c4', fascia: '#f2c230' },
  nightRestock: { cabinet: '#2a3034', liner: '#9aa5aa', shelf: '#6f7a7f', fascia: '#3e6677' },
});

const p = assembly("refrigerated-display-case");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1875;
const IW = W - 100;
const YF = -450;
const YB = 450;
const LIP = 840;
const CZ = 1860;
// Front edge of the open bay, raking back from the well lip to the canopy.
const frontY = (z: number) => YF + ((z - LIP) / (CZ - LIP)) * 200;

// Side end panels with the raked open front.
const endPts = [[YF, 0], [YB, 0], [YB, 2050], [YF + 180, 2050], [YF + 200, CZ], [YF, LIP]];
for (const [k, x] of [['l', -W / 2 + 25], ['r', W / 2 - 25]]) {
  add(`end-${k}`, profileYZ(endPts, 50).translate(x, 0, 0).color(cabinet));
  add(`end-trim-${k}`, profileYZ([[YF - 4, LIP], [YF + 200 - 4, CZ], [YF + 200 + 30, CZ], [YF + 30, LIP]], 56).translate(x, 0, 0).color(shelf));
}

// Insulated base, kick plate louvres and the well.
add("base", blk(0, 0, 0, IW, YB - YF - 20, 700).color(cabinet));
add("kick-plate", blk(0, YF - 2, 40, IW - 40, 6, 200).color('#22262a'));
for (let i = 0; i < 6; i++) add(`louvre-${i}`, blk(0, YF - 8, 60 + i * 30, IW - 80, 6, 10).color(shelf));
add("bumper", blk(0, YF - 20, 420, IW, 40, 60).color(shelf));
add("well-lip", blk(0, YF + 20, 700, IW, 40, LIP - 700).color(cabinet));
add("air-grille", blk(0, YF + 20, LIP, IW, 46, 8).color('#22262a'));
add("well-floor", blk(0, -40, 700, IW, 760, 10).color(liner));
add("back-liner", blk(0, YB - 40, 710, IW, 20, CZ - 710).color(liner));
add("rear-duct-grille", blk(0, YB - 52, 760, IW - 60, 4, 60).color('#7d878c'));

// Well stock: three rows of milk cartons and yoghurt multipacks.
const wellCol = ['#f4f6f6', '#3c7fc4', '#f4f6f6', '#e9c33b'];
for (let r = 0; r < 3; r++) {
  for (let i = 0; i < 12; i++) {
    const x = -IW / 2 + 80 + i * 148;
    const y = YF + 120 + r * 170;
    const tall = (i + r) % 3 === 0;
    add(`well-pack-${r}-${i}`, blk(x, y, 710, 120, 120, tall ? 120 : 80).color(wellCol[(i + r) % 4]));
  }
}

// Four stepped shelves with price strips and stock.
const shelfZ = [1020, 1240, 1460, 1680];
const potCol = ['#f4f6f6', '#e65a8a', '#f4f6f6', '#7fbf4a', '#f2a51a'];
const packCol = ['#c94b3a', '#e8d6a8', '#3b8a5a', '#d97a2a', '#5a4ab0'];
shelfZ.forEach((z, s) => {
  const yf = frontY(z) + 60;
  const depth = YB - 60 - yf;
  add(`shelf-${s}`, blk(0, yf + depth / 2, z - 20, IW, depth, 20).color(shelf));
  add(`price-strip-${s}`, blk(0, yf - 3, z - 48, IW, 6, 44).color('#f7f4e8'));
  for (let i = 0; i < 5; i++) add(`ticket-${s}-${i}`, blk(-IW / 2 + 180 + i * 360, yf - 7, z - 40, 90, 3, 28).color('#e8c22a'));
  if (s % 2 === 0) {
    // Front row of yoghurt pots, packs behind.
    for (let i = 0; i < 14; i++) add(`pot-${s}-${i}`, cylinder(110, 45, 10).translate(-IW / 2 + 65 + i * 126, yf + 70, z).color(potCol[(i + s) % 5]));
    for (let i = 0; i < 9; i++) add(`pack-${s}-${i}`, blk(-IW / 2 + 100 + i * 197, yf + 230, z, 170, 140, 150).color(packCol[(i + s) % 5]));
  } else {
    // Ready-meal trays stood on edge, film lids facing out.
    for (let i = 0; i < 10; i++) {
      const x = -IW / 2 + 90 + i * 177;
      add(`tray-${s}-${i}`, blk(x, yf + 90, z, 160, 110, 160).color(packCol[(i + s + 2) % 5]));
      add(`tray-label-${s}-${i}`, blk(x, yf + 33, z + 70, 120, 4, 60).color('#f7f4e8'));
    }
  }
});

// Lit canopy with brand fascia and a rolled-up night blind.
add("canopy", blk(0, (YF + 200 + YB) / 2, CZ, IW, YB - YF - 200, 190).color(cabinet));
add("fascia", profileYZ([[YF + 175, CZ - 10], [YF + 205, CZ - 10], [YF + 185, 2050], [YF + 155, 2050]], IW).color(fascia));
add("fascia-band", profileYZ([[YF + 168, 1920], [YF + 174, 1920], [YF + 166, 1980], [YF + 160, 1980]], IW - 400).color('#ffffff'));
add("light-strip", blk(0, YF + 280, CZ - 14, IW - 120, 50, 14).color('#fff8d8'));
add("night-blind", cylinder(IW - 80, 32, 12).rotateY(90).translate(-(IW - 80) / 2, YF + 240, CZ - 50).color('#4a5157'));
add("blind-pull", blk(0, YF + 222, CZ - 120, 120, 8, 40).color(shelf));

return p.model();
