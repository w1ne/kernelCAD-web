// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-handhole-cover",
  license: 'CC0-1.0',
  title: "Fiber handhole cover",
  description: "Rectangular fiber handhole lid with raised rim, lift slots and a small network marker. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747873", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("fiber-handhole-cover");
p.part("rim", b(0, 0, 0, 900, 600, 50).color(color));
p.part("lid", b(0, 0, 40, 820, 520, 40).color(color));
p.part("slot-left", b(-280, -5, 65, 110, 38, 16).color(color));
p.part("slot-right", b(280, -5, 65, 110, 38, 16).color(color));
p.part("marker", b(0, 0, 70, 150, 95, 18).color(color));

return p.model();
