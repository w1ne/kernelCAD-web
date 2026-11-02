// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "outdoor-network-cabinet",
  license: 'CC0-1.0',
  title: "Outdoor network cabinet",
  description: "Tall weatherproof network enclosure with sloped rain cap, side louvers and raised feet. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77838a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("outdoor-network-cabinet");
p.part("body", b(0, 0, 75, 780, 600, 1500).color(color));
p.part("cap", b(0, 0, 1615, 860, 680, 100).color(color));
p.part("side-louver-a", b(-402, 0, 535, 18, 300, 260).color(color));
p.part("side-louver-b", b(-402, 0, 855, 18, 300, 260).color(color));
p.part("door", b(0, -308, 105, 650, 18, 1280).color(color));
p.part("foot-left", b(-290, 0, 0, 100, 120, 50).color(color));
p.part("foot-right", b(290, 0, 0, 100, 120, 50).color(color));

return p.model();
