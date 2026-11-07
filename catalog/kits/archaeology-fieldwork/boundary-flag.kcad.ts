// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "boundary-flag",
  license: 'CC0-1.0',
  title: "Survey boundary flag",
  description: "Bright survey marker flag mounted on a narrow ground stake. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "survey boundary flag", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d65b38", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("boundary-flag");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("flag-stake", c(0, 0, 0, 650, 14, 8));
p.part("flag-cloth", b(68, 0, 520, 136, 18, 115, 0, 0, -12));
p.part("ground-ferrule", c(0, 0, 0, 75, 24, 8));

return p.model();
