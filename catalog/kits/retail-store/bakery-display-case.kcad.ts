// SPDX-License-Identifier: CC0-1.0
// Counter-height bakery case with lower cabinet, display plinth, glass-frame posts and canopy

meta({
  name: "bakery-display-case",
  license: 'CC0-1.0',
  title: "Bakery display case",
  description: "Counter-height bakery case with lower cabinet, display plinth, glass-frame posts and canopy. Knobs: overall scale and laminate, tempered glass, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const laminate = param('laminate', '#876f58', { label: 'Laminate color' });
const temperedGlass = param('temperedGlass', '#9acfd4', { label: 'Tempered glass color' });
const stainless = param('stainless', '#aeb8ba', { label: 'Stainless steel color' });

presets({
  cleanStore: {
    laminate: '#d5c3a5',
    temperedGlass: '#a7d4d9',
    stainless: '#bfc8cb',
  },
  nightRestock: {
    laminate: '#685744',
    temperedGlass: '#476d78',
    stainless: '#66747a',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("bakery-display-case");
p.part("cabinet", b(0, 0, 390, 1500, 650, 780).color(laminate));
p.part("display-deck", b(0, -20, 805, 1480, 580, 50).color(laminate));
p.part("canopy", b(0, 0, 1380, 1540, 680, 50).color(temperedGlass));
p.part("glass-side-left", b(-702, 0, 1130, 14, 520, 480).color(temperedGlass));
p.part("glass-side-right", b(702, 0, 1130, 14, 520, 480).color(temperedGlass));
p.part("post--710--275", b(-710, -275, 1090, 36, 36, 540).color(temperedGlass));
p.part("post--710-275", b(-710, 275, 1090, 36, 36, 540).color(temperedGlass));
p.part("post-710--275", b(710, -275, 1090, 36, 36, 540).color(temperedGlass));
p.part("post-710-275", b(710, 275, 1090, 36, 36, 540).color(temperedGlass));
p.part("front-rail", b(0, -310, 1080, 1460, 28, 36).color(stainless));
p.part("corner-trim", c(0, 0, 1470, 30, 32, 8).color(stainless));

return p.model();
