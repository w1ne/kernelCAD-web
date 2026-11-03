// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "expedition-power-bank",
  license: 'CC0-1.0',
  title: "Expedition power bank",
  description: "Weather-resistant battery bank with a raised port panel, corner guards and tether eye. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "expedition power bank", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4f6470", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("expedition-power-bank");
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

p.part("battery-case", b(0, 0, 0, 360, 210, 100, 0, 0, 0));
p.part("port-panel", b(0, -112, 32, 240, 18, 48, 0, 0, 0));
p.part("port-0", c(-75, -132, 45, 20, 15, 8));
p.part("port-1", c(0, -132, 45, 20, 15, 8));
p.part("port-2", c(75, -132, 45, 20, 15, 8));
p.part("corner-guard-0", b(-152, -80, 10, 55, 48, 120, 0, 0, 0));
p.part("corner-guard-1", b(152, -80, 10, 55, 48, 120, 0, 0, 0));
p.part("corner-guard-2", b(-152, 80, 10, 55, 48, 120, 0, 0, 0));
p.part("corner-guard-3", b(152, 80, 10, 55, 48, 120, 0, 0, 0));
p.part("tether-eye", ring(0, 115, 50, 24, 46, 14, 8, "z"));

return p.model();
