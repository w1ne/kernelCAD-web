// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "specimen-jar-rack",
  license: 'CC0-1.0',
  title: "Specimen jar rack",
  description: "Portable rack with four capped sample jars and a broad carrying base. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "specimen jar rack", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#78918a", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("specimen-jar-rack");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("rack-base", b(0, 0, 0, 380, 180, 28, 0, 0, 0));
p.part("jar-0", c(-132, -45, 28, 180, 36, 8));
p.part("jar-1", c(-44, -45, 28, 180, 36, 8));
p.part("jar-2", c(44, -45, 28, 180, 36, 8));
p.part("jar-3", c(132, -45, 28, 180, 36, 8));
p.part("jar-cap-0", c(-132, -45, 200, 34, 41, 8));
p.part("jar-cap-1", c(-44, -45, 200, 34, 41, 8));
p.part("jar-cap-2", c(44, -45, 200, 34, 41, 8));
p.part("jar-cap-3", c(132, -45, 200, 34, 41, 8));
p.part("rack-rail-0", b(0, -80, 110, 390, 18, 22, 0, 0, 0));
p.part("rack-rail-1", b(0, -5, 110, 390, 18, 22, 0, 0, 0));

return p.model();
