// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-wash-tray",
  license: 'CC0-1.0',
  title: "Finds wash tray",
  description: "Shallow rectangular washing tray with a raised perimeter and one drain opening. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "finds wash tray", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7f9992", { label: 'Asset color' });
const baseZ = -13;
const p = assembly("sample-wash-tray");
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

p.part("tray-floor", b(0, 0, 0, 420, 300, 24, 0, 0, 0));
p.part("tray-wall-0", b(0, -145, 20, 420, 18, 70, 0, 0, 0));
p.part("tray-wall-1", b(0, 145, 20, 420, 18, 70, 0, 0, 0));
p.part("tray-wall-2", b(-201, 0, 20, 18, 290, 70, 0, 0, 0));
p.part("tray-wall-3", b(201, 0, 20, 18, 290, 70, 0, 0, 0));
p.part("drain", ring(172, 110, 0, 26, 20, 7, 8, "z"));

return p.model();
