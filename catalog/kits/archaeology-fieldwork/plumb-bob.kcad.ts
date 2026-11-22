// SPDX-License-Identifier: CC0-1.0
// Plumb bob: Weighted survey bob hanging from a short line and top eye. Low-poly field visualization geometry in millimetres, Z-up; visible zones use stainless steel, brass, survey cord.

meta({
  name: "plumb-bob",
  license: 'CC0-1.0',
  title: "Plumb bob",
  description: "Weighted survey bob hanging from a short line and top eye. Material controls: stainless steel, brass, survey cord. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "plumb bob", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const brass = param('brass', '#b18b50', { label: 'Brass' });
const rope = param('rope', '#c8ad6e', { label: 'Survey cord' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', brass: '#c6a364', rope: '#e5cf8d' },
  weathered: { stainlessSteel: '#7a8588', brass: '#846a3e', rope: '#907746' },
});
const baseZ = -1;
const p = assembly("plumb-bob");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("bob-body", c(0, 0, 0, 160, 48, 10).color(stainlessSteel));
p.part("lower-weight", c(0, 0, -1, 90, 20, 8).color(brass));
p.part("line", c(0, 0, 158, 240, 4, 6).color(rope));
p.part("top-eye", ring(0, 0, 394, 20, 22, 8, 8, "z").color(brass));

return p.model();
