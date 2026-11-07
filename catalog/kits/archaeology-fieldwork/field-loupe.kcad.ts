// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "field-loupe",
  license: 'CC0-1.0',
  title: "Field magnifier",
  description: "Hand lens with a circular frame, short stem and oval grip. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "field magnifier", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9c9f94", { label: 'Asset color' });
const baseZ = 10;
const p = assembly("field-loupe");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("lens-frame", ring(150, 0, 38, 22, 88, 16, 12, "z"));
p.part("stem", b(36, 0, 20, 175, 36, 18, 0, 0, 0));
p.part("grip", b(-86, 0, 10, 105, 52, 20, 0, 0, 0));

return p.model();
