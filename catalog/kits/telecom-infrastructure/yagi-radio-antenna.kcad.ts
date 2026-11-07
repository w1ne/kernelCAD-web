// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "yagi-radio-antenna",
  license: 'CC0-1.0',
  title: "Yagi radio antenna",
  description: "Directional Yagi antenna with a boom, reflector and four short director elements. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b8483", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("yagi-radio-antenna");
p.part("boom", b(0, 0, 250, 1050, 42, 42).color(color));
p.part("reflector", b(-440, 0, 50, 35, 42, 420).color(color));
p.part("driven", b(-150, 0, 0, 35, 42, 360).color(color));
p.part("director-a", b(160, 0, 70, 30, 38, 250).color(color));
p.part("director-b", b(390, 0, 110, 30, 38, 180).color(color));
p.part("mast-clamp", c(0, 0, 170, 85, 68, 8).color(color));

return p.model();
