// SPDX-License-Identifier: CC0-1.0
// Specimen jar rack: Portable rack with four capped sample jars and a broad carrying base. Low-poly field visualization geometry in millimetres, Z-up; visible zones use aluminum, glass, molded polymer.

meta({
  name: "specimen-jar-rack",
  license: 'CC0-1.0',
  title: "Specimen jar rack",
  description: "Portable rack with four capped sample jars and a broad carrying base. Material controls: aluminum, glass, molded polymer. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "specimen jar rack", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminum = param('aluminum', '#9eafb7', { label: 'Aluminum' });
const glass = param('glass', '#63949c', { label: 'Glass' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
presets({
  fieldReady: { aluminum: '#c3ccd0', glass: '#94bdc3', polymer: '#e6e9df' },
  weathered: { aluminum: '#788990', glass: '#5d7b7f', polymer: '#8d9890' },
});
const baseZ = 0;
const p = assembly("specimen-jar-rack");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("rack-base", b(0, 0, 0, 380, 180, 28, 0, 0, 0).color(polymer));
p.part("jar-0", c(-132, -45, 28, 180, 36, 8).color(glass));
p.part("jar-1", c(-44, -45, 28, 180, 36, 8).color(glass));
p.part("jar-2", c(44, -45, 28, 180, 36, 8).color(glass));
p.part("jar-3", c(132, -45, 28, 180, 36, 8).color(glass));
p.part("jar-cap-0", c(-132, -45, 200, 34, 41, 8).color(glass));
p.part("jar-cap-1", c(-44, -45, 200, 34, 41, 8).color(glass));
p.part("jar-cap-2", c(44, -45, 200, 34, 41, 8).color(glass));
p.part("jar-cap-3", c(132, -45, 200, 34, 41, 8).color(glass));
p.part("rack-rail-0", b(0, -80, 110, 390, 18, 22, 0, 0, 0).color(aluminum));
p.part("rack-rail-1", b(0, -5, 110, 390, 18, 22, 0, 0, 0).color(aluminum));

return p.model();
