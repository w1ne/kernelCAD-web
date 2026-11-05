// SPDX-License-Identifier: CC0-1.0
// Field documentation camera: Compact field camera with a short lens barrel, raised viewfinder and grip. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, glass, rubber.

meta({
  name: "site-camera",
  license: 'CC0-1.0',
  title: "Field documentation camera",
  description: "Compact field camera with a short lens barrel, raised viewfinder and grip. Material controls: molded polymer, glass, rubber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "field documentation camera", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const glass = param('glass', '#63949c', { label: 'Glass' });
const rubber = param('rubber', '#343a3b', { label: 'Rubber' });
presets({
  fieldReady: { polymer: '#e6e9df', glass: '#94bdc3', rubber: '#454c4d' },
  weathered: { polymer: '#8d9890', glass: '#5d7b7f', rubber: '#292f30' },
});
const baseZ = 0;
const p = assembly("site-camera");
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

p.part("camera-body", b(0, 0, 0, 240, 165, 150, 0, 0, 0).color(polymer));
p.part("lens-mount", ring(0, -90, 78, 20, 68, 12, 12, "y").color(glass));
p.part("lens", c(0, -128, 77, 72, 48, 10).color(glass));
p.part("lens-rim", b(0, -164, 76, 110, 22, 18, 0, 0, 0).color(glass));
p.part("viewfinder", b(-70, 45, 152, 70, 54, 34, 0, 0, 0).color(polymer));
p.part("shutter-button", c(82, -20, 151, 22, 18, 8).color(polymer));
p.part("grip", b(98, 0, 25, 36, 130, 110, 0, 0, 0).color(rubber));

return p.model();
