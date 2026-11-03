// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "square-point-shovel",
  license: 'CC0-1.0',
  title: "Square point shovel",
  description: "Flat-edged transfer shovel with a broad blade, straight shaft and cross-grip. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "square point shovel", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9d9a8f", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("square-point-shovel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("blade", b(0, 0, 0, 330, 72, 360, 0, 0, 0));
p.part("blade-lip", b(0, 0, 330, 355, 105, 50, 0, 0, 0));
p.part("shaft", c(0, 0, 380, 720, 24, 8));
p.part("cross-grip", hx(0, 0, 1100, 180, 25, 8));

return p.model();
