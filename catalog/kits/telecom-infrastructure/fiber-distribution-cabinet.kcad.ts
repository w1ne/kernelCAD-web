// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-distribution-cabinet",
  license: 'CC0-1.0',
  title: "Fiber distribution cabinet",
  description: "Street-side fiber distribution cabinet with hinged-looking front, lock and cable plinth. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b8077", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-distribution-cabinet");
p.part("body", b(0, 0, 45, 620, 430, 920).color(color));
p.part("hood", b(0, 0, 985, 670, 480, 60).color(color));
p.part("door", b(0, -222, 65, 540, 16, 760).color(color));
p.part("lock", c(195, -238, 575, 28, 18, 8).color(color));
p.part("lower-skirt", b(0, 0, 0, 660, 470, 50).color(color));

return p.model();
