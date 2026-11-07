// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "soil-core-sampler",
  license: 'CC0-1.0',
  title: "Soil core sampler",
  description: "Hollow field corer with a reinforced mouth, top grip and removable cap. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "soil core sampler", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89928d", { label: 'Asset color' });
const baseZ = -230;
const p = assembly("soil-core-sampler");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("sample-tube", ring(0, 0, 0, 460, 50, 13, 10, "z"));
p.part("mouth-rim", ring(0, 0, 440, 28, 58, 12, 10, "z"));
p.part("handle-crossbar", b(0, 0, 470, 190, 28, 28, 0, 0, 0));
p.part("top-cap", c(0, 0, 455, 35, 54, 10));
p.part("depth-window", b(0, -27, 145, 18, 5, 155, 0, 0, 0));

return p.model();
