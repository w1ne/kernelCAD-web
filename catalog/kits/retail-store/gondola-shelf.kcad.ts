// SPDX-License-Identifier: CC0-1.0
// Double-sided supermarket gondola with perforated-look back panel, six shelves and stabilizing feet

meta({
  name: "gondola-shelf",
  license: 'CC0-1.0',
  title: "Gondola shelf",
  description: "Double-sided supermarket gondola with perforated-look back panel, six shelves and stabilizing feet. Knobs: overall scale and powder-coated steel, stainless steel, polypropylene color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#536971', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#c0c9ca', { label: 'Stainless steel color' });
const polypropylene = param('polypropylene', '#3d484b', { label: 'Polypropylene color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    polypropylene: '#d6e0d5',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    polypropylene: '#45614e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);

const p = assembly("gondola-shelf");
p.part("back-panel", b(0, 0, 1000, 1800, 54, 2000).color(powderCoat));
p.part("shelf-0", b(0, -260, 330, 1800, 540, 45).color(stainless));
p.part("shelf-1", b(0, -260, 630, 1800, 540, 45).color(stainless));
p.part("shelf-2", b(0, -260, 930, 1800, 540, 45).color(stainless));
p.part("shelf-0", b(0, 260, 330, 1800, 540, 45).color(stainless));
p.part("shelf-1", b(0, 260, 630, 1800, 540, 45).color(stainless));
p.part("shelf-2", b(0, 260, 930, 1800, 540, 45).color(stainless));
p.part("upright--840", b(-840, 0, 1000, 50, 70, 2000).color(powderCoat));
p.part("upright-840", b(840, 0, 1000, 50, 70, 2000).color(powderCoat));
p.part("foot--730", b(-730, 0, 34, 220, 740, 68).color(polypropylene));
p.part("foot-730", b(730, 0, 34, 220, 740, 68).color(polypropylene));

return p.model();
