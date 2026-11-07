// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sorting-pan",
  license: 'CC0-1.0',
  title: "Finds sorting pan",
  description: "Wide shallow sorting pan with rounded polygon-style rim and central divider. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "finds sorting pan", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a28c63", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("sorting-pan");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("pan-base", b(0, 0, 0, 400, 300, 30, 0, 0, 0));
p.part("pan-wall-0", b(0, -140, 25, 400, 20, 62, 0, 0, 0));
p.part("pan-wall-1", b(0, 140, 25, 400, 20, 62, 0, 0, 0));
p.part("pan-wall-2", b(-190, 0, 25, 20, 280, 62, 0, 0, 0));
p.part("pan-wall-3", b(190, 0, 25, 20, 280, 62, 0, 0, 0));
p.part("divider", b(0, 0, 35, 20, 270, 44, 0, 0, 0));

return p.model();
