// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "folding-rule",
  license: 'CC0-1.0',
  title: "Folding measuring rule",
  description: "Three linked flat rule sections with hinge blocks at their joints. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "folding measuring rule", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#e2c85c", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("folding-rule");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("rule-left", b(-180, 0, 0, 360, 30, 22, 0, 0, -12));
p.part("rule-center", b(180, 38, 0, 360, 30, 22, 0, 0, 0));
p.part("rule-right", b(540, 0, 0, 360, 30, 22, 0, 0, 12));
p.part("hinge-0", c(0, 0, 10, 42, 18, 8));
p.part("hinge-1", c(360, 38, 10, 42, 18, 8));

return p.model();
