// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-route-marker",
  license: 'CC0-1.0',
  title: "Fiber route marker",
  description: "Low ground route marker with tapered post, broad cap and square footing. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d5b242", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("fiber-route-marker");
p.part("foot", b(0, 0, 0, 250, 250, 50).color(color));
p.part("post", b(0, 0, 220, 95, 95, 390).color(color));
p.part("cap", b(0, 0, 445, 210, 210, 60).color(color));
p.part("face", b(0, -54, 235, 55, 18, 180).color(color));

return p.model();
