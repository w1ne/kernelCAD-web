// SPDX-License-Identifier: CC0-1.0
// Bulk goods bin: a timber stand of three gravity dispensers for loose
// beans, nuts and grains at a refill or farm shop. What makes it a
// gravity bin rather than a box: clear bins whose floors slope down to a
// front chute, each filled to a different level, a stainless lever gate
// on every chute, hinged lids, label cards, a drip shelf with a scoop and
// paper bags underneath, and a chalkboard header. Bin walls are drawn as
// edge frames so the contents show. Generic visualization geometry at
// about real size (1.05 m wide, 1.94 m tall), millimetres, Z up, front
// on -Y.

meta({
  name: "bulk-food-bin",
  license: 'CC0-1.0',
  title: "Bulk goods bin",
  description: "Three-bin gravity dispenser stand at about real size: clear bins with sloped floors filled to different levels, stainless chutes with lever gates, hinged lids, label cards, drip shelf with scoop and paper bags, timber cabinet and a chalkboard header. Material controls: timber, bin acrylic, stainless, chalkboard. farmShop, zeroWaste and modernMarket presets; contents choice.",
  tags: ['bulk bin', 'gravity bin', 'dispenser', 'refill', 'zero waste', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#a7774a', { label: 'Timber stand' });
const acrylic = param('acrylic', '#cfe6ea', { label: 'Bin acrylic edges and lids' });
const stainless = param('stainless', '#b9c1c5', { label: 'Stainless chutes and shelf' });
const board = param('board', '#2c332f', { label: 'Chalkboard header' });
const contents = param('contents', 'pantry', { choices: ['pantry', 'sweets'], label: 'Bin contents' });

presets({
  farmShop: { timber: '#a7774a', acrylic: '#cfe6ea', stainless: '#b9c1c5', board: '#2c332f' },
  zeroWaste: { timber: '#d9c29a', acrylic: '#e4efe9', stainless: '#8f9a96', board: '#3f6b4a' },
  modernMarket: { timber: '#3b3f42', acrylic: '#d6e4ec', stainless: '#d2d6d8', board: '#c9a54a' },
});

const p = assembly("bulk-food-bin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1050;
const D = 460;
const BASE = 760;
const BW = 300;
const pitch = 340;
const goods = contents.value === 'sweets'
  ? [['#e0457b', 'jelly beans'], ['#f2b632', 'lemon drops'], ['#5bb0e0', 'mint balls']]
  : [['#5a3524', 'coffee beans'], ['#c9a46a', 'almonds'], ['#e6d7ad', 'basmati rice']];
const fills = [520, 380, 600];

// Timber cabinet, plinth and back panel.
add("plinth", blk(0, 10, 0, W - 40, D - 40, 80).color('#2b2f33'));
add("cabinet", blk(0, 0, 80, W, D, BASE - 80).color(timber));
for (const [k, x] of [['l', -W / 4], ['r', W / 4]]) {
  add(`door-${k}`, blk(x, -D / 2 - 4, 130, W / 2 - 40, 8, BASE - 200).color(timber));
  add(`door-knob-${k}`, cylinder(20, 14, 10).rotateX(90).translate(k === 'l' ? x + 200 : x - 200, -D / 2 - 8, 420).color(stainless));
}
add("back-panel", blk(0, D / 2 - 30, BASE, W, 30, 1000).color(timber));
for (const [k, x] of [['l', -W / 2 + 20], ['r', W / 2 - 20]]) add(`side-rail-${k}`, blk(x, 40, BASE, 40, D - 100, 1000).color(timber));

// Drip shelf with scoop and paper bags.
add("drip-shelf", blk(0, -60, BASE, W - 80, D - 140, 16).color(stainless));
add("shelf-lip", blk(0, -D / 2 + 12, BASE, W - 80, 6, 40).color(stainless));
add("scoop", blk(0, 0, 0, 90, 130, 50).subtract(blk(0, -6, 6, 80, 130, 60)).translate(-pitch, -120, BASE + 16).color(stainless));
add("scoop-handle", cylinder(120, 10, 10).rotateX(-90).translate(-pitch, -60, BASE + 40).color(board));
for (let i = 0; i < 3; i++) add(`paper-bag-${i}`, blk(pitch - 40 + i * 30, -60 + i * 14, BASE + 16, 130, 80, 220 - i * 30).color(i === 1 ? '#c49a6c' : '#b58a5c'));

// Gravity bins: sloped floor running down to a front chute.
const Z0 = BASE + 260;
const HB = 640;
const YBk = 150;
const YFr = -150;
const outer = [[YBk, 200], [YBk, HB], [YFr, HB], [YFr, 0], [YFr + 70, 0]];
const inner = [[YBk - 16, 216], [YBk - 16, HB - 16], [YFr + 16, HB - 16], [YFr + 16, 30], [YFr + 60, 30]];
goods.forEach(([colour], i) => {
  const x = (i - 1) * pitch;
  const at = (s: Shape) => s.translate(x, 0, Z0);
  // Contents fill the bin up to its level.
  add(`contents-${i}`, at(profileYZ([[YBk - 8, 208], [YBk - 8, fills[i]], [YFr + 8, fills[i]], [YFr + 8, 8], [YFr + 62, 8]], BW - 16)).color(colour));
  // Acrylic walls drawn as edge frames on both sides, plus the back.
  for (const [k, sx] of [['l', -BW / 2 + 4], ['r', BW / 2 - 4]]) {
    add(`bin-edge-${i}-${k}`, at(profileYZ(outer, 8).subtract(profileYZ(inner, 12)).translate(sx, 0, 0)).color(acrylic));
  }
  add(`bin-back-${i}`, at(blk(0, YBk - 4, 200, BW, 8, HB - 200)).color(acrylic));
  add(`bin-top-rim-${i}`, at(blk(0, YFr + 6, HB - 30, BW, 12, 30)).color(acrylic));
  add(`lid-${i}`, at(blk(0, 0, HB, BW + 10, YBk - YFr + 20, 14)).color(acrylic));
  add(`lid-knob-${i}`, at(cylinder(20, 16, 10).translate(0, YFr + 30, HB + 14)).color(stainless));
  add(`label-${i}`, at(blk(0, YFr - 4, 140, 160, 4, 70)).color('#f4f1ea'));
  add(`label-text-${i}`, at(blk(0, YFr - 7, 165, 110, 4, 16)).color(board));
  // Chute and lever gate.
  add(`chute-${i}`, at(blk(0, YFr + 35, -180, 110, 90, 180)).subtract(at(blk(0, YFr + 35, -190, 80, 60, 200))).color(stainless));
  add(`chute-spout-${i}`, at(profileYZ([[YFr - 20, -190], [YFr + 80, -190], [YFr + 80, -160], [YFr, -150]], 110)).subtract(at(blk(0, YFr + 30, -200, 70, 50, 60))).color(stainless));
  add(`lever-pivot-${i}`, at(cylinder(130, 12, 10).rotateY(90).translate(-65, YFr - 10, -60)).color(stainless));
  add(`lever-${i}`, at(profileYZ([[YFr - 4, -66], [YFr - 16, -54], [YFr - 140, 40], [YFr - 128, 28]], 16).translate(55, 0, 0)).color(stainless));
  add(`lever-grip-${i}`, at(cylinder(60, 16, 10).rotateY(90).translate(30, YFr - 134, 34)).color(board));
});

// Chalkboard header on the back panel.
add("header", blk(0, D / 2 - 40, BASE + 1000, W, 30, 160).color(board));
add("header-frame", blk(0, D / 2 - 30, BASE + 980, W + 20, 20, 200).color(timber));
for (let i = 0; i < 3; i++) add(`chalk-${i}`, blk((i - 1) * pitch, D / 2 - 58, BASE + 1050, 200 - i * 30, 4, 30).color('#efece4'));

return p.model();
