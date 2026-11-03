// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "artifact-bag",
  license: 'CC0-1.0',
  title: "Finds collection bag",
  description: "Small field bag with a folded opening, side gussets and a blank label patch. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "finds collection bag", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a78b68", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("artifact-bag");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("bag-body", b(0, 0, 0, 190, 65, 225, 0, 0, 0));
p.part("folded-mouth", b(0, 0, 225, 205, 80, 24, 0, 0, 0));
p.part("label-patch", b(0, -35, 115, 105, 8, 58, 0, 0, 0));
p.part("left-gusset", b(-92, 0, 12, 18, 62, 160, 0, 0, 0));
p.part("right-gusset", b(92, 0, 12, 18, 62, 160, 0, 0, 0));

return p.model();
