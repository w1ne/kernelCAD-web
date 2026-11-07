// SPDX-License-Identifier: CC0-1.0
// Finds wash tray: Shallow rectangular washing tray with a raised perimeter and one drain opening. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, stainless steel.

meta({
  name: "sample-wash-tray",
  license: 'CC0-1.0',
  title: "Finds wash tray",
  description: "Shallow rectangular washing tray with a raised perimeter and one drain opening. Material controls: molded polymer, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "finds wash tray", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
presets({
  fieldReady: { polymer: '#e6e9df', stainlessSteel: '#c7cdcf' },
  weathered: { polymer: '#8d9890', stainlessSteel: '#7a8588' },
});
const baseZ = -13;
const p = assembly("sample-wash-tray");
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

p.part("tray-floor", b(0, 0, 0, 420, 300, 24, 0, 0, 0).color(polymer));
p.part("tray-wall-0", b(0, -145, 20, 420, 18, 70, 0, 0, 0).color(polymer));
p.part("tray-wall-1", b(0, 145, 20, 420, 18, 70, 0, 0, 0).color(polymer));
p.part("tray-wall-2", b(-201, 0, 20, 18, 290, 70, 0, 0, 0).color(polymer));
p.part("tray-wall-3", b(201, 0, 20, 18, 290, 70, 0, 0, 0).color(polymer));
p.part("drain", ring(172, 110, 0, 26, 20, 7, 8, "z").color(stainlessSteel));

return p.model();
