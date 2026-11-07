// SPDX-License-Identifier: CC0-1.0
// Gondola endcap with stepped product decks, tall rear board and sign panel

meta({
  name: "shelf-endcap",
  license: 'CC0-1.0',
  title: "Shelf endcap display",
  description: "Gondola endcap with stepped product decks, tall rear board and sign panel. Knobs: overall scale and powder-coated steel, stainless steel, vinyl color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#65777b', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#b1bbbc', { label: 'Stainless steel color' });
const vinyl = param('vinyl', '#dba83d', { label: 'Vinyl color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    vinyl: '#dce9dc',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    vinyl: '#d2a536',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("shelf-endcap");
p.part("rear-board", b(0, 240, 960, 900, 50, 1920).color(powderCoat));
p.part("deck-0", b(0, -130, 270, 920, 460, 48).color(stainless));
p.part("deck-1", b(0, -85, 570, 920, 400, 48).color(stainless));
p.part("deck-2", b(0, -40, 870, 920, 340, 48).color(stainless));
p.part("deck-3", b(0, 5, 1170, 920, 280, 48).color(stainless));
p.part("header", b(0, 205, 2040, 880, 70, 180).color(vinyl));
p.part("leg--405", b(-405, 0, 500, 42, 52, 1000).color(powderCoat));
p.part("leg-405", b(405, 0, 500, 42, 52, 1000).color(powderCoat));
p.part("base-cap", c(0, 0, 0, 30, 62, 8).color(stainless));

return p.model();
