// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "stock-hand-truck",
  license: 'CC0-1.0',
  title: "Stock hand truck",
  description: "Two-wheel stock hand truck with toe plate, tall spine, upper grip and chunky tires. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f6870", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);

const p = assembly("stock-hand-truck");
p.part("spine", b(0, 0, 520, 70, 90, 1040).color(color));
p.part("toe-plate", b(0, -130, 45, 560, 360, 90).color(color));
p.part("top-grip", b(0, 0, 1100, 400, 52, 54).color(color));
p.part("wheel--235", cx(-235, 0, 145, 70, 145, 12).color(color));
p.part("wheel-235", cx(235, 0, 145, 70, 145, 12).color(color));
p.part("wheel-guard--180", b(-180, 50, 240, 34, 90, 300).color(color));
p.part("wheel-guard-180", b(180, 50, 240, 34, 90, 300).color(color));

return p.model();
