// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "finds-tray",
  license: 'CC0-1.0',
  title: "Finds sorting tray",
  description: "Shallow compartmented tray with a raised rim and four open cells. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "finds sorting tray", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9d906c", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("finds-tray");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("tray-floor", b(0, 0, 0, 420, 300, 24, 0, 0, 0));
p.part("rim-0", b(0, -140, 20, 420, 20, 54, 0, 0, 0));
p.part("rim-1", b(0, 140, 20, 420, 20, 54, 0, 0, 0));
p.part("rim-2", b(-200, 0, 20, 20, 280, 54, 0, 0, 0));
p.part("rim-3", b(200, 0, 20, 20, 280, 54, 0, 0, 0));
p.part("center-long", b(0, 0, 28, 18, 265, 26, 0, 0, 0));
p.part("center-cross", b(0, 0, 28, 390, 18, 26, 0, 0, 0));

return p.model();
