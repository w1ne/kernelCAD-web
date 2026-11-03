// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "site-camera",
  license: 'CC0-1.0',
  title: "Field documentation camera",
  description: "Compact field camera with a short lens barrel, raised viewfinder and grip. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "field documentation camera", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#667671", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("site-camera");
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

p.part("camera-body", b(0, 0, 0, 240, 165, 150, 0, 0, 0));
p.part("lens-mount", ring(0, -90, 78, 20, 68, 12, 12, "y"));
p.part("lens", c(0, -128, 77, 72, 48, 10));
p.part("lens-rim", b(0, -164, 76, 110, 22, 18, 0, 0, 0));
p.part("viewfinder", b(-70, 45, 152, 70, 54, 34, 0, 0, 0));
p.part("shutter-button", c(82, -20, 151, 22, 18, 8));
p.part("grip", b(98, 0, 25, 36, 130, 110, 0, 0, 0));

return p.model();
