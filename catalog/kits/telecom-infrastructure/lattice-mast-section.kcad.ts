// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "lattice-mast-section",
  license: 'CC0-1.0',
  title: "Lattice mast section",
  description: "Square lattice mast segment with four corner legs, diagonal braces and end flanges. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#70797c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("lattice-mast-section");
p.part("leg-a", b(-220, -220, 35, 42, 42, 1100).color(color));
p.part("leg-b", b(220, -220, 35, 42, 42, 1100).color(color));
p.part("leg-c", b(-220, 220, 35, 42, 42, 1100).color(color));
p.part("leg-d", b(220, 220, 35, 42, 42, 1100).color(color));
p.part("cross-x1", b(0, -220, 300, 480, 38, 38).color(color));
p.part("cross-x2", b(0, 220, 300, 480, 38, 38).color(color));
p.part("brace-a", b(-115, -220, 510, 30, 30, 700).color(color));
p.part("flange", b(0, 0, 0, 560, 560, 45).color(color));

return p.model();
