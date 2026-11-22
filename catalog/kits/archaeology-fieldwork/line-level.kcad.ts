// SPDX-License-Identifier: CC0-1.0
// String line level: Small tubular level with a raised center vial and hanging end hooks. Low-poly field visualization geometry in millimetres, Z-up; visible zones use aluminum, glass, stainless steel.

meta({
  name: "line-level",
  license: 'CC0-1.0',
  title: "String line level",
  description: "Small tubular level with a raised center vial and hanging end hooks. Material controls: aluminum, glass, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "string line level", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminum = param('aluminum', '#9eafb7', { label: 'Aluminum' });
const glass = param('glass', '#63949c', { label: 'Glass' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
presets({
  fieldReady: { aluminum: '#c3ccd0', glass: '#94bdc3', stainlessSteel: '#c7cdcf' },
  weathered: { aluminum: '#788990', glass: '#5d7b7f', stainlessSteel: '#7a8588' },
});
const baseZ = -28;
const p = assembly("line-level");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("level-body", hx(0, 0, 0, 190, 20, 10).color(aluminum));
p.part("vial-window", b(0, 0, 24, 66, 24, 16, 0, 0, 0).color(glass));
p.part("end-hook-0", ring(-85, 0, -3, 28, 25, 7, 8, "y").color(stainlessSteel));
p.part("end-hook-1", ring(85, 0, -3, 28, 25, 7, 8, "y").color(stainlessSteel));

return p.model();
