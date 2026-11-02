// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "site-id-placard",
  license: 'CC0-1.0',
  title: "Site identification placard",
  description: "Small site identification plate with a raised frame, two posts and bolted feet. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#63737c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("site-id-placard");
p.part("plate", b(0, 0, 690, 760, 40, 380).color(color));
p.part("inset", b(0, -24, 690, 650, 14, 270).color(color));
p.part("post--280", b(-280, 0, 0, 42, 42, 620).color(color));
p.part("post-280", b(280, 0, 0, 42, 42, 620).color(color));
p.part("bolt--320", c(-320, -30, 780, 18, 15, 8).color(color));
p.part("bolt-320", c(320, -30, 780, 18, 15, 8).color(color));

return p.model();
