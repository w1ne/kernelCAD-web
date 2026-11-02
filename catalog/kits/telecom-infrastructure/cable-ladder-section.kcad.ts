// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "cable-ladder-section",
  license: 'CC0-1.0',
  title: "Cable ladder section",
  description: "Straight cable ladder tray with twin rails and six evenly spaced rungs. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747c7e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("cable-ladder-section");
p.part("rail-left", b(0, -230, 0, 1500, 45, 70).color(color));
p.part("rail-right", b(0, 230, 0, 1500, 45, 70).color(color));
p.part("rung-0", b(-600, 0, 0, 45, 500, 45).color(color));
p.part("rung-1", b(-360, 0, 0, 45, 500, 45).color(color));
p.part("rung-2", b(-120, 0, 0, 45, 500, 45).color(color));
p.part("rung-3", b(120, 0, 0, 45, 500, 45).color(color));
p.part("rung-4", b(360, 0, 0, 45, 500, 45).color(color));
p.part("rung-5", b(600, 0, 0, 45, 500, 45).color(color));

return p.model();
