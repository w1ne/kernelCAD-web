// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-service-loop-rack",
  license: 'CC0-1.0',
  title: "Fiber service loop rack",
  description: "Wall rack for fiber service loops with four broad retaining fingers and a backplate. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626e62", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-service-loop-rack");
p.part("backplate", b(0, 0, 200, 400, 45, 600).color(color));
p.part("loop-left", c(0, -170, 0, 40, 190, 8).color(color));
p.part("loop-right", c(0, 170, 0, 40, 190, 8).color(color));
p.part("finger-0", b(0, -220, 220, 80, 100, 480).color(color));
p.part("finger-1", b(0, -75, 220, 80, 100, 480).color(color));
p.part("finger-2", b(0, 70, 220, 80, 100, 480).color(color));
p.part("finger-3", b(0, 215, 220, 80, 100, 480).color(color));

return p.model();
