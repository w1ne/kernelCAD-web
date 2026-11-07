// SPDX-License-Identifier: CC0-1.0
// Cylindrical antenna radome: Smooth cylindrical radome with rounded-looking cap rings and a narrow mounting foot with clearly separated telecom materials and visible component cues.

meta({
  name: "radome-cylinder",
  license: 'CC0-1.0',
  title: "Cylindrical antenna radome",
  description: "Smooth cylindrical radome with rounded-looking cap rings and a narrow mounting foot. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("radome-cylinder");
p.part("foot", c(0, 0, 0, 80, 120, 8).color(galvanizedSteel));
p.part("shell", c(0, 0, 80, 1050, 110, 8).color(powderCoat));
p.part("cap", c(0, 0, 1130, 60, 118, 8).color(powderCoat));
p.part("collar", c(0, 0, 150, 36, 116, 8).color(stainlessSteel));

return p.model();
