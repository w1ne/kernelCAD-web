// SPDX-License-Identifier: CC0-1.0
// Fiber handhole cover: Rectangular fiber handhole lid with raised rim, lift slots and a small network marker with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-handhole-cover",
  license: 'CC0-1.0',
  title: "Fiber handhole cover",
  description: "Rectangular fiber handhole lid with raised rim, lift slots and a small network marker. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("fiber-handhole-cover");
p.part("rim", b(0, 0, 0, 900, 600, 50).color(powderCoat));
p.part("lid", b(0, 0, 40, 820, 520, 40).color(powderCoat));
p.part("slot-left", b(-280, -5, 65, 110, 38, 16).color(powderCoat));
p.part("slot-right", b(280, -5, 65, 110, 38, 16).color(powderCoat));
p.part("marker", b(0, 0, 70, 150, 95, 18).color(galvanizedSteel));

return p.model();
