// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "soft-finds-brush",
  license: 'CC0-1.0',
  title: "Soft finds brush",
  description: "Wide soft-bristle brush with a short wooden handle and flared brush head. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "soft finds brush", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b58048", { label: 'Asset color' });
const baseZ = 2;
const p = assembly("soft-finds-brush");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("handle", hx(-145, 0, 30, 230, 22, 8));
p.part("neck", hx(-12, 0, 30, 70, 28, 8));
p.part("brush-block", b(62, 0, 5, 132, 174, 24, 0, 0, 0));
p.part("bristle-bundle-0", hx(139, -66, 14, 76, 7, 6));
p.part("bristle-bundle-1", hx(139, -44, 14, 76, 7, 6));
p.part("bristle-bundle-2", hx(139, -22, 14, 76, 7, 6));
p.part("bristle-bundle-3", hx(139, 0, 14, 76, 7, 6));
p.part("bristle-bundle-4", hx(139, 22, 14, 76, 7, 6));
p.part("bristle-bundle-5", hx(139, 44, 14, 76, 7, 6));
p.part("bristle-bundle-6", hx(139, 66, 14, 76, 7, 6));

return p.model();
