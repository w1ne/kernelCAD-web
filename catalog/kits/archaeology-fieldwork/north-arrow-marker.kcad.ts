// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "north-arrow-marker",
  license: 'CC0-1.0',
  title: "North arrow marker",
  description: "Portable four-point orientation marker on a low circular base. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "north arrow marker", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c4a64c", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("north-arrow-marker");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("base", c(0, 0, 0, 26, 112, 10));
p.part("pivot", c(0, 0, 26, 72, 25, 8));
p.part("north-point", b(0, 64, 74, 28, 128, 18, 0, 0, 0));
p.part("south-point", b(0, -64, 74, 28, 128, 18, 0, 0, 0));
p.part("east-point", b(64, 0, 74, 128, 28, 18, 0, 0, 0));
p.part("west-point", b(-64, 0, 74, 128, 28, 18, 0, 0, 0));

return p.model();
