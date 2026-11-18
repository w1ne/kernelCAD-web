// SPDX-License-Identifier: CC0-1.0
// Survey compass: Pocket survey compass with a polygon bezel, center pivot and visible direction needle. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, glass, brass.

meta({
  name: "survey-compass",
  license: 'CC0-1.0',
  title: "Survey compass",
  description: "Pocket survey compass with a polygon bezel, center pivot and visible direction needle. Material controls: molded polymer, glass, brass. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "survey compass", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const glass = param('glass', '#63949c', { label: 'Glass' });
const brass = param('brass', '#b18b50', { label: 'Brass' });
presets({
  fieldReady: { polymer: '#e6e9df', glass: '#94bdc3', brass: '#c6a364' },
  weathered: { polymer: '#8d9890', glass: '#5d7b7f', brass: '#846a3e' },
});
const baseZ = 0;
const p = assembly("survey-compass");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("compass-case", c(0, 0, 0, 34, 118, 12).color(polymer));
p.part("bezel", ring(0, 0, 15, 18, 118, 12, 12, "z").color(glass));
p.part("needle-long", b(0, 0, 40, 12, 160, 7, 0, 0, 0).color(brass));
p.part("needle-short", b(0, 0, 42, 84, 12, 7, 0, 0, 90).color(brass));
p.part("pivot", c(0, 0, 43, 12, 16, 8).color(brass));

return p.model();
