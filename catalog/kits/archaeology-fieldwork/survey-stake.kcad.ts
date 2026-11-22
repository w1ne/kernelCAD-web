// SPDX-License-Identifier: CC0-1.0
// Survey stake: Short pointed field stake with a broad head for marking a measured position. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, painted steel.

meta({
  name: "survey-stake",
  license: 'CC0-1.0',
  title: "Survey stake",
  description: "Short pointed field stake with a broad head for marking a measured position. Material controls: timber, painted steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "survey stake", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const paintedSteel = param('paintedSteel', '#607b83', { label: 'Painted steel' });
presets({
  fieldReady: { timber: '#a27850', paintedSteel: '#e5a536' },
  weathered: { timber: '#705a45', paintedSteel: '#56686c' },
});
const baseZ = 0;
const p = assembly("survey-stake");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("stake-shaft", c(0, 0, 0, 360, 22, 8).color(timber));
p.part("stake-head", c(0, 0, 330, 55, 38, 8).color(paintedSteel));
p.part("head-tab", b(0, 0, 365, 125, 32, 30, 0, 0, 0).color(paintedSteel));

return p.model();
