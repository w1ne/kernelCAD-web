// SPDX-License-Identifier: CC0-1.0
// Cable ladder section: Straight cable ladder tray with twin rails and six evenly spaced rungs with clearly separated telecom materials and visible component cues.

meta({
  name: "cable-ladder-section",
  license: 'CC0-1.0',
  title: "Cable ladder section",
  description: "Straight cable ladder tray with twin rails and six evenly spaced rungs. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
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

const p = assembly("cable-ladder-section");
p.part("rail-left", b(0, -230, 0, 1500, 45, 70).color(powderCoat));
p.part("rail-right", b(0, 230, 0, 1500, 45, 70).color(powderCoat));
p.part("rung-0", b(-600, 0, 0, 45, 500, 45).color(galvanizedSteel));
p.part("rung-1", b(-360, 0, 0, 45, 500, 45).color(galvanizedSteel));
p.part("rung-2", b(-120, 0, 0, 45, 500, 45).color(galvanizedSteel));
p.part("rung-3", b(120, 0, 0, 45, 500, 45).color(galvanizedSteel));
p.part("rung-4", b(360, 0, 0, 45, 500, 45).color(galvanizedSteel));
p.part("rung-5", b(600, 0, 0, 45, 500, 45).color(galvanizedSteel));


p.part('cable-jacket-a', b(0, -100, 85, 1450, 22, 22).color(polymer));
p.part('cable-jacket-b', b(0, 0, 85, 1450, 22, 22).color(polymer));
p.part('cable-jacket-c', b(0, 100, 85, 1450, 22, 22).color(polymer));

return p.model();
