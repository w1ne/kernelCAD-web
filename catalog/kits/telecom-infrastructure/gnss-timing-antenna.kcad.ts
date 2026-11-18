// SPDX-License-Identifier: CC0-1.0
// GNSS timing antenna: Compact timing antenna puck on a short pole with a broad weather cap with clearly separated telecom materials and visible component cues.

meta({
  name: "gnss-timing-antenna",
  license: 'CC0-1.0',
  title: "GNSS timing antenna",
  description: "Compact timing antenna puck on a short pole with a broad weather cap. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
    powderCoat: '#52756b',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
    powderCoat: '#e0aa18',
  },
});

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("gnss-timing-antenna");
p.part("base", c(0, 0, 0, 55, 100, 8).color(powderCoat));
p.part("pole", c(0, 0, 55, 300, 24, 8).color(galvanizedSteel));
p.part("puck", c(0, 0, 355, 100, 145, 8).color(polymer));
p.part("cap", c(0, 0, 455, 35, 155, 8).color(powderCoat));

return p.model();
