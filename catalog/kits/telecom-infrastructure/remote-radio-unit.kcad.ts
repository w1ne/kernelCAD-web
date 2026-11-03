// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "remote-radio-unit",
  license: 'CC0-1.0',
  title: "Remote radio unit",
  description: "Outdoor radio unit with finned body, upper mounting ears and two lower connectors. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777d7c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("remote-radio-unit");
p.part("body", b(0, 0, 390, 340, 220, 820).color(color));
p.part("top-ear-left", b(-130, 0, 820, 80, 260, 80).color(color));
p.part("top-ear-right", b(130, 0, 820, 80, 260, 80).color(color));
p.part("fin-a", b(-220, 0, 370, 30, 180, 700).color(color));
p.part("fin-b", b(220, 0, 370, 30, 180, 700).color(color));
p.part("connector-a", c(-80, -125, 0, 80, 32, 8).color(color));
p.part("connector-b", c(80, -125, 0, 80, 32, 8).color(color));

return p.model();
