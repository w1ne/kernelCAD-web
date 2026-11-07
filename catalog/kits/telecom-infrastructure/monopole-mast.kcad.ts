// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "monopole-mast",
  license: 'CC0-1.0',
  title: "Monopole antenna mast",
  description: "Freestanding tapered-looking monopole with base flange, access rung strip and top mounting plate. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b8487", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("monopole-mast");
p.part("base", c(0, 0, 0, 50, 240, 8).color(color));
p.part("shaft-lower", c(0, 0, 50, 950, 92, 8).color(color));
p.part("shaft-upper", c(0, 0, 1000, 1050, 68, 8).color(color));
p.part("access-strip", b(85, 0, 450, 18, 22, 800).color(color));
p.part("top-plate", c(0, 0, 2050, 30, 130, 8).color(color));

return p.model();
