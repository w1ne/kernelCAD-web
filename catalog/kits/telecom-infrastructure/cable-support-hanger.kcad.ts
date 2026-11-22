// SPDX-License-Identifier: CC0-1.0
// Cable support hanger: Two-hole wall plate with a projecting U-shaped cable support and end lips with clearly separated telecom materials and visible component cues.

meta({
  name: "cable-support-hanger",
  license: 'CC0-1.0',
  title: "Cable support hanger",
  description: "Two-hole wall plate with a projecting U-shaped cable support and end lips. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("cable-support-hanger");
p.part("backplate", b(0, 0, 0, 360, 45, 660).color(powderCoat));
p.part("arm-left", b(-170, -190, 0, 40, 380, 40).color(powderCoat));
p.part("arm-right", b(170, -190, 0, 40, 380, 40).color(powderCoat));
p.part("crossbar", b(0, -380, 0, 380, 40, 40).color(galvanizedSteel));
p.part("lip-left", b(-170, -360, 50, 40, 40, 100).color(powderCoat));
p.part("lip-right", b(170, -360, 50, 40, 40, 100).color(powderCoat));

return p.model();
