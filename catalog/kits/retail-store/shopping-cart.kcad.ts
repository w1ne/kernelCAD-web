// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "shopping-cart",
  license: 'CC0-1.0',
  title: "Shopping cart",
  description: "Low-poly wire basket cart with tubular frame, child seat panel, lower rack and four casters. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#627178", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);

const p = assembly("shopping-cart");
p.part("basket-floor", b(0, -20, 610, 820, 530, 34).color(color));
p.part("basket-front", b(0, -270, 825, 820, 24, 430).color(color));
p.part("basket-back", b(0, 230, 860, 820, 24, 360).color(color));
p.part("basket-side--400", b(-400, -20, 815, 24, 500, 430).color(color));
p.part("basket-side-400", b(400, -20, 815, 24, 500, 430).color(color));
p.part("handlebar", b(0, 325, 1060, 620, 34, 38).color(color));
p.part("handle-post--300", b(-300, 280, 990, 26, 100, 180).color(color));
p.part("handle-post-300", b(300, 280, 990, 26, 100, 180).color(color));
p.part("lower-rack", b(0, -10, 300, 640, 380, 24).color(color));
p.part("wheel--390--250", cx(-390, -250, 78, 60, 78, 10).color(color));
p.part("wheel--390-250", cx(-390, 250, 78, 60, 78, 10).color(color));
p.part("wheel-390--250", cx(390, -250, 78, 60, 78, 10).color(color));
p.part("wheel-390-250", cx(390, 250, 78, 60, 78, 10).color(color));
p.part("wheel-mount--390--250", b(-390, -250, 385, 52, 76, 460).color(color));
p.part("wheel-mount--390-250", b(-390, 250, 385, 52, 76, 460).color(color));
p.part("wheel-mount-390--250", b(390, -250, 385, 52, 76, 460).color(color));
p.part("wheel-mount-390-250", b(390, 250, 385, 52, 76, 460).color(color));
p.part("frame--400", b(-400, 0, 480, 24, 28, 840).color(color));
p.part("frame-400", b(400, 0, 480, 24, 28, 840).color(color));

return p.model();
