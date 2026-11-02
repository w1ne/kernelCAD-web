// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "shopping-basket",
  license: 'CC0-1.0',
  title: "Shopping basket",
  description: "Rigid shopping basket with deep molded body, broad top rim and two short swing handles. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b56c3b", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("shopping-basket");
p.part("body", b(0, 0, 180, 540, 380, 360).color(color));
p.part("rim", b(0, 0, 370, 600, 430, 46).color(color));
p.part("handle-left", b(-220, 0, 500, 22, 28, 230).color(color));
p.part("handle-right", b(220, 0, 500, 22, 28, 230).color(color));
p.part("grip", b(0, 0, 615, 460, 30, 30).color(color));
p.part("pivot-left", c(-230, 0, 350, 20, 22, 8).color(color));
p.part("pivot-right", c(230, 0, 350, 20, 22, 8).color(color));

return p.model();
