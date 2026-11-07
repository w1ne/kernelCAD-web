// SPDX-License-Identifier: CC0-1.0
// Field notebook: Hard-cover field notebook with a visible spine, elastic band and page block. Low-poly field visualization geometry in millimetres, Z-up; visible zones use leather, paper, rubber.

meta({
  name: "field-notebook",
  license: 'CC0-1.0',
  title: "Field notebook",
  description: "Hard-cover field notebook with a visible spine, elastic band and page block. Material controls: leather, paper, rubber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "field notebook", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const leather = param('leather', '#805b3c', { label: 'Leather' });
const paper = param('paper', '#d8cba9', { label: 'Paper' });
const rubber = param('rubber', '#343a3b', { label: 'Rubber' });
presets({
  fieldReady: { leather: '#9b7049', paper: '#eee6d1', rubber: '#454c4d' },
  weathered: { leather: '#664932', paper: '#a99c7e', rubber: '#292f30' },
});
const baseZ = -5;
const p = assembly("field-notebook");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};

p.part("page-block", b(0, 0, 0, 240, 320, 38, 0, 0, 0).color(paper));
p.part("front-cover", b(0, -13, 38, 258, 330, 20, 0, 0, 0).color(leather));
p.part("back-cover", b(0, 13, -5, 258, 330, 16, 0, 0, 0).color(leather));
p.part("spine", b(-125, 0, 18, 24, 345, 44, 0, 0, 0).color(leather));
p.part("elastic-band", b(90, 0, 59, 15, 338, 8, 0, 0, 0).color(rubber));

return p.model();
