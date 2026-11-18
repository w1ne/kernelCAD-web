// SPDX-License-Identifier: CC0-1.0
// Retail cart with an open wire-grid basket, child-seat rail, lower rack and four rubber casters

meta({
  name: "shopping-cart",
  license: 'CC0-1.0',
  title: "Shopping cart",
  description: "Retail cart with an open wire-grid basket, child-seat rail, lower rack and four rubber casters. Knobs: overall scale and stainless steel, polypropylene, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#77868a', { label: 'Stainless steel color' });
const polypropylene = param('polypropylene', '#b63d35', { label: 'Polypropylene color' });
const rubber = param('rubber', '#292d30', { label: 'Rubber color' });

presets({
  cleanStore: {
    stainless: '#bfc8cb',
    polypropylene: '#d6e0d5',
    rubber: '#40474b',
  },
  nightRestock: {
    stainless: '#66747a',
    polypropylene: '#45614e',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);

const p = assembly("shopping-cart");
p.part("basket-floor", b(0, -20, 610, 820, 530, 34).color(stainless));
for (let row = 0; row < 5; row++) {
  const z = 650 + row * 95;
  p.part(`front-wire-${row}`, b(0, -270, z, 820, 16, 14).color(stainless));
  p.part(`back-wire-${row}`, b(0, 230, z, 820, 16, 14).color(stainless));
  p.part(`left-wire-${row}`, b(-400, -20, z, 16, 500, 14).color(stainless));
  p.part(`right-wire-${row}`, b(400, -20, z, 16, 500, 14).color(stainless));
}
for (let rod = 0; rod <= 8; rod++) {
  const x = -400 + rod * 100;
  p.part(`front-upright-${rod}`, b(x, -270, 845, 14, 16, 390).color(stainless));
  p.part(`back-upright-${rod}`, b(x, 230, 845, 14, 16, 390).color(stainless));
}
for (let rod = 0; rod <= 5; rod++) {
  const y = -270 + rod * 100;
  p.part(`left-upright-${rod}`, b(-400, y, 845, 16, 14, 390).color(stainless));
  p.part(`right-upright-${rod}`, b(400, y, 845, 16, 14, 390).color(stainless));
}
p.part("handlebar", b(0, 325, 1060, 620, 34, 38).color(polypropylene));
p.part("handle-post--300", b(-300, 280, 990, 26, 100, 180).color(polypropylene));
p.part("handle-post-300", b(300, 280, 990, 26, 100, 180).color(polypropylene));
p.part("lower-rack", b(0, -10, 300, 640, 380, 24).color(stainless));
p.part("wheel--390--250", cx(-390, -250, 78, 60, 78, 10).color(rubber));
p.part("wheel--390-250", cx(-390, 250, 78, 60, 78, 10).color(rubber));
p.part("wheel-390--250", cx(390, -250, 78, 60, 78, 10).color(rubber));
p.part("wheel-390-250", cx(390, 250, 78, 60, 78, 10).color(rubber));
p.part("wheel-mount--390--250", b(-390, -250, 385, 52, 76, 460).color(stainless));
p.part("wheel-mount--390-250", b(-390, 250, 385, 52, 76, 460).color(stainless));
p.part("wheel-mount-390--250", b(390, -250, 385, 52, 76, 460).color(stainless));
p.part("wheel-mount-390-250", b(390, 250, 385, 52, 76, 460).color(stainless));
p.part("frame--400", b(-400, 0, 480, 24, 28, 840).color(stainless));
p.part("frame-400", b(400, 0, 480, 24, 28, 840).color(stainless));

return p.model();
