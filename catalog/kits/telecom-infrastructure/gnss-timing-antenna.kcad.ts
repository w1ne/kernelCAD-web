// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "gnss-timing-antenna",
  license: 'CC0-1.0',
  title: "GNSS timing antenna",
  description: "Compact timing antenna puck on a short pole with a broad weather cap. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#dedfd5", { label: 'Asset color' });
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("gnss-timing-antenna");
p.part("base", c(0, 0, 0, 55, 100, 8).color(color));
p.part("pole", c(0, 0, 55, 300, 24, 8).color(color));
p.part("puck", c(0, 0, 355, 100, 145, 8).color(color));
p.part("cap", c(0, 0, 455, 35, 155, 8).color(color));

return p.model();
