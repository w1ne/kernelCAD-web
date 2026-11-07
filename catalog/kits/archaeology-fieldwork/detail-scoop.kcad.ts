// SPDX-License-Identifier: CC0-1.0
// Soil detail scoop: Small flat soil scoop with raised side cheeks and a short grip. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, stainless steel.

meta({
  name: "detail-scoop",
  license: 'CC0-1.0',
  title: "Soil detail scoop",
  description: "Small flat soil scoop with raised side cheeks and a short grip. Material controls: timber, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "soil detail scoop", "low poly", "scene prop", "CC0"],
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
const p = assembly("detail-scoop");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("handle", hx(-145, 0, 22, 180, 20, 8).color(timber));
p.part("neck", hx(-43, 0, 22, 72, 28, 8).color(stainlessSteel));
p.part("scoop-pan", b(92, 0, 3, 190, 170, 18, 0, 0, 0).color(stainlessSteel));
p.part("left-cheek", b(92, -78, 15, 190, 14, 42, 0, 0, 0).color(stainlessSteel));
p.part("right-cheek", b(92, 78, 15, 190, 14, 42, 0, 0, 0).color(stainlessSteel));

return p.model();
