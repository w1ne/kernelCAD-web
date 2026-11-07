// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dustpan-and-brush",
  license: 'CC0-1.0',
  title: "Dustpan and brush",
  description: "Field dustpan with a raised lip and a compact cleaning brush resting beside it. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "dustpan and brush", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#78887d", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("dustpan-and-brush");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("pan-base", b(0, -80, 0, 270, 220, 22, 0, 0, 0));
p.part("pan-back", b(0, 26, 14, 270, 20, 135, 0, 0, 0));
p.part("pan-left-wall", b(-126, -75, 20, 18, 195, 62, 0, 0, 0));
p.part("pan-right-wall", b(126, -75, 20, 18, 195, 62, 0, 0, 0));
p.part("pan-handle", b(0, 210, 18, 48, 210, 38, 0, 0, 0));
p.part("brush-handle", b(142, -70, 4, 42, 185, 34, 0, 0, -22));
p.part("brush-head", b(205, -76, 0, 85, 105, 48, 0, 0, 0));

return p.model();
