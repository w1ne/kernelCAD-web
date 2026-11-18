// SPDX-License-Identifier: CC0-1.0
// Cable splice pit frame: Square access pit frame with thick rim, inset lid and paired lifting recesses with clearly separated telecom materials and visible component cues.

meta({
  name: "cable-splice-pit-frame",
  license: 'CC0-1.0',
  title: "Cable splice pit frame",
  description: "Square access pit frame with thick rim, inset lid and paired lifting recesses. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("cable-splice-pit-frame");
p.part("outer-rim", b(0, 0, 0, 850, 850, 70).color(powderCoat));
p.part("lid", b(0, 0, 45, 700, 700, 35).color(powderCoat));
p.part("slot-left", b(-210, 0, 70, 90, 36, 14).color(powderCoat));
p.part("slot-right", b(210, 0, 70, 90, 36, 14).color(powderCoat));
p.part("inner-lip", b(0, 0, 70, 620, 620, 18).color(galvanizedSteel));

return p.model();
