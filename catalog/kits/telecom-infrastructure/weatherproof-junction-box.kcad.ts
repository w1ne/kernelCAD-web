// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "weatherproof-junction-box",
  license: 'CC0-1.0',
  title: "Weatherproof junction box",
  description: "Small sealed junction box with screw-down lid, raised lip and three cable entries. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8a9085", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("weatherproof-junction-box");
p.part("base", b(0, 0, 75, 340, 240, 150).color(color));
p.part("lid", b(0, 0, 175, 360, 260, 45).color(color));
p.part("entry-0", c(-110, 0, 0, 95, 28, 8).color(color));
p.part("entry-1", c(0, 0, 0, 95, 28, 8).color(color));
p.part("entry-2", c(110, 0, 0, 95, 28, 8).color(color));
p.part("screw--145--95", c(-145, -95, 200, 18, 12, 8).color(color));
p.part("screw--145-95", c(-145, 95, 200, 18, 12, 8).color(color));
p.part("screw-145--95", c(145, -95, 200, 18, 12, 8).color(color));
p.part("screw-145-95", c(145, 95, 200, 18, 12, 8).color(color));

return p.model();
