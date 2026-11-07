// SPDX-License-Identifier: CC0-1.0
// Excavation photo board: Portable board with a raised clamp, short grip and blank recording face. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, paper, stainless steel.

meta({
  name: "photo-board",
  license: 'CC0-1.0',
  title: "Excavation photo board",
  description: "Portable board with a raised clamp, short grip and blank recording face. Material controls: timber, paper, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "excavation photo board", "low poly", "scene prop", "CC0"],
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
presets({
  fieldReady: { timber: '#a27850', paper: '#eee6d1', stainlessSteel: '#c7cdcf' },
  weathered: { timber: '#705a45', paper: '#a99c7e', stainlessSteel: '#7a8588' },
});
const baseZ = -36;
const p = assembly("photo-board");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("board-face", b(0, 0, 0, 330, 250, 24, 0, 0, 0).color(paper));
p.part("top-rail", b(0, -120, 28, 330, 20, 38, 0, 0, 0).color(timber));
p.part("clip", b(0, -130, 50, 86, 30, 18, 0, 0, 0).color(stainlessSteel));
p.part("carry-handle", hx(0, 0, -22, 130, 14, 8).color(timber));

return p.model();
