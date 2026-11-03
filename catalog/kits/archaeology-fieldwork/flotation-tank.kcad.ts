// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "flotation-tank",
  license: 'CC0-1.0',
  title: "Soil flotation tank",
  description: "Open rectangular sample tank on a braced stand with a hose outlet and top rim. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "soil flotation tank", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#72918e", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("flotation-tank");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("tank-body", b(0, 0, 110, 520, 420, 480, 0, 0, 0));
p.part("tank-rim-0", b(0, -210, 575, 560, 28, 42, 0, 0, 0));
p.part("tank-rim-1", b(0, 210, 575, 560, 28, 42, 0, 0, 0));
p.part("tank-rim-2", b(-266, 0, 575, 28, 392, 42, 0, 0, 0));
p.part("tank-rim-3", b(266, 0, 575, 28, 392, 42, 0, 0, 0));
p.part("stand-leg-0", b(-220, -170, 0, 38, 38, 160, 0, 0, 0));
p.part("stand-leg-1", b(220, -170, 0, 38, 38, 160, 0, 0, 0));
p.part("stand-leg-2", b(-220, 170, 0, 38, 38, 160, 0, 0, 0));
p.part("stand-leg-3", b(220, 170, 0, 38, 38, 160, 0, 0, 0));
p.part("outlet", hx(290, 0, 270, 170, 28, 8));
p.part("outlet-valve", c(370, 0, 246, 48, 34, 8));

return p.model();
