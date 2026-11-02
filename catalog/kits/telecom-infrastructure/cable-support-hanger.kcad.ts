// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "cable-support-hanger",
  license: 'CC0-1.0',
  title: "Cable support hanger",
  description: "Two-hole wall plate with a projecting U-shaped cable support and end lips. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b7478", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("cable-support-hanger");
p.part("backplate", b(0, 0, 0, 360, 45, 660).color(color));
p.part("arm-left", b(-170, -190, 0, 40, 380, 40).color(color));
p.part("arm-right", b(170, -190, 0, 40, 380, 40).color(color));
p.part("crossbar", b(0, -380, 0, 380, 40, 40).color(color));
p.part("lip-left", b(-170, -360, 50, 40, 40, 100).color(color));
p.part("lip-right", b(170, -360, 50, 40, 40, 100).color(color));

return p.model();
