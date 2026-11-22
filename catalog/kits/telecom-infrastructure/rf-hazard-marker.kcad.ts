// SPDX-License-Identifier: CC0-1.0
// RF hazard marker: Compact RF exposure marker on a post with a raised diamond-like center plate with clearly separated telecom materials and visible component cues.

meta({
  name: "rf-hazard-marker",
  license: 'CC0-1.0',
  title: "RF hazard marker",
  description: "Compact RF exposure marker on a post with a raised diamond-like center plate. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("rf-hazard-marker");
p.part("post", b(0, 0, 0, 55, 55, 800).color(galvanizedSteel));
p.part("plate", b(0, 0, 665, 450, 40, 360).color(powderCoat));
p.part("center", b(0, -26, 665, 250, 18, 200).color(galvanizedSteel));
p.part("foot", b(0, 0, 0, 200, 200, 50).color(galvanizedSteel));

return p.model();
