// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "expedition-solar-panel",
  license: 'CC0-1.0',
  title: "Folding expedition solar panel",
  description: "Portable two-leaf solar charger with a hinge spine, raised kickstand and panel grid. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "folding expedition solar panel", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536d78", { label: 'Asset color' });
const baseZ = -119.67694301725504;
const p = assembly("expedition-solar-panel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("panel-leaf-0", b(-270, 0, 0, 520, 700, 38, 0, 0, 0));
p.part("panel-leaf-1", b(270, 0, 0, 520, 700, 38, 0, 0, 0));
p.part("hinge-spine", b(0, 0, 15, 40, 720, 48, 0, 0, 0));
p.part("cell-row-0", b(0, -275, 40, 1010, 18, 10, 0, 0, 0));
p.part("cell-row-1", b(0, -95, 40, 1010, 18, 10, 0, 0, 0));
p.part("cell-row-2", b(0, 85, 40, 1010, 18, 10, 0, 0, 0));
p.part("cell-row-3", b(0, 265, 40, 1010, 18, 10, 0, 0, 0));
p.part("cell-column-0", b(-390, 0, 40, 18, 660, 10, 0, 0, 0));
p.part("cell-column-1", b(-130, 0, 40, 18, 660, 10, 0, 0, 0));
p.part("cell-column-2", b(130, 0, 40, 18, 660, 10, 0, 0, 0));
p.part("cell-column-3", b(390, 0, 40, 18, 660, 10, 0, 0, 0));
p.part("kickstand", b(0, 280, 0, 830, 40, 350, 0, 18, 0));

return p.model();
