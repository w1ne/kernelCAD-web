// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "total-station",
  license: 'CC0-1.0',
  title: "Survey total station",
  description: "Tripod-mounted survey instrument with a compact body, telescope barrel and adjustment knobs. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "survey total station", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b77b3d", { label: 'Asset color' });
const baseZ = 4.787052;
const p = assembly("total-station");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("tripod-leg-0", b(-210, -170, 0, 42, 42, 600, -12, 18, 0));
p.part("tripod-leg-1", b(210, -170, 0, 42, 42, 600, -12, -18, 0));
p.part("tripod-leg-2", b(0, 220, 0, 42, 42, 600, 15, 0, 0));
p.part("head-column", c(0, 0, 560, 120, 42, 8));
p.part("instrument-body", b(0, 0, 680, 260, 190, 190, 0, 0, 0));
p.part("telescope", hx(0, -115, 745, 260, 36, 10));
p.part("adjustment-knob-0", c(-155, 0, 685, 42, 24, 8));
p.part("adjustment-knob-1", c(155, 0, 685, 42, 24, 8));

return p.model();
