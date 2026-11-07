// SPDX-License-Identifier: CC0-1.0
// Telecom warning sign: Site warning placard on two short posts with a broad rectangular sign panel with clearly separated telecom materials and visible component cues.

meta({
  name: "telecom-warning-sign",
  license: 'CC0-1.0',
  title: "Telecom warning sign",
  description: "Site warning placard on two short posts with a broad rectangular sign panel. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("telecom-warning-sign");
p.part("panel", b(0, 0, 930, 800, 45, 600).color(powderCoat));
p.part("post--300", b(-300, 0, 10, 55, 55, 900).color(galvanizedSteel));
p.part("post-300", b(300, 0, 10, 55, 55, 900).color(galvanizedSteel));
p.part("foot-left", b(-300, 0, 0, 180, 180, 40).color(powderCoat));
p.part("foot-right", b(300, 0, 0, 180, 180, 40).color(powderCoat));

return p.model();
