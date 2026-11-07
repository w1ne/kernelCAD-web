// SPDX-License-Identifier: CC0-1.0
// Fiber route marker: Low ground route marker with tapered post, broad cap and square footing with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-route-marker",
  license: 'CC0-1.0',
  title: "Fiber route marker",
  description: "Low ground route marker with tapered post, broad cap and square footing. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("fiber-route-marker");
p.part("foot", b(0, 0, 0, 250, 250, 50).color(galvanizedSteel));
p.part("post", b(0, 0, 220, 95, 95, 390).color(galvanizedSteel));
p.part("cap", b(0, 0, 445, 210, 210, 60).color(powderCoat));
p.part("face", b(0, -54, 235, 55, 18, 180).color(powderCoat));

return p.model();
