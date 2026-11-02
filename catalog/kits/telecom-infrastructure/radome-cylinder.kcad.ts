// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "radome-cylinder",
  license: 'CC0-1.0',
  title: "Cylindrical antenna radome",
  description: "Smooth cylindrical radome with rounded-looking cap rings and a narrow mounting foot. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d8dad4", { label: 'Asset color' });
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("radome-cylinder");
p.part("foot", c(0, 0, 0, 80, 120, 8).color(color));
p.part("shell", c(0, 0, 80, 1050, 110, 8).color(color));
p.part("cap", c(0, 0, 1130, 60, 118, 8).color(color));
p.part("collar", c(0, 0, 150, 36, 116, 8).color(color));

return p.model();
