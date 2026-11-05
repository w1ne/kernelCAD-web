// SPDX-License-Identifier: CC0-1.0
// Angled multi-pocket magazine stand with four front lips, tall backboard and side supports

meta({
  name: "magazine-rack",
  license: 'CC0-1.0',
  title: "Magazine rack",
  description: "Angled multi-pocket magazine stand with four front lips, tall backboard and side supports. Knobs: overall scale and powder-coated steel, acrylic, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#64594c', { label: 'Powder-coated steel color' });
const acrylic = param('acrylic', '#c0d0cf', { label: 'Acrylic color' });
const rubber = param('rubber', '#373b3d', { label: 'Rubber color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    acrylic: '#a1d1dc',
    rubber: '#40474b',
  },
  nightRestock: {
    powderCoat: '#354750',
    acrylic: '#486b80',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("magazine-rack");
p.part("backboard", b(0, 120, 700, 700, 55, 1400).color(powderCoat));
p.part("pocket-0", b(0, -120, 190, 680, 300, 95).color(acrylic));
p.part("pocket-1", b(0, -62, 490, 680, 300, 95).color(acrylic));
p.part("pocket-2", b(0, -4, 790, 680, 300, 95).color(acrylic));
p.part("pocket-3", b(0, 54, 1090, 680, 300, 95).color(acrylic));
p.part("side--350", b(-350, 0, 710, 38, 350, 1420).color(powderCoat));
p.part("side-350", b(350, 0, 710, 38, 350, 1420).color(powderCoat));
p.part("floor-foot", c(0, 0, 0, 35, 60, 8).color(rubber));

return p.model();
