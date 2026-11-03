// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sediment-bucket",
  license: 'CC0-1.0',
  title: "Sediment bucket",
  description: "Open field bucket with a reinforced rim, flat base and swing handle. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "sediment bucket", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#799187", { label: 'Asset color' });
const baseZ = -15;
const p = assembly("sediment-bucket");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("bucket-body", c(0, 0, 0, 340, 190, 12));
p.part("bucket-rim", ring(0, 0, 325, 32, 205, 16, 12, "z"));
p.part("base-band", ring(0, 0, 0, 30, 194, 14, 12, "z"));
p.part("handle-left", ring(-185, 0, 335, 22, 28, 8, 8, "y"));
p.part("handle-right", ring(185, 0, 335, 22, 28, 8, 8, "y"));
p.part("handle-grip", hx(0, 0, 490, 390, 13, 8));

return p.model();
