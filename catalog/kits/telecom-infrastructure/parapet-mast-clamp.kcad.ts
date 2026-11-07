// SPDX-License-Identifier: CC0-1.0
// Parapet mast clamp: Parapet clamp frame with twin jaws, vertical mast socket and tightening blocks with clearly separated telecom materials and visible component cues.

meta({
  name: "parapet-mast-clamp",
  license: 'CC0-1.0',
  title: "Parapet mast clamp",
  description: "Parapet clamp frame with twin jaws, vertical mast socket and tightening blocks. Knobs: overall scale; galvanized steel, powder-coated steel, elastomer seals and pads, stainless steel.",
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
const rubber = param('rubber', '#282d30', { label: 'Elastomer seals and pads' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
    rubber: '#292e2d',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
    rubber: '#252a2c',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("parapet-mast-clamp");
p.part("base", b(0, 0, 20, 500, 320, 60).color(powderCoat));
p.part("jaw-left", b(-220, 0, 220, 60, 300, 400).color(powderCoat));
p.part("jaw-right", b(220, 0, 220, 60, 300, 400).color(powderCoat));
p.part("socket", c(0, 0, 50, 500, 82, 8).color(galvanizedSteel));
p.part("cross-bolt", b(0, 0, 390, 450, 45, 45).color(stainlessSteel));
p.part("pad-left", b(-220, 0, 0, 120, 340, 20).color(rubber));
p.part("pad-right", b(220, 0, 0, 120, 340, 20).color(rubber));

return p.model();
