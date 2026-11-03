// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "satellite-messenger",
  license: 'CC0-1.0',
  title: "Satellite messenger",
  description: "Compact satellite messenger with a textured face, status screen, call button and lanyard loop. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "satellite messenger", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#e0b23a", { label: 'Asset color' });
const baseZ = -58;
const p = assembly("satellite-messenger");
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

p.part("messenger-body", b(0, 0, 0, 150, 250, 48, 0, 0, 0));
p.part("status-window", b(0, -129, 19, 96, 20, 84, 0, 0, 0));
p.part("check-in-button", c(-42, -151, 15, 24, 19, 8));
p.part("sos-button", c(42, -151, 15, 24, 19, 8));
p.part("lanyard-eye", ring(0, 0, 0, 30, 58, 18, 10, "y"));
p.part("antenna-panel", b(0, 116, 25, 100, 18, 38, 0, 0, 0));

return p.model();
