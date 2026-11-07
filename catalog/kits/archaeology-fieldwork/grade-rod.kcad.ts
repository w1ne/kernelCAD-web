// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "grade-rod",
  license: 'CC0-1.0',
  title: "Survey grade rod",
  description: "Tall marked staff with a reinforced shoe and cross-grip at the top. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "survey grade rod", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d7a44a", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("grade-rod");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("rod", b(0, 0, 0, 70, 50, 1450, 0, 0, 0));
p.part("graduation-band-0", b(0, -27, 90, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-1", b(0, -27, 215, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-2", b(0, -27, 340, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-3", b(0, -27, 465, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-4", b(0, -27, 590, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-5", b(0, -27, 715, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-6", b(0, -27, 840, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-7", b(0, -27, 965, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-8", b(0, -27, 1090, 48, 5, 14, 0, 0, 0));
p.part("graduation-band-9", b(0, -27, 1215, 48, 5, 14, 0, 0, 0));
p.part("shoe", b(0, 0, 0, 95, 68, 80, 0, 0, 0));
p.part("top-grip", hx(0, 0, 1410, 180, 24, 8));

return p.model();
