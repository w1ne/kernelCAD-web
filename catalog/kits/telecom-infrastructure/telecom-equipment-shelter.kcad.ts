// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "telecom-equipment-shelter",
  license: 'CC0-1.0',
  title: "Telecom equipment shelter",
  description: "Small site shelter with two access doors, vent panels, corner posts and a broad roof. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a7779", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("telecom-equipment-shelter");
p.part("floor", b(0, 0, 0, 2600, 2100, 90).color(color));
p.part("rear", b(0, 1000, 1225, 2500, 70, 2380).color(color));
p.part("left", b(-1215, 0, 1225, 70, 2000, 2380).color(color));
p.part("right", b(1215, 0, 1225, 70, 2000, 2380).color(color));
p.part("roof", b(0, 0, 2445, 2750, 2250, 130).color(color));
p.part("door-a", b(-500, -1040, 115, 800, 24, 2050).color(color));
p.part("door-b", b(500, -1040, 115, 800, 24, 2050).color(color));

return p.model();
