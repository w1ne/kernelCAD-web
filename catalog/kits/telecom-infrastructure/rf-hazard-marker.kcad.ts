// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "rf-hazard-marker",
  license: 'CC0-1.0',
  title: "RF hazard marker",
  description: "Compact RF exposure marker on a post with a raised diamond-like center plate. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d3aa37", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("rf-hazard-marker");
p.part("post", b(0, 0, 0, 55, 55, 800).color(color));
p.part("plate", b(0, 0, 665, 450, 40, 360).color(color));
p.part("center", b(0, -26, 665, 250, 18, 200).color(color));
p.part("foot", b(0, 0, 0, 200, 200, 50).color(color));

return p.model();
