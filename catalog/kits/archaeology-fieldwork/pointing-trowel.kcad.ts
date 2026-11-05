// SPDX-License-Identifier: CC0-1.0
// Pointing trowel: Triangular pointed hand trowel with a rounded grip and narrow tang. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, stainless steel.

meta({
  name: "pointing-trowel",
  license: 'CC0-1.0',
  title: "Pointing trowel",
  description: "Triangular pointed hand trowel with a rounded grip and narrow tang. Material controls: timber, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "pointing trowel", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
presets({
  fieldReady: { timber: '#a27850', stainlessSteel: '#c7cdcf' },
  weathered: { timber: '#705a45', stainlessSteel: '#7a8588' },
});
const baseZ = -6;
const p = assembly("pointing-trowel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("handle", hx(-155, 0, 24, 155, 28, 8).color(timber));
p.part("grip-cap", hx(-236, 0, 24, 34, 30, 8).color(timber));
p.part("tang", hx(-54, 0, 24, 96, 18, 8).color(stainlessSteel));
p.part("blade", b(74, 0, 3, 172, 125, 18, 0, 0, 0).color(stainlessSteel));
p.part("point", b(174, 0, 3, 78, 58, 16, 0, 0, 0).color(stainlessSteel));

return p.model();
