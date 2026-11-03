// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-scoop",
  license: 'CC0-1.0',
  title: "Soil sample scoop",
  description: "Long-handled sampling scoop with a shallow bowl and raised rim. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "soil sample scoop", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a4a297", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("sample-scoop");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("shaft", c(0, 0, 0, 360, 20, 8));
p.part("cross-grip", hx(0, 0, 340, 130, 21, 8));
p.part("bowl", b(0, 0, 365, 125, 175, 32, 0, 0, 0));
p.part("left-rim", b(-61, 0, 388, 14, 160, 42, 0, 0, 0));
p.part("right-rim", b(61, 0, 388, 14, 160, 42, 0, 0, 0));
p.part("neck", c(0, 0, 348, 55, 29, 8));

return p.model();
