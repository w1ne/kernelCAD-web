// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hand-auger",
  license: 'CC0-1.0',
  title: "Hand soil auger",
  description: "Manual soil auger with a T-handle, straight shaft and open helical-look cutting blades. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "hand soil auger", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#858d88", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("hand-auger");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("shaft", c(0, 0, 0, 740, 20, 8));
p.part("t-handle", hx(0, 0, 720, 230, 24, 8));
p.part("cutting-flight-0", b(0, 0, 100, 138, 92, 16, 0, 0, 0));
p.part("cutting-flight-1", b(0, 0, 180, 138, 92, 16, 0, 0, 22));
p.part("cutting-flight-2", b(0, 0, 260, 138, 92, 16, 0, 0, 44));
p.part("cutting-flight-3", b(0, 0, 340, 138, 92, 16, 0, 0, 66));
p.part("cutting-tip", c(0, 0, 0, 120, 28, 8));

return p.model();
