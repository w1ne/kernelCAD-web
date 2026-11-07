// SPDX-License-Identifier: CC0-1.0
// Wire cleaning brush: Small stiff cleaning brush with a flat back, metal bristles and a hanging eye. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, stainless steel, brass.

meta({
  name: "wire-cleaning-brush",
  license: 'CC0-1.0',
  title: "Wire cleaning brush",
  description: "Small stiff cleaning brush with a flat back, metal bristles and a hanging eye. Material controls: timber, stainless steel, brass. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "wire cleaning brush", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const brass = param('brass', '#b18b50', { label: 'Brass' });
presets({
  fieldReady: { timber: '#a27850', stainlessSteel: '#c7cdcf', brass: '#c6a364' },
  weathered: { timber: '#705a45', stainlessSteel: '#7a8588', brass: '#846a3e' },
});
const baseZ = 0;
const p = assembly("wire-cleaning-brush");
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

p.part("handle", b(0, 0, 0, 180, 48, 48, 0, 0, 0).color(timber));
p.part("hanging-eye", ring(0, 0, 18, 20, 30, 8, 8, "z").color(stainlessSteel));
p.part("brush-block", b(0, 0, 42, 170, 78, 28, 0, 0, 0).color(timber));
p.part("wire-row-0", c(-60, 0, 66, 75, 5, 6).color(brass));
p.part("wire-row-1", c(-36, 0, 66, 75, 5, 6).color(brass));
p.part("wire-row-2", c(-12, 0, 66, 75, 5, 6).color(brass));
p.part("wire-row-3", c(12, 0, 66, 75, 5, 6).color(brass));
p.part("wire-row-4", c(36, 0, 66, 75, 5, 6).color(brass));
p.part("wire-row-5", c(60, 0, 66, 75, 5, 6).color(brass));

return p.model();
