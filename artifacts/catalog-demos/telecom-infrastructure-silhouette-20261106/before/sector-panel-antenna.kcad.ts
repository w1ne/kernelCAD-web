// SPDX-License-Identifier: CC0-1.0
// Sector panel antenna: Slim panel antenna with shallow radome, rear mounting rail and connector block with clearly separated telecom materials and visible component cues.

meta({
  name: "sector-panel-antenna",
  license: 'CC0-1.0',
  title: "Sector panel antenna",
  description: "Slim panel antenna with shallow radome, rear mounting rail and connector block. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
presets({
  fieldSite: {
    polymer: '#263a37',
    powderCoat: '#52756b',
  },
  highVisibility: {
    polymer: '#27363c',
    powderCoat: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("sector-panel-antenna");
p.part("radome", b(0, 0, 620, 260, 130, 1240).color(polymer));
p.part("top-cap", b(0, 0, 1260, 270, 145, 40).color(powderCoat));
p.part("bottom-cap", b(0, 0, 0, 270, 145, 40).color(powderCoat));
p.part("rear-rail", b(0, 78, 600, 55, 44, 1120).color(powderCoat));
p.part("connector", b(0, 110, 80, 150, 75, 90).color(polymer));

return p.model();
