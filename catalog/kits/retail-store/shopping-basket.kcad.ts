// SPDX-License-Identifier: CC0-1.0
// Open-frame shopping basket with a slatted polypropylene body, reinforced rim and a raised carry handle

meta({
  name: "shopping-basket",
  license: 'CC0-1.0',
  title: "Shopping basket",
  description: "Open-frame shopping basket with a slatted polypropylene body, reinforced rim and a raised carry handle. Knobs: overall scale and polypropylene, rubber, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polypropylene = param('polypropylene', '#b56c3b', { label: 'Polypropylene color' });
const rubber = param('rubber', '#4a4140', { label: 'Rubber color' });
const stainless = param('stainless', '#7e8b90', { label: 'Stainless steel color' });

presets({
  cleanStore: {
    polypropylene: '#d6e0d5',
    rubber: '#40474b',
    stainless: '#bfc8cb',
  },
  nightRestock: {
    polypropylene: '#45614e',
    rubber: '#262b2e',
    stainless: '#66747a',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("shopping-basket");
p.part("basket-floor", b(0, 0, 36, 540, 380, 72).color(polypropylene));
p.part("rim-front", b(0, -190, 318, 600, 24, 32).color(polypropylene));
p.part("rim-back", b(0, 190, 318, 600, 24, 32).color(polypropylene));
p.part("rim-left", b(-288, 0, 318, 24, 356, 32).color(polypropylene));
p.part("rim-right", b(288, 0, 318, 24, 356, 32).color(polypropylene));
for (const x of [-258, 258]) {
  for (const y of [-168, 168]) p.part(`corner-${x}-${y}`, b(x, y, 185, 20, 20, 230).color(polypropylene));
}
for (let row = 0; row < 3; row++) {
  const z = 104 + row * 82;
  p.part(`front-rail-${row}`, b(0, -178, z, 520, 16, 18).color(polypropylene));
  p.part(`back-rail-${row}`, b(0, 178, z, 520, 16, 18).color(polypropylene));
  p.part(`left-rail-${row}`, b(-258, 0, z, 16, 340, 18).color(polypropylene));
  p.part(`right-rail-${row}`, b(258, 0, z, 16, 340, 18).color(polypropylene));
}
p.part("handle-left", b(-220, 0, 480, 22, 28, 280).color(polypropylene));
p.part("handle-right", b(220, 0, 480, 22, 28, 280).color(polypropylene));
p.part("grip", b(0, 0, 620, 460, 30, 30).color(rubber));
p.part("pivot-left", c(-230, 0, 350, 20, 22, 8).color(stainless));
p.part("pivot-right", c(230, 0, 350, 20, 22, 8).color(stainless));

return p.model();
