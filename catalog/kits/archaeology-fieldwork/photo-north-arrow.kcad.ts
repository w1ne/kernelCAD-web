// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "photo-north-arrow",
  license: 'CC0-1.0',
  title: "Photo north arrow",
  description: "Compact direction arrow and base used to orient an excavation photograph. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "photo north arrow", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d29a42", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("photo-north-arrow");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("base", b(0, 0, 0, 170, 120, 18, 0, 0, 0));
p.part("arrow-shaft", b(0, 0, 20, 26, 110, 18, 0, 0, 0));
p.part("arrowhead", b(0, 52, 28, 78, 48, 18, 0, 0, 0));
p.part("tail", b(0, -48, 26, 52, 35, 16, 0, 0, 0));

return p.model();
