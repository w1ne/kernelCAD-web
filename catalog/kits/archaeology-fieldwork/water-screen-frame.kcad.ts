// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "water-screen-frame",
  license: 'CC0-1.0',
  title: "Water screening frame",
  description: "Raised rectangular wash screen with corner legs, side rails and drainage basin. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "water screening frame", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#718d8c", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("water-screen-frame");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("frame-rail-0", b(0, -280, 460, 700, 45, 55, 0, 0, 0));
p.part("frame-rail-1", b(0, 280, 460, 700, 45, 55, 0, 0, 0));
p.part("frame-rail-2", b(-328, 0, 460, 45, 520, 55, 0, 0, 0));
p.part("frame-rail-3", b(328, 0, 460, 45, 520, 55, 0, 0, 0));
p.part("leg-0", b(-300, -250, 0, 44, 44, 475, 0, 0, 0));
p.part("leg-1", b(300, -250, 0, 44, 44, 475, 0, 0, 0));
p.part("leg-2", b(-300, 250, 0, 44, 44, 475, 0, 0, 0));
p.part("leg-3", b(300, 250, 0, 44, 44, 475, 0, 0, 0));
p.part("drain-tray", b(0, 0, 330, 600, 440, 28, 0, 0, 0));
p.part("mesh-bar-0", hx(0, -180, 490, 610, 5, 6));
p.part("mesh-bar-1", hx(0, -120, 490, 610, 5, 6));
p.part("mesh-bar-2", hx(0, -60, 490, 610, 5, 6));
p.part("mesh-bar-3", hx(0, 0, 490, 610, 5, 6));
p.part("mesh-bar-4", hx(0, 60, 490, 610, 5, 6));
p.part("mesh-bar-5", hx(0, 120, 490, 610, 5, 6));
p.part("mesh-bar-6", hx(0, 180, 490, 610, 5, 6));

return p.model();
