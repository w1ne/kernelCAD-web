// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "checkout-divider",
  license: 'CC0-1.0',
  title: "Checkout divider",
  description: "Low polygon checkout divider with long body, raised grip fin and beveled-looking end blocks. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#df973e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-divider");
p.part("body", b(0, 0, 26, 260, 62, 52).color(color));
p.part("grip-fin", b(0, 0, 64, 24, 54, 32).color(color));
p.part("end-left", b(-112, 0, 42, 38, 76, 84).color(color));
p.part("end-right", b(112, 0, 42, 38, 76, 84).color(color));
p.part("top-button", c(0, 0, 80, 10, 12, 8).color(color));

return p.model();
