// SPDX-License-Identifier: CC0-1.0
// Soil profile knife: Narrow profile knife with a guarded handle, straight blade and lanyard eye. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, stainless steel.

meta({
  name: "soil-knife",
  license: 'CC0-1.0',
  title: "Soil profile knife",
  description: "Narrow profile knife with a guarded handle, straight blade and lanyard eye. Material controls: timber, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "soil profile knife", "low poly", "scene prop", "CC0"],
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
const baseZ = 0;
const p = assembly("soil-knife");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("handle", b(0, 0, 0, 64, 72, 190, 0, 0, 0).color(timber));
p.part("lanyard-eye", ring(0, 0, 176, 26, 34, 10, 8, "z").color(stainlessSteel));
p.part("blade", b(0, 0, 190, 22, 54, 280, 0, 0, 0).color(stainlessSteel));
p.part("blade-point", b(0, 0, 460, 16, 48, 58, 0, 0, 8).color(stainlessSteel));

return p.model();
