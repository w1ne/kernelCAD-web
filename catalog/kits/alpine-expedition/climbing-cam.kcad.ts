// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "climbing-cam",
  license: 'CC0-1.0',
  title: "Spring-loaded climbing cam",
  description: "Four-lobe protection device with a center axle, trigger bar, stem and attachment sling. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "spring-loaded climbing cam", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b35c39", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("climbing-cam");
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

p.part("cam-lobe-0", c(-110, 0, 0, 42, 86, 10));
p.part("cam-lobe-1", c(-36, 0, 0, 42, 86, 10));
p.part("cam-lobe-2", c(36, 0, 0, 42, 86, 10));
p.part("cam-lobe-3", c(110, 0, 0, 42, 86, 10));
p.part("axle", hx(0, 0, 26, 310, 24, 10));
p.part("stem", b(0, 0, 20, 48, 48, 340, 0, -8, 0));
p.part("trigger-bar", hx(0, -82, 170, 220, 18, 8));
p.part("attachment-loop", ring(0, 0, 390, 38, 62, 20, 10, "y"));

return p.model();
