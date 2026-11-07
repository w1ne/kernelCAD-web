// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "mast-outrigger-frame",
  license: 'CC0-1.0',
  title: "Mast outrigger frame",
  description: "Rooftop outrigger frame with two ballast rails, cross members and a central mast socket. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657179", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("mast-outrigger-frame");
p.part("rail-left", b(-460, 0, 0, 100, 1700, 70).color(color));
p.part("rail-right", b(460, 0, 0, 100, 1700, 70).color(color));
p.part("cross-front", b(0, -720, 55, 1020, 100, 100).color(color));
p.part("cross-rear", b(0, 720, 55, 1020, 100, 100).color(color));
p.part("socket", c(0, 0, 65, 430, 88, 8).color(color));
p.part("brace-left", b(-230, 0, 195, 40, 120, 350).color(color));
p.part("brace-right", b(230, 0, 195, 40, 120, 350).color(color));

return p.model();
