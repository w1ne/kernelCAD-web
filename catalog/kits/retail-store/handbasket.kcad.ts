// SPDX-License-Identifier: CC0-1.0
// Compact hand basket with open-frame sides, reinforced rim and raised swing handle

meta({
  name: "handbasket",
  license: 'CC0-1.0',
  title: "Hand basket",
  description: "Compact hand basket with open-frame sides, reinforced rim and raised swing handle. Knobs: overall scale and polypropylene, rubber, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polypropylene = param('polypropylene', '#d18c42', { label: 'Polypropylene color' });
const rubber = param('rubber', '#52463b', { label: 'Rubber color' });
const stainless = param('stainless', '#8a969a', { label: 'Stainless steel color' });

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

const p = assembly("handbasket");
p.part("basket-base", b(0, 0, 40, 460, 320, 80).color(polypropylene));
p.part("rim", b(0, 0, 330, 500, 360, 48).color(polypropylene));
p.part("side-rib-x-0", b(-210, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-x-1", b(-140, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-x-2", b(-70, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-x-3", b(0, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-x-4", b(70, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-x-5", b(140, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-x-6", b(210, 0, 190, 16, 300, 280).color(polypropylene));
p.part("side-rib-y-0", b(0, -140, 190, 440, 16, 280).color(polypropylene));
p.part("side-rib-y-1", b(0, -70, 190, 440, 16, 280).color(polypropylene));
p.part("side-rib-y-2", b(0, 0, 190, 440, 16, 280).color(polypropylene));
p.part("side-rib-y-3", b(0, 70, 190, 440, 16, 280).color(polypropylene));
p.part("side-rib-y-4", b(0, 140, 190, 440, 16, 280).color(polypropylene));
p.part("handle-side--220", b(-220, 0, 470, 20, 22, 280).color(polypropylene));
p.part("handle-side-220", b(220, 0, 470, 20, 22, 280).color(polypropylene));
p.part("handle-grip", b(0, 0, 610, 450, 28, 26).color(rubber));
p.part("pivot-cap", c(-220, 0, 325, 22, 22, 8).color(stainless));

return p.model();
