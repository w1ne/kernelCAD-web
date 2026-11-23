// SPDX-License-Identifier: CC0-1.0
// Floor display stand: the printed corrugated-card promo unit (FSDU) a
// brand drops at the end of an aisle. What makes it a promo stand rather
// than a shelf: printed side cheeks with a raked front edge, four stepped
// shelves with printed price lips, rows of the same product facing the
// shopper (cereal boxes or stacked cans), an arched header card with the
// brand roundel and lettering, and a starburst "offer" wobbler sticking
// out from the header. Generic visualization geometry at about real size
// (0.6 m wide, 1.8 m tall), millimetres, Z up, front on -Y.

meta({
  name: "floor-display-stand",
  license: 'CC0-1.0',
  title: "Floor display stand",
  description: "Printed cardboard promotional floor display (FSDU) at about real size: raked side cheeks, four stepped shelves with price lips, rows of cereal boxes or stacked cans, arched header with brand roundel and lettering, and a starburst offer wobbler. Material controls: card body, brand print, pack colour, pack label. breakfastPromo, summerDrinks and ecoBrand presets; product choice.",
  tags: ['floor display', 'FSDU', 'promo stand', 'cardboard display', 'point of sale', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const card = param('card', '#f2ede2', { label: 'Card body' });
const print = param('print', '#c8232c', { label: 'Brand print' });
const pack = param('pack', '#e3a72f', { label: 'Product packs' });
const label = param('label', '#2f5fb0', { label: 'Pack labels' });
const product = param('product', 'cereal', { choices: ['cereal', 'cans'], label: 'Product' });

presets({
  breakfastPromo: { card: '#f2ede2', print: '#c8232c', pack: '#e3a72f', label: '#2f5fb0' },
  summerDrinks: { card: '#e8f4f8', print: '#1f7ac0', pack: '#d8dcde', label: '#e8473a' },
  ecoBrand: { card: '#c8a878', print: '#3f7a3a', pack: '#eae2c8', label: '#6b4a2a' },
});

const p = assembly("floor-display-stand");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 600;
const YB = 200;
const BODY = 1450;
const BASE = 120;
// The cheek front edge rakes back from y = -200 at the base to y = 20 at the top.
const frontY = (z: number) => -200 + (220 * (z - BASE)) / (BODY - BASE);

// Base tray, back panel and raked side cheeks.
add("base", blk(0, 0, 0, W - 24, 2 * YB, BASE).color(print));
add("base-band", blk(0, -YB - 3, 40, W - 60, 6, 40).color(card));
add("back", blk(0, YB - 6, 0, W, 12, BODY).color(card));
const cheek = [[-YB, 0], [YB, 0], [YB, BODY], [frontY(BODY), BODY], [-YB, BASE]];
for (const [k, x] of [['l', -W / 2 + 6], ['r', W / 2 - 6]]) {
  add(`cheek-${k}`, profileYZ(cheek, 12).translate(x, 0, 0).color(card));
  add(`cheek-stripe-${k}`, profileYZ([[-YB + 30, 300], [YB - 40, 300], [YB - 40, 420], [frontY(420) + 30, 420]], 4).translate(x + (k === 'l' ? -8 : 8), 0, 0).color(print));
}
add("back-print", blk(0, YB - 14, 1150, W - 40, 4, 240).color(print));

// Four stepped shelves with printed price lips and product.
const shelves = [BASE, 440, 760, 1080];
shelves.forEach((z, s) => {
  const yf = frontY(z);
  if (s > 0) add(`shelf-${s}`, blk(0, (yf + YB) / 2, z - 10, W - 24, YB - yf, 10).color(card));
  add(`lip-${s}`, blk(0, yf - 4, z - 10, W - 24, 8, 60).color(print));
  add(`price-${s}`, blk(200, yf - 10, z + 4, 110, 4, 36).color('#f2d24a'));
  const y0 = yf + 50;
  for (let i = 0; i < 5; i++) {
    const x = -228 + i * 114;
    if (product.value === 'cans') {
      for (let j = 0; j < 2; j++) {
        add(`can-${s}-${i}-${j}`, cylinder(120, 46, 10).translate(x, y0, z + j * 122).color(pack));
        add(`can-label-${s}-${i}-${j}`, cylinder(60, 49, 10).translate(x, y0, z + 30 + j * 122).color(label));
      }
    } else {
      add(`box-${s}-${i}`, blk(x, y0 + 30, z, 100, 60, 260).color(pack));
      add(`box-label-${s}-${i}`, blk(x, y0 - 2, z + 150, 102, 4, 70).color(label));
      add(`box-bowl-${s}-${i}`, blk(x, y0 - 3, z + 60, 60, 4, 40).color(card));
    }
  }
});

// Arched header card with roundel and lettering.
const arch = [[-W / 2, 0], [W / 2, 0]];
for (let i = 0; i <= 10; i++) {
  const a = (i / 10) * Math.PI;
  arch.push([(W / 2) * Math.cos(a), 220 + 110 * Math.sin(a)]);
}
add("header", profileXZ(arch, 14).translate(0, YB - 20, BODY).color(print));
add("header-roundel", cylinder(8, 90, 20).rotateX(90).translate(-170, YB - 26, BODY + 180).color(card));
add("roundel-mark", cylinder(6, 60, 16).rotateX(90).translate(-170, YB - 32, BODY + 180).color(pack));
add("header-word", blk(80, YB - 30, BODY + 210, 300, 6, 70).color(card));
add("header-subline", blk(80, YB - 30, BODY + 130, 260, 6, 30).color(pack));

// Starburst offer wobbler on a stalk from the header's edge.
const star = [];
for (let i = 0; i < 20; i++) {
  const a = (i / 20) * 2 * Math.PI;
  const r = i % 2 ? 62 : 90;
  star.push([r * Math.cos(a), r * Math.sin(a)]);
}
add("wobbler-stalk", blk(-W / 2 - 60, YB - 40, BODY + 100, 120, 6, 12).color('#d9dcdd'));
add("wobbler", profileXZ(star, 6).translate(-W / 2 - 150, YB - 46, BODY + 106).color('#f2d24a'));
add("wobbler-text", blk(-W / 2 - 150, YB - 52, BODY + 96, 90, 4, 24).color(print));

return p.model();
