// SPDX-License-Identifier: CC0-1.0
// Telecom cable marker post: Narrow marker post with a ribbed cap, tag plate and buried-end indicator band with clearly separated telecom materials and visible component cues.

meta({
  name: "telecom-cable-marker-post",
  license: 'CC0-1.0',
  title: "Telecom cable marker post",
  description: "Narrow marker post with a ribbed cap, tag plate and buried-end indicator band. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("telecom-cable-marker-post");
p.part("post", b(0, 0, 280, 80, 80, 600).color(galvanizedSteel));
p.part("cap", b(0, 0, 610, 120, 120, 60).color(powderCoat));
p.part("tag", b(0, -50, 390, 110, 22, 120).color(galvanizedSteel));
p.part("band", b(0, 0, 120, 100, 100, 35).color(galvanizedSteel));
p.part("foot", b(0, 0, 0, 190, 190, 40).color(galvanizedSteel));

return p.model();
