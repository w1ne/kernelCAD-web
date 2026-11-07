// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "excavation-grid",
  license: 'CC0-1.0',
  title: "Excavation grid ropes",
  description: "Four taut survey lines and corner pins mark a square excavation unit. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "excavation grid ropes", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c69b54", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("excavation-grid");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);

p.part("north-grid-line", hx(0, -600, 8, 1200, 8, 6));
p.part("south-grid-line", hx(0, 600, 8, 1200, 8, 6));
p.part("west-grid-line", hy(-600, 0, 8, 1200, 8, 6));
p.part("east-grid-line", hy(600, 0, 8, 1200, 8, 6));
p.part("corner-pin-0", c(-600, -600, 0, 90, 18, 8));
p.part("corner-pin-1", c(600, -600, 0, 90, 18, 8));
p.part("corner-pin-2", c(-600, 600, 0, 90, 18, 8));
p.part("corner-pin-3", c(600, 600, 0, 90, 18, 8));

return p.model();
