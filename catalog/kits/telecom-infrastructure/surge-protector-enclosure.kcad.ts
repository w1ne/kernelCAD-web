// SPDX-License-Identifier: CC0-1.0
// Surge protection enclosure: Compact surge protection box with a front cover, conduit entry and top cap with clearly separated telecom materials and visible component cues.

meta({
  name: "surge-protector-enclosure",
  license: 'CC0-1.0',
  title: "Surge protection enclosure",
  description: "Compact surge protection box with a front cover, conduit entry and top cap. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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

const p = assembly("surge-protector-enclosure");
p.part("body", b(0, 0, 190, 390, 210, 380).color(powderCoat));
p.part("lid", b(0, -112, 195, 350, 18, 330).color(powderCoat));
p.part("cap", b(0, 0, 400, 420, 240, 45).color(powderCoat));
p.part("conduit", c(0, 0, 0, 180, 40, 8).color(galvanizedSteel));
p.part("latch", c(125, -130, 240, 24, 15, 8).color(stainlessSteel));

return p.model();
