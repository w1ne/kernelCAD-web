// SPDX-License-Identifier: CC0-1.0
// Soil core sampler: Hollow field corer with a reinforced mouth, top grip and removable cap. Low-poly field visualization geometry in millimetres, Z-up; visible zones use stainless steel, rubber, painted steel.

meta({
  name: "soil-core-sampler",
  license: 'CC0-1.0',
  title: "Soil core sampler",
  description: "Hollow field corer with a reinforced mouth, top grip and removable cap. Material controls: stainless steel, rubber, painted steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "soil core sampler", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#343a3b', { label: 'Rubber' });
const paintedSteel = param('paintedSteel', '#607b83', { label: 'Painted steel' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', rubber: '#454c4d', paintedSteel: '#e5a536' },
  weathered: { stainlessSteel: '#7a8588', rubber: '#292f30', paintedSteel: '#56686c' },
});
const baseZ = -230;
const p = assembly("soil-core-sampler");
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

p.part("sample-tube", ring(0, 0, 0, 460, 50, 13, 10, "z").color(stainlessSteel));
p.part("mouth-rim", ring(0, 0, 440, 28, 58, 12, 10, "z").color(stainlessSteel));
p.part("handle-crossbar", b(0, 0, 470, 190, 28, 28, 0, 0, 0).color(stainlessSteel));
p.part("top-cap", c(0, 0, 455, 35, 54, 10).color(rubber));
p.part("depth-window", b(0, -27, 145, 18, 5, 155, 0, 0, 0).color(paintedSteel));

return p.model();
