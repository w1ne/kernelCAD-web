// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "detail-scoop",
  license: 'CC0-1.0',
  title: "Soil detail scoop",
  description: "Small flat soil scoop with raised side cheeks and a short grip. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "soil detail scoop", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#969b91", { label: 'Asset color' });
const baseZ = -6;
const p = assembly("detail-scoop");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("handle", hx(-145, 0, 22, 180, 20, 8));
p.part("neck", hx(-43, 0, 22, 72, 28, 8));
p.part("scoop-pan", b(92, 0, 3, 190, 170, 18, 0, 0, 0));
p.part("left-cheek", b(92, -78, 15, 190, 14, 42, 0, 0, 0));
p.part("right-cheek", b(92, 78, 15, 190, 14, 42, 0, 0, 0));

return p.model();
