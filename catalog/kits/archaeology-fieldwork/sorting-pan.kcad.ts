// SPDX-License-Identifier: CC0-1.0
// Finds sorting pan: Wide shallow sorting pan with rounded polygon-style rim and central divider. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, stainless steel.

meta({
  name: "sorting-pan",
  license: 'CC0-1.0',
  title: "Finds sorting pan",
  description: "Wide shallow sorting pan with rounded polygon-style rim and central divider. Material controls: molded polymer, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "finds sorting pan", "low poly", "scene prop", "CC0"],
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
const baseZ = 0;
const p = assembly("sorting-pan");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};

p.part("pan-base", b(0, 0, 0, 400, 300, 30, 0, 0, 0).color(polymer));
p.part("pan-wall-0", b(0, -140, 25, 400, 20, 62, 0, 0, 0).color(polymer));
p.part("pan-wall-1", b(0, 140, 25, 400, 20, 62, 0, 0, 0).color(polymer));
p.part("pan-wall-2", b(-190, 0, 25, 20, 280, 62, 0, 0, 0).color(polymer));
p.part("pan-wall-3", b(190, 0, 25, 20, 280, 62, 0, 0, 0).color(polymer));
p.part("divider", b(0, 0, 35, 20, 270, 44, 0, 0, 0).color(stainlessSteel));

return p.model();
