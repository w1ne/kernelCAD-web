// SPDX-License-Identifier: CC0-1.0
// Field tape measure: Compact tape case with a winding hub, lock button and short measuring blade. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, stainless steel, rubber.

meta({
  name: "tape-measure",
  license: 'CC0-1.0',
  title: "Field tape measure",
  description: "Compact tape case with a winding hub, lock button and short measuring blade. Material controls: molded polymer, stainless steel, rubber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "field tape measure", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#343a3b', { label: 'Rubber' });
presets({
  fieldReady: { polymer: '#e6e9df', stainlessSteel: '#c7cdcf', rubber: '#454c4d' },
  weathered: { polymer: '#8d9890', stainlessSteel: '#7a8588', rubber: '#292f30' },
});
const baseZ = 0;
const p = assembly("tape-measure");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("case", b(0, 0, 0, 180, 90, 165, 0, 0, 0).color(polymer));
p.part("side-hub", c(0, -51, 78, 24, 44, 10).color(rubber));
p.part("lock-button", b(0, -42, 166, 50, 35, 24, 0, 0, 0).color(rubber));
p.part("tape-blade", b(140, 0, 60, 165, 18, 12, 0, 0, 0).color(stainlessSteel));
p.part("hook", b(221, 0, 45, 24, 44, 38, 0, 0, 0).color(stainlessSteel));

return p.model();
