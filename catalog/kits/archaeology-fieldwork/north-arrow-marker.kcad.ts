// SPDX-License-Identifier: CC0-1.0
// North arrow marker: Portable four-point orientation marker on a low circular base. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, stainless steel, painted steel.

meta({
  name: "north-arrow-marker",
  license: 'CC0-1.0',
  title: "North arrow marker",
  description: "Portable four-point orientation marker on a low circular base. Material controls: molded polymer, stainless steel, painted steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "north arrow marker", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#607b83', { label: 'Painted steel' });
presets({
  fieldReady: { polymer: '#e6e9df', stainlessSteel: '#c7cdcf', paintedSteel: '#e5a536' },
  weathered: { polymer: '#8d9890', stainlessSteel: '#7a8588', paintedSteel: '#56686c' },
});
const baseZ = 0;
const p = assembly("north-arrow-marker");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("base", c(0, 0, 0, 26, 112, 10).color(polymer));
p.part("pivot", c(0, 0, 26, 72, 25, 8).color(stainlessSteel));
p.part("north-point", b(0, 64, 74, 28, 128, 18, 0, 0, 0).color(paintedSteel));
p.part("south-point", b(0, -64, 74, 28, 128, 18, 0, 0, 0).color(paintedSteel));
p.part("east-point", b(64, 0, 74, 128, 28, 18, 0, 0, 0).color(paintedSteel));
p.part("west-point", b(-64, 0, 74, 128, 28, 18, 0, 0, 0).color(paintedSteel));

return p.model();
