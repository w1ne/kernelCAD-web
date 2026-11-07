// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rescue-pulley",
  license: 'CC0-1.0',
  title: "Alpine rescue pulley",
  description: "Compact rescue pulley with a side plate, large sheave, axle pin and rope attachment eye. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "alpine rescue pulley", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c45938", { label: 'Asset color' });
const baseZ = -60;
const p = assembly("rescue-pulley");
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

p.part("sheave", ring(0, 0, 85, 48, 145, 28, 14, "y"));
p.part("side-plate-front", b(0, -55, 55, 295, 34, 205, 0, 0, 0));
p.part("side-plate-rear", b(0, 55, 55, 295, 34, 205, 0, 0, 0));
p.part("axle-pin", c(0, -80, 58, 70, 42, 10));
p.part("attachment-eye-top", ring(0, 0, 235, 32, 62, 18, 10, "y"));
p.part("attachment-eye-bottom", ring(0, 0, 0, 28, 56, 16, 10, "y"));

return p.model();
