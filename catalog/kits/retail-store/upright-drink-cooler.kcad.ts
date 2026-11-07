// SPDX-License-Identifier: CC0-1.0
// Single-door beverage cooler with a framed door, open cabinet interior, stocked shelves, and a lower compressor grille.

meta({
  name: "upright-drink-cooler",
  license: 'CC0-1.0',
  title: "Upright drink cooler",
  description: "Single-door beverage cooler with a framed glass door, six bottles on visible shelves, a pull handle, and lower compressor grille. Knobs: overall scale and powder-coated steel, glass, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#536d78', { label: 'Powder-coated steel color' });
const glass = param('glass', '#92cbd3', { label: 'Glass color' });
const stainless = param('stainless', '#aeb8ba', { label: 'Stainless steel color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    glass: '#9ccfd6',
    stainless: '#bfc8cb',
  },
  nightRestock: {
    powderCoat: '#354750',
    glass: '#3e6677',
    stainless: '#66747a',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("upright-drink-cooler");
p.part("cabinet-left-side", b(-365, 0, 1000, 50, 700, 1800).color(powderCoat));
p.part("cabinet-right-side", b(365, 0, 1000, 50, 700, 1800).color(powderCoat));
p.part("cabinet-back", b(0, 330, 1000, 680, 40, 1800).color(powderCoat));
p.part("cabinet-top", b(0, 0, 1875, 680, 660, 50).color(powderCoat));
p.part("cabinet-base", b(0, 0, 175, 680, 660, 350).color(powderCoat));
p.part("door-frame-left", b(-340, -365, 1120, 30, 22, 1460).color(powderCoat));
p.part("door-frame-right", b(340, -365, 1120, 30, 22, 1460).color(powderCoat));
p.part("door-frame-top", b(0, -365, 1835, 680, 22, 30).color(powderCoat));
p.part("door-frame-bottom", b(0, -365, 405, 680, 22, 30).color(powderCoat));
p.part("door-glass-left", b(-300, -382, 1120, 10, 12, 1280).color(glass));
p.part("door-glass-right", b(300, -382, 1120, 10, 12, 1280).color(glass));
p.part("door-glass-top", b(0, -382, 1730, 590, 12, 10).color(glass));
p.part("door-glass-bottom", b(0, -382, 510, 590, 12, 10).color(glass));
p.part("handle", b(300, -410, 1120, 34, 36, 530).color(stainless));
p.part("inner-shelf-0", b(0, 0, 540, 570, 510, 28).color(stainless));
p.part("inner-shelf-1", b(0, 0, 860, 570, 510, 28).color(stainless));
p.part("inner-shelf-2", b(0, 0, 1180, 570, 510, 28).color(stainless));
p.part("inner-shelf-3", b(0, 0, 1500, 570, 510, 28).color(stainless));
for (const z of [554, 874]) {
  for (const x of [-175, 0, 175]) {
    p.part(`beverage-bottle-${z}-${x}`, c(x, -80, z, 180, 38, 10).color(glass));
    p.part(`bottle-cap-${z}-${x}`, c(x, -80, z + 180, 18, 24, 10).color(stainless));
  }
}
p.part("top-header", b(0, -40, 1950, 780, 620, 100).color(powderCoat));
p.part("compressor-grille", b(0, -356, 190, 500, 12, 150).color(stainless));
for (let slat = 0; slat < 4; slat++) {
  p.part(`compressor-slat-${slat}`, b(0, -365, 140 + slat * 32, 440, 10, 8).color(powderCoat));
}

return p.model();
