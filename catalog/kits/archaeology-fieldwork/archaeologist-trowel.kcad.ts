// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "archaeologist-trowel",
  license: 'CC0-1.0',
  title: "Archaeologist trowel",
  description: "Short-handled pointed excavation trowel with a broad blade and raised ferrule. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "archaeologist trowel", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#83928a", { label: 'Asset color' });
const baseZ = -10;
const p = assembly("archaeologist-trowel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("handle", hx(-190, 0, 28, 170, 28, 8));
p.part("handle-cap", hx(-275, 0, 28, 28, 30, 8));
p.part("ferrule", hx(-82, 0, 28, 70, 38, 8));
p.part("blade", b(18, 0, 3, 245, 180, 18, 0, 0, 0));
p.part("blade-tip", b(174, 0, 3, 105, 88, 16, 0, 0, 0));

return p.model();
