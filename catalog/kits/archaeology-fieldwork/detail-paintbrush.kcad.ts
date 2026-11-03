// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "detail-paintbrush",
  license: 'CC0-1.0',
  title: "Detailing brush",
  description: "Fine pointed cleaning brush with a tapered grip, ferrule and slim bristle bundle. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "detailing brush", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d1a14e", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("detail-paintbrush");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("handle", hx(-125, 0, 22, 230, 17, 8));
p.part("ferrule", hx(14, 0, 22, 52, 22, 8));
p.part("bristles", hx(112, 0, 22, 154, 12, 8));
p.part("bristle-tip", hx(195, 0, 22, 28, 7, 8));
p.part("handle-end", c(-238, 0, 7, 30, 19, 8));

return p.model();
