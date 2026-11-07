// SPDX-License-Identifier: CC0-1.0
// Masonry chisel: Short steel chisel with a protective hand guard and widened striking cap. Low-poly field visualization geometry in millimetres, Z-up; visible zones use stainless steel, rubber.

meta({
  name: "masonry-chisel",
  license: 'CC0-1.0',
  title: "Masonry chisel",
  description: "Short steel chisel with a protective hand guard and widened striking cap. Material controls: stainless steel, rubber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "masonry chisel", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#343a3b', { label: 'Rubber' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', rubber: '#454c4d' },
  weathered: { stainlessSteel: '#7a8588', rubber: '#292f30' },
});
const baseZ = 0;
const p = assembly("masonry-chisel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("blade", c(0, 0, 0, 300, 20, 8).color(stainlessSteel));
p.part("bevel", c(0, 0, 0, 48, 14, 8).color(stainlessSteel));
p.part("hand-guard", b(0, 0, 275, 115, 72, 48, 0, 0, 0).color(rubber));
p.part("striking-cap", c(0, 0, 325, 76, 32, 8).color(stainlessSteel));

return p.model();
