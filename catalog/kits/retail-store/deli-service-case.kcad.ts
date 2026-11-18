// SPDX-License-Identifier: CC0-1.0
// Deli service case: the refrigerated serve-over counter at a delicatessen
// or supermarket deli. What makes it a deli case rather than a cabinet:
// a fluted facade with a brand band and stainless bumper rail, raked
// front glass with a glass top shelf, shaped glass ends, and a stainless
// deck of gastronorm trays in two stepped rows, with salami logs, a ham
// half, cheese wheels with a wedge cut, olives and cured meats (or a run
// of salads), price tags on picks, and a scale and wrap-paper roll on the
// top shelf. Glass is drawn as edge frames so the food shows. Generic
// visualization geometry at about real size (1.8 m long, 1.35 m tall),
// millimetres, Z up, customer side on -Y.

meta({
  name: "deli-service-case",
  license: 'CC0-1.0',
  title: "Deli service case",
  description: "Refrigerated serve-over deli counter at about real size: fluted facade with brand band and bumper rail, raked front glass and top shelf, shaped glass ends, two stepped rows of gastronorm trays with salami, ham, cheese wheels, olives and cured meats or salads, price tags, scale and wrap-paper roll. Material controls: stainless, glass, facade, brand band. classicDeli, freshMarket and darkBistro presets; display choice.",
  tags: ['deli case', 'deli counter', 'serve-over counter', 'refrigerated display', 'charcuterie', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#c3cacd', { label: 'Stainless deck, trays and rails' });
const glass = param('glass', '#b9dde3', { label: 'Glass edges and top shelf' });
const facade = param('facade', '#7a2e2a', { label: 'Facade panels' });
const band = param('band', '#e9dcc0', { label: 'Brand band' });
const display = param('display', 'charcuterie', { choices: ['charcuterie', 'salads'], label: 'Display' });

presets({
  classicDeli: { stainless: '#c3cacd', glass: '#b9dde3', facade: '#7a2e2a', band: '#e9dcc0' },
  freshMarket: { stainless: '#d2d6d8', glass: '#c8e6ea', facade: '#3f7a4a', band: '#f4f1ea' },
  darkBistro: { stainless: '#a8b0b3', glass: '#a9cdd6', facade: '#24282b', band: '#c9a54a' },
});

const p = assembly("deli-service-case");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const L = 1800;
const DECK = 880;
const YF = -400;
const YB = 380;
const TOPZ = 1320;

// Base: kick, fluted facade, brand band, bumper rail, deck.
add("kick", blk(0, 20, 0, L - 40, YB - YF - 40, 100).color('#2b2f33'));
add("cabinet", blk(0, -10, 100, L, YB - YF - 20, DECK - 140).color(stainless));
for (let i = 0; i < 12; i++) add(`flute-${i}`, blk(-L / 2 + 75 + i * 150, YF - 6, 120, 120, 8, 560).color(facade));
add("brand-band", blk(0, YF - 8, 700, L, 10, 80).color(band));
add("band-name", blk(0, YF - 14, 715, 420, 6, 50).color(facade));
for (const [k, x] of [['l', -L / 2 + 120], ['m', 0], ['r', L / 2 - 120]]) add(`rail-bracket-${k}`, blk(x, YF - 40, 520, 30, 40, 30).color(stainless));
add("bumper-rail", cylinder(L - 40, 18, 10).rotateY(90).translate(-L / 2 + 20, YF - 50, 535).color(stainless));
add("deck", blk(0, -10, DECK - 40, L, YB - YF - 20, 40).color(stainless));
add("deck-front-lip", blk(0, YF + 10, DECK, L, 20, 30).color(stainless));

// Glass ends as edge frames, raked front glass rails and the top shelf.
const endOuter = [[YF, DECK], [-170, TOPZ], [150, TOPZ], [YB, 1000], [YB, DECK]];
const endInner = [[YF + 30, DECK + 30], [-160, TOPZ - 30], [135, TOPZ - 30], [YB - 30, 990], [YB - 30, DECK + 30]];
for (const [k, x] of [['l', -L / 2 + 8], ['r', L / 2 - 8]]) {
  add(`end-glass-${k}`, profileYZ(endOuter, 14).subtract(profileYZ(endInner, 20)).translate(x, 0, 0).color(glass));
}
const rake = Math.atan2(230, TOPZ - DECK) * 180 / Math.PI;
add("front-glass-foot", blk(0, YF + 12, DECK + 30, L - 20, 16, 24).color(stainless));
add("front-glass-sheen", blk(0, 0, 0, L - 40, 10, 40).rotateX(-rake).translate(0, YF + 20, DECK + 60).color(glass));
add("front-glass-head", blk(0, -170, TOPZ - 30, L - 20, 30, 30).color(stainless));
add("top-shelf", blk(0, -10, TOPZ, L, 330, 14).color(glass));
add("top-shelf-edge", blk(0, -178, TOPZ - 4, L, 10, 22).color(stainless));
for (const [k, x] of [['l', -L / 2 + 40], ['r', L / 2 - 40]]) add(`shelf-post-${k}`, blk(x, 140, DECK, 24, 24, TOPZ - DECK).color(stainless));

// Scale and wrap-paper roll on the top shelf.
add("scale-body", blk(560, -20, TOPZ + 14, 300, 260, 90).color('#e8eaea'));
add("scale-pan", blk(530, -40, TOPZ + 104, 230, 190, 8).color(stainless));
add("scale-display", blk(0, 0, 0, 200, 20, 90).rotateX(-20).translate(560, 110, TOPZ + 104).color('#2b2f33'));
add("scale-readout", blk(0, 0, 0, 150, 6, 30).rotateX(-20).translate(560, 107, TOPZ + 140).color('#7fe0a0'));
add("paper-holder", blk(-560, 20, TOPZ + 14, 420, 200, 30).color(stainless));
add("paper-roll", cylinder(380, 60, 14).rotateY(90).translate(-750, 20, TOPZ + 100).color('#f4ece0'));
add("price-board", blk(-60, 60, TOPZ + 14, 420, 16, 200).color('#2c332f'));
for (let i = 0; i < 4; i++) add(`price-line-${i}`, blk(-60, 50, TOPZ + 160 - i * 40, 320 - (i % 2) * 80, 4, 14).color('#efece4'));

// Two stepped rows of gastronorm trays.
const tray = (x: number, y: number, z: number) => blk(x, y, z, 330, 250, 60).subtract(blk(x, y, z + 10, 310, 230, 60));
const rows = [[-250, DECK], [20, DECK + 80]];
add("rear-step", blk(0, 20, DECK, L - 60, 260, 80).color(stainless));
const xs = [-680, -340, 0, 340, 680];
rows.forEach(([y, z], r) => xs.forEach((x, i) => {
  add(`tray-${r}-${i}`, tray(x, y, z).color(stainless));
  add(`tag-pick-${r}-${i}`, cylinder(70, 3, 6).translate(x + 120, y - 100, z + 20).color('#f4f1ea'));
  add(`tag-${r}-${i}`, blk(x + 120, y - 103, z + 80, 70, 4, 44).color('#f4f1ea'));
  add(`tag-price-${r}-${i}`, blk(x + 120, y - 106, z + 90, 44, 4, 14).color('#c8232c'));
}));

// Food in the trays.
const T = (r: number) => rows[r][1] + 10;
const Y = (r: number) => rows[r][0];
if (display.value === 'charcuterie') {
  // Salami logs with cut faces.
  for (let i = 0; i < 3; i++) {
    add(`salami-${i}`, cylinder(260, 40, 12).rotateY(90).translate(-810, Y(0) - 70 + i * 75, T(0) + 40).color('#8a2f2f'));
    add(`salami-face-${i}`, cylinder(4, 36, 12).rotateY(90).translate(-814, Y(0) - 70 + i * 75, T(0) + 40).color('#d07a78'));
  }
  // Ham half.
  add("ham", cylinder(260, 90, 14).rotateY(90).subtract(blk(130, 0, -100, 300, 200, 100)).translate(-470, Y(0), T(0)).color('#e59a94'));
  add("ham-rind", cylinder(260, 90, 14).rotateY(90).subtract(blk(130, 0, -100, 300, 200, 100)).subtract(cylinder(270, 82, 14).rotateY(90).translate(-5, 0, 0)).translate(-470, Y(0), T(0)).color('#c98a5a'));
  // Cheese wheels with a wedge cut.
  add("cheese-wheel", cylinder(80, 110, 18).subtract(blk(60, -60, -10, 120, 120, 100)).translate(-10, Y(0), T(0)).color('#f0c75a'));
  add("cheese-rind", cylinder(80, 110, 18).subtract(cylinder(90, 104, 18).translate(0, 0, -5)).subtract(blk(60, -60, -10, 120, 120, 100)).translate(-10, Y(0), T(0)).color('#c99a3a'));
  add("cheese-wedge", extrudePolygon([[0, 0], [110, -20], [100, -60]], 70).translate(15, Y(0) - 25, T(0)).color('#f0c75a'));
  add("blue-cheese", cylinder(90, 80, 14).translate(340, Y(0), T(0)).color('#e6e2d0'));
  for (let i = 0; i < 4; i++) add(`blue-vein-${i}`, blk(310 + i * 20, Y(0) - 60 + i * 30, T(0) + 90, 30, 30, 4).color('#5a7a9a'));
  // Olives and sliced meats.
  add("olives", blk(680, Y(0), T(0), 300, 220, 40).color('#5a6e2a'));
  for (let i = 0; i < 6; i++) add(`olive-${i}`, cylinder(24, 18, 8).translate(590 + (i % 3) * 90, Y(0) - 50 + Math.floor(i / 3) * 100, T(0) + 40).color(i % 2 ? '#3b4a1c' : '#7a8e3a'));
  const meats = ['#b6403e', '#d98a7a', '#9a3a2a', '#e8b0a0', '#c0504a'];
  xs.forEach((x, i) => {
    for (let j = 0; j < 4; j++) {
      add(`slice-${i}-${j}`, cylinder(8, 60, 12).rotateX(35).translate(x - 100 + j * 65, Y(1), T(1) + 40).color(meats[(i + j) % 5]));
    }
  });
} else {
  const salads = [['#f2ecd0', '#7fb04a'], ['#7a2a4a', '#f2ecd0'], ['#e8c85a', '#4f8f3a'], ['#4f9a42', '#c8232c'], ['#e88a3a', '#f4f1ea']];
  rows.forEach(([y, z], r) => xs.forEach((x, i) => {
    const [base, garnish] = salads[(i + r * 2) % 5];
    add(`salad-${r}-${i}`, blk(x, y, z + 10, 300, 220, 40).color(base));
    add(`salad-mound-${r}-${i}`, blk(x, y, z + 50, 200, 140, 20).color(base));
    for (let j = 0; j < 3; j++) add(`garnish-${r}-${i}-${j}`, blk(x - 60 + j * 60, y - 20 + (j % 2) * 40, z + 70, 34, 34, 10).color(garnish));
    add(`serving-spoon-${r}-${i}`, cylinder(200, 7, 6).rotateX(-60).translate(x - 110, y + 40, z + 50).color(stainless));
  }));
}

return p.model();
