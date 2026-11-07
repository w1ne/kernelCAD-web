// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-tag-set",
  license: 'CC0-1.0',
  title: "Field sample tags",
  description: "Three punched sample tags with short ties and blank faces. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "field sample tags", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d2bb73", { label: 'Asset color' });
const baseZ = -2;
const p = assembly("sample-tag-set");
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

p.part("tag-0", b(-120, 40, 0, 122, 76, 14, 0, 0, -10));
p.part("tag-1", b(0, 0, 0, 122, 76, 14, 0, 0, 0));
p.part("tag-2", b(120, -40, 0, 122, 76, 14, 0, 0, 10));
p.part("tie-eye-0", ring(-163, 40, 7, 18, 16, 6, 8, "z"));
p.part("tie-eye-1", ring(-43, 0, 7, 18, 16, 6, 8, "z"));
p.part("tie-eye-2", ring(77, -40, 7, 18, 16, 6, 8, "z"));
p.part("tie-0", c(-163, 40, 12, 90, 4, 6));
p.part("tie-1", c(-43, 0, 12, 90, 4, 6));
p.part("tie-2", c(77, -40, 12, 90, 4, 6));

return p.model();
