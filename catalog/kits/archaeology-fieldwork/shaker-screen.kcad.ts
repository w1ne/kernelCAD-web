// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "shaker-screen",
  license: 'CC0-1.0',
  title: "Archaeology shaker screen",
  description: "Large raised wooden frame with crossbars and four short support legs. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "archaeology shaker screen", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a37a4c", { label: 'Asset color' });
const baseZ = -1.109038;
const p = assembly("shaker-screen");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);

p.part("frame-rail-0", b(0, -320, 370, 760, 48, 65, 0, 0, 0));
p.part("frame-rail-1", b(0, 320, 370, 760, 48, 65, 0, 0, 0));
p.part("frame-rail-2", b(-356, 0, 370, 48, 640, 65, 0, 0, 0));
p.part("frame-rail-3", b(356, 0, 370, 48, 640, 65, 0, 0, 0));
p.part("mesh-bar-x-0", hx(0, -240, 402, 690, 6, 6));
p.part("mesh-bar-x-1", hx(0, -160, 402, 690, 6, 6));
p.part("mesh-bar-x-2", hx(0, -80, 402, 690, 6, 6));
p.part("mesh-bar-x-3", hx(0, 0, 402, 690, 6, 6));
p.part("mesh-bar-x-4", hx(0, 80, 402, 690, 6, 6));
p.part("mesh-bar-x-5", hx(0, 160, 402, 690, 6, 6));
p.part("mesh-bar-x-6", hx(0, 240, 402, 690, 6, 6));
p.part("mesh-bar-y-0", hy(-280, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-1", hy(-200, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-2", hy(-120, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-3", hy(-40, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-4", hy(40, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-5", hy(120, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-6", hy(200, 0, 402, 580, 6, 6));
p.part("mesh-bar-y-7", hy(280, 0, 402, 580, 6, 6));
p.part("leg-0", b(-300, -260, 0, 38, 38, 375, -10, -9, 0));
p.part("leg-1", b(300, -260, 0, 38, 38, 375, -10, 9, 0));
p.part("leg-2", b(-300, 260, 0, 38, 38, 375, 10, -9, 0));
p.part("leg-3", b(300, 260, 0, 38, 38, 375, 10, 9, 0));

return p.model();
