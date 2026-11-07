// SPDX-License-Identifier: CC0-1.0
// Field magnifier: Hand lens with a circular frame, short stem and oval grip. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, stainless steel, glass.

meta({
  name: "field-loupe",
  license: 'CC0-1.0',
  title: "Field magnifier",
  description: "Hand lens with a circular frame, short stem and oval grip. Material controls: molded polymer, stainless steel, glass. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "field magnifier", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const glass = param('glass', '#63949c', { label: 'Glass' });
presets({
  fieldReady: { polymer: '#e6e9df', stainlessSteel: '#c7cdcf', glass: '#94bdc3' },
  weathered: { polymer: '#8d9890', stainlessSteel: '#7a8588', glass: '#5d7b7f' },
});
const baseZ = 10;
const p = assembly("field-loupe");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("lens-frame", ring(150, 0, 38, 22, 88, 16, 12, "z").color(stainlessSteel));
p.part("lens", cylinder(4, 64, 12).translate(0, 0, -2).translate(150, 0, 28).scale(scale).color(glass));
p.part("stem", b(36, 0, 20, 175, 36, 18, 0, 0, 0).color(stainlessSteel));
p.part("grip", b(-86, 0, 10, 105, 52, 20, 0, 0, 0).color(polymer));

return p.model();
