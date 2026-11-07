// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "locking-carabiner",
  license: 'CC0-1.0',
  title: "Locking carabiner",
  description: "Oval locking carabiner with a thick spine, gate bar and threaded sleeve. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "locking carabiner", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c8588", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("locking-carabiner");
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

p.part("carabiner-frame", ring(0, 0, 150, 48, 150, 38, 14, "y"));
p.part("gate-bar", b(0, -30, 150, 34, 180, 30, 0, 18, 0));
p.part("locking-sleeve", c(0, -25, 245, 90, 42, 10));
p.part("spine-reinforcement", b(-115, 0, 150, 36, 64, 180, 0, 0, 0));

return p.model();
