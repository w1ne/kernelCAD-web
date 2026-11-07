// SPDX-License-Identifier: CC0-1.0
// Telecom equipment shelter: Small site shelter with two access doors, vent panels, corner posts and a broad roof with clearly separated telecom materials and visible component cues.

meta({
  name: "telecom-equipment-shelter",
  license: 'CC0-1.0',
  title: "Telecom equipment shelter",
  description: "Small site shelter with two access doors, vent panels, corner posts and a broad roof. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("telecom-equipment-shelter");
p.part("floor", b(0, 0, 0, 2600, 2100, 90).color(galvanizedSteel));
p.part("rear", b(0, 1000, 1225, 2500, 70, 2380).color(powderCoat));
p.part("left", b(-1215, 0, 1225, 70, 2000, 2380).color(powderCoat));
p.part("right", b(1215, 0, 1225, 70, 2000, 2380).color(powderCoat));
p.part("roof", b(0, 0, 2445, 2750, 2250, 130).color(powderCoat));
p.part("door-a", b(-500, -1040, 115, 800, 24, 2050).color(powderCoat));
p.part("door-b", b(500, -1040, 115, 800, 24, 2050).color(powderCoat));

return p.model();
