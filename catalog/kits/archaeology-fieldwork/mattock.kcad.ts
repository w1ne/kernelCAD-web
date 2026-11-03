// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mattock",
  license: 'CC0-1.0',
  title: "Excavation mattock",
  description: "Broad adze mattock head on a long field handle. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "excavation mattock", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#85867d", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("mattock");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("handle", c(0, 0, 0, 760, 26, 8));
p.part("head", hx(0, 0, 755, 390, 32, 8));
p.part("adze-blade", b(-208, 0, 700, 120, 180, 38, 0, 0, 0));
p.part("pick-tip", b(198, 0, 715, 94, 42, 44, 0, 0, 14));

return p.model();
