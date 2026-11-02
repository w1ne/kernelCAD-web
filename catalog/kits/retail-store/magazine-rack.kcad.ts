// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "magazine-rack",
  license: 'CC0-1.0',
  title: "Magazine rack",
  description: "Angled multi-pocket magazine stand with four front lips, tall backboard and side supports. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c5e50", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("magazine-rack");
p.part("backboard", b(0, 120, 700, 700, 55, 1400).color(color));
p.part("pocket-0", b(0, -120, 190, 680, 300, 95).color(color));
p.part("pocket-1", b(0, -62, 490, 680, 300, 95).color(color));
p.part("pocket-2", b(0, -4, 790, 680, 300, 95).color(color));
p.part("pocket-3", b(0, 54, 1090, 680, 300, 95).color(color));
p.part("side--350", b(-350, 0, 710, 38, 350, 1420).color(color));
p.part("side-350", b(350, 0, 710, 38, 350, 1420).color(color));
p.part("floor-foot", c(0, 0, 0, 35, 60, 8).color(color));

return p.model();
