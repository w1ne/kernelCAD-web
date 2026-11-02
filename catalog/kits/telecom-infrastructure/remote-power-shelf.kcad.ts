// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "remote-power-shelf",
  license: 'CC0-1.0',
  title: "Remote power shelf",
  description: "Rack power shelf with two module faces, handles and a raised top lip. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626b70", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("remote-power-shelf");
p.part("shelf", b(0, 0, 0, 680, 360, 340).color(color));
p.part("top", b(0, 0, 190, 700, 380, 40).color(color));
p.part("module-left", b(-160, -188, 15, 280, 18, 220).color(color));
p.part("module-right", b(160, -188, 15, 280, 18, 220).color(color));
p.part("handle-left", b(-220, -220, 15, 45, 30, 130).color(color));
p.part("handle-right", b(220, -220, 15, 45, 30, 130).color(color));

return p.model();
