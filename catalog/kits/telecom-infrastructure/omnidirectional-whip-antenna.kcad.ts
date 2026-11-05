// SPDX-License-Identifier: CC0-1.0
// Omnidirectional whip antenna: Short omnidirectional whip aerial with base puck and stepped connector collar with clearly separated telecom materials and visible component cues.

meta({
  name: "omnidirectional-whip-antenna",
  license: 'CC0-1.0',
  title: "Omnidirectional whip antenna",
  description: "Short omnidirectional whip aerial with base puck and stepped connector collar. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel, stainless steel.",
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
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
    powderCoat: '#52756b',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
    powderCoat: '#e0aa18',
    stainlessSteel: '#e4e9e6',
  },
});

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("omnidirectional-whip-antenna");
p.part("base", c(0, 0, 0, 45, 95, 8).color(powderCoat));
p.part("collar", c(0, 0, 45, 50, 65, 8).color(stainlessSteel));
p.part("whip", c(0, 0, 95, 950, 20, 8).color(polymer));
p.part("tip", c(0, 0, 1045, 30, 26, 8).color(galvanizedSteel));

return p.model();
