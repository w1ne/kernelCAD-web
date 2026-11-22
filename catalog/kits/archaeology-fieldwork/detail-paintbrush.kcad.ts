// SPDX-License-Identifier: CC0-1.0
// Detailing brush: Fine pointed cleaning brush with a tapered grip, ferrule and slim bristle bundle. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, stainless steel, brush fiber.

meta({
  name: "detail-paintbrush",
  license: 'CC0-1.0',
  title: "Detailing brush",
  description: "Fine pointed cleaning brush with a tapered grip, ferrule and slim bristle bundle. Material controls: timber, stainless steel, brush fiber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "detailing brush", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const fiber = param('fiber', '#cfb986', { label: 'Brush fiber' });
presets({
  fieldReady: { timber: '#a27850', stainlessSteel: '#c7cdcf', fiber: '#e2d09d' },
  weathered: { timber: '#705a45', stainlessSteel: '#7a8588', fiber: '#a18a61' },
});
const baseZ = 0;
const p = assembly("detail-paintbrush");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("handle", hx(-125, 0, 22, 230, 17, 8).color(timber));
p.part("ferrule", hx(14, 0, 22, 52, 22, 8).color(stainlessSteel));
p.part("bristles", hx(112, 0, 22, 154, 12, 8).color(fiber));
p.part("bristle-tip", hx(195, 0, 22, 28, 7, 8).color(fiber));
p.part("handle-end", c(-238, 0, 7, 30, 19, 8).color(timber));

return p.model();
