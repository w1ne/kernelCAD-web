// SPDX-License-Identifier: CC0-1.0
// Remote radio unit: Outdoor radio unit with finned body, upper mounting ears and two lower connectors with clearly separated telecom materials and visible component cues.

meta({
  name: "remote-radio-unit",
  license: 'CC0-1.0',
  title: "Remote radio unit",
  description: "Outdoor radio unit with finned body, upper mounting ears and two lower connectors. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
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

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("remote-radio-unit");
p.part("body", b(0, 0, 390, 340, 220, 820).color(powderCoat));
p.part("top-ear-left", b(-130, 0, 820, 80, 260, 80).color(powderCoat));
p.part("top-ear-right", b(130, 0, 820, 80, 260, 80).color(powderCoat));
p.part("fin-a", b(-220, 0, 370, 30, 180, 700).color(galvanizedSteel));
p.part("fin-b", b(220, 0, 370, 30, 180, 700).color(galvanizedSteel));
p.part("connector-a", c(-80, -125, 0, 80, 32, 8).color(polymer));
p.part("connector-b", c(80, -125, 0, 80, 32, 8).color(polymer));

return p.model();
