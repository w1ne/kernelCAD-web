// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "surge-protector-enclosure",
  license: 'CC0-1.0',
  title: "Surge protection enclosure",
  description: "Compact surge protection box with a front cover, conduit entry and top cap. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b817b", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("surge-protector-enclosure");
p.part("body", b(0, 0, 190, 390, 210, 380).color(color));
p.part("lid", b(0, -112, 195, 350, 18, 330).color(color));
p.part("cap", b(0, 0, 400, 420, 240, 45).color(color));
p.part("conduit", c(0, 0, 0, 180, 40, 8).color(color));
p.part("latch", c(125, -130, 240, 24, 15, 8).color(color));

return p.model();
