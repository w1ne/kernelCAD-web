// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "trenching-spade",
  license: 'CC0-1.0',
  title: "Trenching spade",
  description: "Long narrow trenching blade with a straight socket and extended handle. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "trenching spade", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8e9a90", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("trenching-spade");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("narrow-blade", b(0, 0, 0, 140, 66, 430, 0, 0, 0));
p.part("blade-rib", b(0, -36, 60, 22, 25, 300, 0, 0, 0));
p.part("shaft", c(0, 0, 405, 830, 22, 8));
p.part("grip", hx(0, 0, 1200, 160, 24, 8));

return p.model();
