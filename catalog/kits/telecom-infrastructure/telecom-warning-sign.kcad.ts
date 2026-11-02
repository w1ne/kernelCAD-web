// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "telecom-warning-sign",
  license: 'CC0-1.0',
  title: "Telecom warning sign",
  description: "Site warning placard on two short posts with a broad rectangular sign panel. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d6a848", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("telecom-warning-sign");
p.part("panel", b(0, 0, 930, 800, 45, 600).color(color));
p.part("post--300", b(-300, 0, 10, 55, 55, 900).color(color));
p.part("post-300", b(300, 0, 10, 55, 55, 900).color(color));
p.part("foot-left", b(-300, 0, 0, 180, 180, 40).color(color));
p.part("foot-right", b(300, 0, 0, 180, 180, 40).color(color));

return p.model();
