// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "refrigerated-display-case",
  license: 'CC0-1.0',
  title: "Refrigerated display case",
  description: "Open-front chilled display with insulated base, three shelf decks and a raised top canopy. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687a7c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("refrigerated-display-case");
p.part("base-cabinet", b(0, 0, 360, 1800, 850, 720).color(color));
p.part("bottom-deck", b(0, -100, 760, 1720, 650, 48).color(color));
p.part("shelf-0", b(0, -140, 890, 1720, 590, 42).color(color));
p.part("shelf-1", b(0, -140, 1190, 1720, 590, 42).color(color));
p.part("shelf-2", b(0, -140, 1490, 1720, 590, 42).color(color));
p.part("canopy", b(0, 0, 1800, 1880, 900, 90).color(color));
p.part("front-upright--840", b(-840, -350, 1260, 42, 42, 950).color(color));
p.part("front-upright-840", b(840, -350, 1260, 42, 42, 950).color(color));
p.part("temperature-dial", c(830, 437, 400, 22, 28, 8).color(color));

return p.model();
