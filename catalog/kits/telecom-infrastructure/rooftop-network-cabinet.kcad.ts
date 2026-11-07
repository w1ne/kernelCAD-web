// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "rooftop-network-cabinet",
  license: 'CC0-1.0',
  title: "Rooftop network cabinet",
  description: "Low rooftop radio cabinet with raised curb, hinged lid and side ventilation slots. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b837d", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("rooftop-network-cabinet");
p.part("curb", b(0, 0, 0, 1250, 850, 60).color(color));
p.part("body", b(0, 0, 360, 1150, 750, 660).color(color));
p.part("lid", b(0, 0, 720, 1210, 810, 60).color(color));
p.part("front-panel", b(0, -383, 370, 860, 18, 500).color(color));
p.part("vent-left", b(-350, -397, 370, 130, 12, 210).color(color));
p.part("vent-right", b(350, -397, 370, 130, 12, 210).color(color));

return p.model();
