// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "gondola-shelf",
  license: 'CC0-1.0',
  title: "Gondola shelf",
  description: "Double-sided supermarket gondola with perforated-look back panel, six shelves and stabilizing feet. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#59707a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);

const p = assembly("gondola-shelf");
p.part("back-panel", b(0, 0, 1000, 1800, 54, 2000).color(color));
p.part("shelf-0", b(0, -260, 330, 1800, 540, 45).color(color));
p.part("shelf-1", b(0, -260, 630, 1800, 540, 45).color(color));
p.part("shelf-2", b(0, -260, 930, 1800, 540, 45).color(color));
p.part("shelf-0", b(0, 260, 330, 1800, 540, 45).color(color));
p.part("shelf-1", b(0, 260, 630, 1800, 540, 45).color(color));
p.part("shelf-2", b(0, 260, 930, 1800, 540, 45).color(color));
p.part("upright--840", b(-840, 0, 1000, 50, 70, 2000).color(color));
p.part("upright-840", b(840, 0, 1000, 50, 70, 2000).color(color));
p.part("foot--730", b(-730, 0, 34, 220, 740, 68).color(color));
p.part("foot-730", b(730, 0, 34, 220, 740, 68).color(color));

return p.model();
