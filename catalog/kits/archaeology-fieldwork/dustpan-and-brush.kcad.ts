// SPDX-License-Identifier: CC0-1.0
// Dustpan and brush: Field dustpan with a raised lip and a compact cleaning brush resting beside it. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, timber, brush fiber.

meta({
  name: "dustpan-and-brush",
  license: 'CC0-1.0',
  title: "Dustpan and brush",
  description: "Field dustpan with a raised lip and a compact cleaning brush resting beside it. Material controls: molded polymer, timber, brush fiber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "dustpan and brush", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const fiber = param('fiber', '#cfb986', { label: 'Brush fiber' });
presets({
  fieldReady: { polymer: '#e6e9df', timber: '#a27850', fiber: '#e2d09d' },
  weathered: { polymer: '#8d9890', timber: '#705a45', fiber: '#a18a61' },
});
const baseZ = 0;
const p = assembly("dustpan-and-brush");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};

p.part("pan-base", b(0, -80, 0, 270, 220, 22, 0, 0, 0).color(polymer));
p.part("pan-back", b(0, 26, 14, 270, 20, 135, 0, 0, 0).color(polymer));
p.part("pan-left-wall", b(-126, -75, 20, 18, 195, 62, 0, 0, 0).color(polymer));
p.part("pan-right-wall", b(126, -75, 20, 18, 195, 62, 0, 0, 0).color(polymer));
p.part("pan-handle", b(0, 210, 18, 48, 210, 38, 0, 0, 0).color(polymer));
p.part("brush-handle", b(142, -70, 4, 42, 185, 34, 0, 0, -22).color(timber));
p.part("brush-head", b(205, -76, 0, 85, 105, 48, 0, 0, 0).color(fiber));

return p.model();
