// SPDX-License-Identifier: CC0-1.0
// Compact promotional floor stand with tiered shelves, side cheeks and broad header panel

meta({
  name: "floor-display-stand",
  license: 'CC0-1.0',
  title: "Floor display stand",
  description: "Compact promotional floor stand with tiered shelves, side cheeks and broad header panel. Knobs: overall scale and plywood, stainless steel, paper color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const plywood = param('plywood', '#97724d', { label: 'Plywood color' });
const stainless = param('stainless', '#8d999c', { label: 'Stainless steel color' });
const paper = param('paper', '#f0e1bf', { label: 'Paper color' });

presets({
  cleanStore: {
    plywood: '#c9ad7b',
    stainless: '#bfc8cb',
    paper: '#f0e5c9',
  },
  nightRestock: {
    plywood: '#6d5839',
    stainless: '#66747a',
    paper: '#c9b27e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("floor-display-stand");
p.part("foot", b(0, 0, 40, 680, 620, 80).color(stainless));
p.part("back", b(0, 240, 650, 650, 50, 1300).color(plywood));
p.part("shelf-0", b(0, -100, 190, 670, 380, 42).color(plywood));
p.part("shelf-1", b(0, -100, 460, 635, 350, 42).color(plywood));
p.part("shelf-2", b(0, -100, 730, 600, 320, 42).color(plywood));
p.part("shelf-3", b(0, -100, 1000, 565, 290, 42).color(plywood));
p.part("header", b(0, 240, 1410, 660, 90, 220).color(paper));
p.part("top-bolt", c(0, 0, 1530, 24, 18, 8).color(stainless));

return p.model();
