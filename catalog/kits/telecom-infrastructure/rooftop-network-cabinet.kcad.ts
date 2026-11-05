// SPDX-License-Identifier: CC0-1.0
// Rooftop network cabinet: Low rooftop radio cabinet with raised curb, hinged lid and side ventilation slots with clearly separated telecom materials and visible component cues.

meta({
  name: "rooftop-network-cabinet",
  license: 'CC0-1.0',
  title: "Rooftop network cabinet",
  description: "Low rooftop radio cabinet with raised curb, hinged lid and side ventilation slots. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("rooftop-network-cabinet");
p.part("curb", b(0, 0, 0, 1250, 850, 60).color(galvanizedSteel));
p.part("body", b(0, 0, 360, 1150, 750, 660).color(powderCoat));
p.part("lid", b(0, 0, 720, 1210, 810, 60).color(powderCoat));
p.part("front-panel", b(0, -383, 370, 860, 18, 500).color(powderCoat));
p.part("vent-left", b(-350, -397, 370, 130, 12, 210).color(powderCoat));
p.part("vent-right", b(350, -397, 370, 130, 12, 210).color(powderCoat));

return p.model();
