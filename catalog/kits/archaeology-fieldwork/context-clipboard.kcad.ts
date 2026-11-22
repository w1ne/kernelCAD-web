// SPDX-License-Identifier: CC0-1.0
// Excavation context clipboard: Field form board with a top clip and pencil loop for recording a soil context. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, paper, stainless steel, brass.

meta({
  name: "context-clipboard",
  license: 'CC0-1.0',
  title: "Excavation context clipboard",
  description: "Field form board with a top clip and pencil loop for recording a soil context. Material controls: timber, paper, stainless steel, brass. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "excavation context clipboard", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const paper = param('paper', '#d8cba9', { label: 'Paper' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const brass = param('brass', '#b18b50', { label: 'Brass' });
presets({
  fieldReady: { timber: '#a27850', paper: '#eee6d1', stainlessSteel: '#c7cdcf', brass: '#c6a364' },
  weathered: { timber: '#705a45', paper: '#a99c7e', stainlessSteel: '#7a8588', brass: '#846a3e' },
});
const baseZ = 0;
const p = assembly("context-clipboard");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("board", b(0, 0, 0, 300, 390, 20, 0, 0, 0).color(timber));
p.part("paper", b(0, 0, 22, 265, 340, 8, 0, 0, 0).color(paper));
p.part("clip", b(0, -174, 32, 88, 38, 22, 0, 0, 0).color(stainlessSteel));
p.part("clip-pivot", c(0, -174, 45, 16, 16, 8).color(stainlessSteel));
p.part("pencil", hx(118, 0, 31, 180, 8, 6).color(brass));

return p.model();
