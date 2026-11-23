// SPDX-License-Identifier: CC0-1.0
// Remote power shelf: Rack power shelf with two module faces, handles and a raised top lip with clearly separated telecom materials and visible component cues.

meta({
  name: "remote-power-shelf",
  license: 'CC0-1.0',
  title: "Remote power shelf",
  description: "Rack power shelf with two module faces, handles and a raised top lip. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("remote-power-shelf");
p.part("shelf", b(0, 0, 0, 680, 360, 340).color(galvanizedSteel));
p.part("top", b(0, 0, 190, 700, 380, 40).color(powderCoat));
p.part("module-left", b(-160, -188, 15, 280, 18, 220).color(powderCoat));
p.part("module-right", b(160, -188, 15, 280, 18, 220).color(powderCoat));
p.part("handle-left", b(-220, -220, 15, 45, 30, 130).color(powderCoat));
p.part("handle-right", b(220, -220, 15, 45, 30, 130).color(powderCoat));

return p.model();
