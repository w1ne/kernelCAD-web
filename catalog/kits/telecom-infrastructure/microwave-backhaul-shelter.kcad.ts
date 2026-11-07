// SPDX-License-Identifier: CC0-1.0
// Microwave backhaul shelter: Narrow field shelter for radio backhaul equipment with door, roof lip and wall vents with clearly separated telecom materials and visible component cues.

meta({
  name: "microwave-backhaul-shelter",
  license: 'CC0-1.0',
  title: "Microwave backhaul shelter",
  description: "Narrow field shelter for radio backhaul equipment with door, roof lip and wall vents. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("microwave-backhaul-shelter");
p.part("base", b(0, 0, 0, 1600, 1250, 70).color(powderCoat));
p.part('rear-wall', b(0, 550, 90, 1500, 50, 2100).color(powderCoat));
p.part('left-wall', b(-725, 0, 90, 50, 1100, 2100).color(powderCoat));
p.part('right-wall', b(725, 0, 90, 50, 1100, 2100).color(powderCoat));
p.part("roof", b(0, 0, 2165, 1680, 1320, 100).color(powderCoat));
p.part("door", b(0, -581, 145, 650, 20, 1700).color(powderCoat));
p.part("vent", b(520, -592, 1365, 280, 18, 190).color(galvanizedSteel));
p.part("step", b(0, -700, 15, 780, 260, 100).color(galvanizedSteel));

return p.model();
