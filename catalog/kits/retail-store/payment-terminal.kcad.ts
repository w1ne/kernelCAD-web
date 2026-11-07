// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "payment-terminal",
  license: 'CC0-1.0',
  title: "Payment terminal",
  description: "Handheld payment pin pad with angled display, keypad block, contactless area and stand. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#42515d", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("payment-terminal");
p.part("base", b(0, 0, 25, 210, 190, 50).color(color));
p.part("housing", b(0, 0, 105, 180, 155, 150).color(color));
p.part("screen", b(0, -82, 160, 132, 12, 65).color(color));
p.part("keypad", b(0, 36, 166, 126, 75, 40).color(color));
p.part("contactless-mark", c(0, -6, 165, 10, 24, 8).color(color));

return p.model();
