// SPDX-License-Identifier: CC0-1.0
// Battery backup cabinet: Compact backup-power enclosure with double front doors, cable entry hood and bottom plinth with clearly separated telecom materials and visible component cues.

meta({
  name: "battery-backup-cabinet",
  license: 'CC0-1.0',
  title: "Battery backup cabinet",
  description: "Compact backup-power enclosure with double front doors, cable entry hood and bottom plinth. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
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

const p = assembly("battery-backup-cabinet");
p.part("body", b(0, 0, 70, 1100, 720, 1150).color(powderCoat));
p.part("top", b(0, 0, 1255, 1150, 770, 70).color(powderCoat));
p.part("door-left", b(-275, -370, 90, 520, 22, 980).color(powderCoat));
p.part("door-right", b(275, -370, 90, 520, 22, 980).color(powderCoat));
p.part("intake", b(0, -388, 290, 160, 14, 90).color(polymer));
p.part("plinth", b(0, 0, 0, 1140, 760, 60).color(galvanizedSteel));

return p.model();
