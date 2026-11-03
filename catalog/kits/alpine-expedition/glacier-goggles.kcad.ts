// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "glacier-goggles",
  license: 'CC0-1.0',
  title: "Glacier goggles",
  description: "Wraparound glacier eyewear with a wide shield frame, nose bridge and adjustable head strap. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "glacier goggles", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4c6572", { label: 'Asset color' });
const baseZ = -126;
const p = assembly("glacier-goggles");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("left-lens-frame", ring(-135, 0, 0, 48, 126, 30, 14, "y"));
p.part("right-lens-frame", ring(135, 0, 0, 48, 126, 30, 14, "y"));
p.part("nose-bridge", b(0, 0, 0, 60, 92, 34, 0, 0, 0));
p.part("head-strap", hx(0, 105, 0, 690, 22, 8));
p.part("side-temple-0", b(-245, 55, 0, 155, 42, 30, 0, 0, 0));
p.part("side-temple-1", b(245, 55, 0, 155, 42, 30, 0, 0, 0));

return p.model();
