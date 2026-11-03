// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "avalanche-shovel",
  license: 'CC0-1.0',
  title: "Avalanche shovel",
  description: "Collapsible avalanche shovel with a deep blade, reinforced socket and T-grip handle. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "avalanche shovel", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d66336", { label: 'Asset color' });
const baseZ = -3.8151764118852896;
const p = assembly("avalanche-shovel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("shovel-blade", b(0, -170, 0, 390, 80, 360, -8, 0, 0));
p.part("blade-side-left", b(-190, -165, 155, 32, 90, 270, 0, 0, 0));
p.part("blade-side-right", b(190, -165, 155, 32, 90, 270, 0, 0, 0));
p.part("shaft", c(0, 0, 315, 660, 24, 8));
p.part("socket", b(0, 0, 275, 94, 80, 110, 0, 0, 0));
p.part("t-grip", hx(0, 0, 1010, 250, 28, 8));

return p.model();
