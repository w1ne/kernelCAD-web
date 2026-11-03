// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "snow-anchor",
  license: 'CC0-1.0',
  title: "Snow deadman anchor",
  description: "Buried deadman anchor plate with a central cable eye and raised orientation rib. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "snow deadman anchor", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#82908b", { label: 'Asset color' });
const baseZ = -26.28717828227756;
const p = assembly("snow-anchor");
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

p.part("anchor-plate", b(0, 0, 0, 380, 230, 32, 0, -8, 0));
p.part("center-rib", b(0, 0, 28, 40, 210, 48, 0, 0, 0));
p.part("cable-eye", ring(0, -150, 60, 28, 66, 18, 10, "y"));
p.part("anchor-cable", hx(0, -160, 60, 280, 13, 8));
p.part("edge-lip-0", b(-175, 0, 22, 30, 230, 34, 0, 0, 0));
p.part("edge-lip-1", b(175, 0, 22, 30, 230, 34, 0, 0, 0));

return p.model();
