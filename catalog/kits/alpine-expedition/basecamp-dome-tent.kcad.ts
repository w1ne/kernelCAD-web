// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "basecamp-dome-tent",
  license: 'CC0-1.0',
  title: "Basecamp dome tent",
  description: "Large expedition shelter with a raised floor, paired sloping fly panels, vestibule and crossed poles. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "basecamp dome tent", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a64f37", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("basecamp-dome-tent");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("groundsheet", b(0, 0, 0, 1900, 2300, 50, 0, 0, 0));
p.part("inner-tent", b(0, 0, 50, 1450, 1750, 680, 0, 0, 0));
p.part("left-fly-panel", b(-235, 0, 630, 620, 2240, 38, 0, -38, 0));
p.part("right-fly-panel", b(235, 0, 630, 620, 2240, 38, 0, 38, 0));
p.part("vestibule", b(0, -1260, 80, 1050, 650, 35, 0, -8, 0));
p.part("crossed-pole-left", c(0, 0, 60, 1120, 22, 8));

return p.model();
