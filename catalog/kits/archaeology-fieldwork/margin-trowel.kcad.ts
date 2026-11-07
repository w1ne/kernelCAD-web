// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "margin-trowel",
  license: 'CC0-1.0',
  title: "Margin trowel",
  description: "Narrow rectangular masonry-style blade on a short grip for fine excavation work. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "margin trowel", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89918c", { label: 'Asset color' });
const baseZ = -3;
const p = assembly("margin-trowel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("handle", hx(-170, 0, 24, 170, 27, 8));
p.part("neck", hx(-62, 0, 24, 80, 24, 8));
p.part("narrow-blade", b(70, 0, 3, 230, 88, 18, 0, 0, 0));
p.part("shoulder", b(-8, 0, 3, 78, 126, 24, 0, 0, 0));

return p.model();
