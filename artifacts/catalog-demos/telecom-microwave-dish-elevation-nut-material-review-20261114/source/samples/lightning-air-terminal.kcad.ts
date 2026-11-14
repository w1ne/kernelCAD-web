// SPDX-License-Identifier: CC0-1.0
// Lightning protection air terminal: Tapered-looking lightning rod on a broad rooftop base plate with a collar with clearly separated telecom materials and visible component cues.

meta({
  name: "lightning-air-terminal",
  license: 'CC0-1.0',
  title: "Lightning protection air terminal",
  description: "Tapered-looking lightning rod on a broad rooftop base plate with a collar. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("lightning-air-terminal");
p.part("base", b(0, 0, 0, 360, 360, 50).color(powderCoat));
p.part("mast", c(0, 0, 25, 850, 35, 8).color(galvanizedSteel));
p.part("collar", c(0, 0, 845, 55, 58, 8).color(stainlessSteel));
p.part("tip", c(0, 0, 900, 240, 14, 8).color(galvanizedSteel));

return p.model();
