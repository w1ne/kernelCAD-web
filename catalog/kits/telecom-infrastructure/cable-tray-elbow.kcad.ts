// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "cable-tray-elbow",
  license: 'CC0-1.0',
  title: "Cable tray elbow",
  description: "Right-angle cable tray elbow with raised side rails and corner floor panels. Knobs: overall scale and asset color.",
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

const p = assembly("cable-tray-elbow");
p.part("run-a", b(-280, 0, 0, 940, 320, 50).color(color));
p.part("run-b", b(280, 280, 0, 320, 940, 50).color(color));
p.part("rail-a1", b(-280, -165, 50, 940, 35, 100).color(color));
p.part("rail-a2", b(-280, 165, 50, 940, 35, 100).color(color));
p.part("rail-b1", b(115, 280, 50, 35, 940, 100).color(color));
p.part("rail-b2", b(445, 280, 50, 35, 940, 100).color(color));

return p.model();
