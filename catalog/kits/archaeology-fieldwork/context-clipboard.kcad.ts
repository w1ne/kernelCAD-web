// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "context-clipboard",
  license: 'CC0-1.0',
  title: "Excavation context clipboard",
  description: "Field form board with a top clip and pencil loop for recording a soil context. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "excavation context clipboard", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8c7355", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("context-clipboard");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("board", b(0, 0, 0, 300, 390, 20, 0, 0, 0));
p.part("paper", b(0, 0, 22, 265, 340, 8, 0, 0, 0));
p.part("clip", b(0, -174, 32, 88, 38, 22, 0, 0, 0));
p.part("clip-pivot", c(0, -174, 45, 16, 16, 8));
p.part("pencil", hx(118, 0, 31, 180, 8, 6));

return p.model();
