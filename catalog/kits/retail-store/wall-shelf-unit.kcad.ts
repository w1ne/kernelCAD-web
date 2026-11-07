// SPDX-License-Identifier: CC0-1.0
// Single-sided wall shelving with four adjustable decks, side uprights and a header board

meta({
  name: "wall-shelf-unit",
  license: 'CC0-1.0',
  title: "Wall shelf unit",
  description: "Single-sided wall shelving with four adjustable decks, side uprights and a header board. Knobs: overall scale and powder-coated steel, stainless steel, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#7d6d5a', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#c1c9ca', { label: 'Stainless steel color' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    rubber: '#40474b',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("wall-shelf-unit");
p.part("back", b(0, 0, 1040, 1400, 48, 2080).color(powderCoat));
p.part("deck-0", b(0, -180, 330, 1420, 510, 50).color(stainless));
p.part("deck-1", b(0, -180, 720, 1420, 510, 50).color(stainless));
p.part("deck-2", b(0, -180, 1110, 1420, 510, 50).color(stainless));
p.part("deck-3", b(0, -180, 1500, 1420, 510, 50).color(stainless));
p.part("side--674", b(-674, -180, 1040, 52, 500, 2080).color(powderCoat));
p.part("side-674", b(674, -180, 1040, 52, 500, 2080).color(powderCoat));
p.part("header", b(0, -160, 2160, 1400, 100, 160).color(powderCoat));
p.part("foot", c(0, 0, 0, 48, 80, 8).color(rubber));

return p.model();
