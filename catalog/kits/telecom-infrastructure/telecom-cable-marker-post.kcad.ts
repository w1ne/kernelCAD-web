// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "telecom-cable-marker-post",
  license: 'CC0-1.0',
  title: "Telecom cable marker post",
  description: "Narrow marker post with a ribbed cap, tag plate and buried-end indicator band. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#cb9e38", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("telecom-cable-marker-post");
p.part("post", b(0, 0, 280, 80, 80, 600).color(color));
p.part("cap", b(0, 0, 610, 120, 120, 60).color(color));
p.part("tag", b(0, -50, 390, 110, 22, 120).color(color));
p.part("band", b(0, 0, 120, 100, 100, 35).color(color));
p.part("foot", b(0, 0, 0, 190, 190, 40).color(color));

return p.model();
