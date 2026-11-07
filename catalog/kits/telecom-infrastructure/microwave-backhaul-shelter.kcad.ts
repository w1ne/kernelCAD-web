// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "microwave-backhaul-shelter",
  license: 'CC0-1.0',
  title: "Microwave backhaul shelter",
  description: "Narrow field shelter for radio backhaul equipment with door, roof lip and wall vents. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596a72", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("microwave-backhaul-shelter");
p.part("base", b(0, 0, 0, 1600, 1250, 70).color(color));
p.part("shell", b(0, 0, 1085, 1500, 1150, 2100).color(color));
p.part("roof", b(0, 0, 2165, 1680, 1320, 100).color(color));
p.part("door", b(0, -581, 145, 650, 20, 1700).color(color));
p.part("vent", b(520, -592, 1365, 280, 18, 190).color(color));
p.part("step", b(0, -700, 15, 780, 260, 100).color(color));

return p.model();
