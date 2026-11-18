// SPDX-License-Identifier: CC0-1.0
// Hand broom: Short whisk broom with a tapered handle, bound neck and fan of coarse bristles. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, brush fiber.

meta({
  name: "hand-broom",
  license: 'CC0-1.0',
  title: "Hand broom",
  description: "Short whisk broom with a tapered handle, bound neck and fan of coarse bristles. Material controls: timber, brush fiber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "hand broom", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const fiber = param('fiber', '#cfb986', { label: 'Brush fiber' });
presets({
  fieldReady: { timber: '#a27850', fiber: '#e2d09d' },
  weathered: { timber: '#705a45', fiber: '#a18a61' },
});
const baseZ = 0;
const p = assembly("hand-broom");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("handle", c(0, 0, 0, 180, 20, 8).color(timber));
p.part("bound-neck", b(0, 0, 158, 70, 62, 78, 0, 0, 0).color(timber));
p.part("bristle-0", b(-56, 0, 202, 22, 38, 125, 0, 0, -18).color(fiber));
p.part("bristle-1", b(-28, 0, 202, 22, 38, 125, 0, 0, -9).color(fiber));
p.part("bristle-2", b(0, 0, 202, 22, 38, 125, 0, 0, 0).color(fiber));
p.part("bristle-3", b(28, 0, 202, 22, 38, 125, 0, 0, 9).color(fiber));
p.part("bristle-4", b(56, 0, 202, 22, 38, 125, 0, 0, 18).color(fiber));

return p.model();
