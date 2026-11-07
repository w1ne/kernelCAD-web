// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "omnidirectional-whip-antenna",
  license: 'CC0-1.0',
  title: "Omnidirectional whip antenna",
  description: "Short omnidirectional whip aerial with base puck and stepped connector collar. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#454c50", { label: 'Asset color' });
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("omnidirectional-whip-antenna");
p.part("base", c(0, 0, 0, 45, 95, 8).color(color));
p.part("collar", c(0, 0, 45, 50, 65, 8).color(color));
p.part("whip", c(0, 0, 95, 950, 20, 8).color(color));
p.part("tip", c(0, 0, 1045, 30, 26, 8).color(color));

return p.model();
