// SPDX-License-Identifier: CC0-1.0
// Mast outrigger frame: Rooftop outrigger frame with two ballast rails, cross members and a central mast socket with clearly separated telecom materials and visible component cues.

meta({
  name: "mast-outrigger-frame",
  license: 'CC0-1.0',
  title: "Mast outrigger frame",
  description: "Rooftop outrigger frame with two ballast rails, cross members and a central mast socket. Knobs: overall scale; galvanized steel, powder-coated steel.",
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
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("mast-outrigger-frame");
p.part("rail-left", b(-460, 0, 0, 100, 1700, 70).color(powderCoat));
p.part("rail-right", b(460, 0, 0, 100, 1700, 70).color(powderCoat));
p.part("cross-front", b(0, -720, 55, 1020, 100, 100).color(galvanizedSteel));
p.part("cross-rear", b(0, 720, 55, 1020, 100, 100).color(powderCoat));
p.part("socket", c(0, 0, 65, 430, 88, 8).color(galvanizedSteel));
p.part("brace-left", b(-230, 0, 195, 40, 120, 350).color(powderCoat));
p.part("brace-right", b(230, 0, 195, 40, 120, 350).color(powderCoat));

return p.model();
