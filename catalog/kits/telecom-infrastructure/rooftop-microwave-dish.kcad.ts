// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "rooftop-microwave-dish",
  license: 'CC0-1.0',
  title: "Rooftop microwave dish",
  description: "Medium rooftop microwave dish with upright post, offset arm and compact feed horn. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c7cdcf", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("rooftop-microwave-dish");
p.part("dish-rim", c(0, 0, 750, 70, 360, 8).color(color));
p.part("dish", b(0, -20, 790, 620, 30, 620).color(color));
p.part("arm", b(0, -240, 710, 45, 400, 45).color(color));
p.part("feed-horn", c(0, -430, 690, 115, 68, 8).color(color));
p.part("post", c(0, 80, 0, 720, 45, 8).color(color));
p.part("foot", b(0, 80, 25, 280, 260, 50).color(color));

return p.model();
