// SPDX-License-Identifier: CC0-1.0
// Outdoor network cabinet: Tall weatherproof network enclosure with sloped rain cap, side louvers and raised feet with clearly separated telecom materials and visible component cues.

meta({
  name: "outdoor-network-cabinet",
  license: 'CC0-1.0',
  title: "Outdoor network cabinet",
  description: "Tall weatherproof network enclosure with sloped rain cap, side louvers and raised feet. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("outdoor-network-cabinet");
p.part("body", b(0, 0, 75, 780, 600, 1500).color(powderCoat));
p.part("cap", b(0, 0, 1615, 860, 680, 100).color(powderCoat));
p.part("side-louver-a", b(-402, 0, 535, 18, 300, 260).color(galvanizedSteel));
p.part("side-louver-b", b(-402, 0, 855, 18, 300, 260).color(galvanizedSteel));
p.part("door", b(0, -308, 105, 650, 18, 1280).color(powderCoat));
p.part("foot-left", b(-290, 0, 0, 100, 120, 50).color(powderCoat));
p.part("foot-right", b(290, 0, 0, 100, 120, 50).color(powderCoat));

return p.model();
