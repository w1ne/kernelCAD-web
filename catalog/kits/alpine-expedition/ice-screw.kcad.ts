// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ice-screw",
  license: 'CC0-1.0',
  title: "Ice screw",
  description: "Tubular ice screw with a threaded body, hanger eye and folding crank handle. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "ice screw", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89918e", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("ice-screw");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("screw-tube", c(0, 0, 0, 240, 34, 10));
p.part("cutting-tip", c(0, 0, 0, 80, 42, 10));
p.part("hanger-eye", ring(0, 0, 300, 34, 67, 20, 10, "y"));
p.part("folding-crank", hx(0, 0, 320, 210, 22, 8));
p.part("thread-rib-0", b(0, 0, 30, 80, 80, 12, 0, 10, 0));
p.part("thread-rib-1", b(0, 0, 55, 80, 80, 12, 0, 10, 0));
p.part("thread-rib-2", b(0, 0, 80, 80, 80, 12, 0, 10, 0));
p.part("thread-rib-3", b(0, 0, 105, 80, 80, 12, 0, 10, 0));
p.part("thread-rib-4", b(0, 0, 130, 80, 80, 12, 0, 10, 0));
p.part("thread-rib-5", b(0, 0, 155, 80, 80, 12, 0, 10, 0));

return p.model();
