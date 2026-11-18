// SPDX-License-Identifier: CC0-1.0
// Survey boundary flag: Bright survey marker flag mounted on a narrow ground stake. Low-poly field visualization geometry in millimetres, Z-up; visible zones use stainless steel, flag fabric.

meta({
  name: "boundary-flag",
  license: 'CC0-1.0',
  title: "Survey boundary flag",
  description: "Bright survey marker flag mounted on a narrow ground stake. Material controls: stainless steel, flag fabric. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "survey boundary flag", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const fabric = param('fabric', '#dc6842', { label: 'Flag fabric' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', fabric: '#f39b35' },
  weathered: { stainlessSteel: '#7a8588', fabric: '#a9573d' },
});
const baseZ = 0;
const p = assembly("boundary-flag");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("flag-stake", c(0, 0, 0, 650, 14, 8).color(stainlessSteel));
p.part("flag-cloth", b(68, 0, 520, 136, 18, 115, 0, 0, -12).color(fabric));
p.part("ground-ferrule", c(0, 0, 0, 75, 24, 8).color(stainlessSteel));

return p.model();
