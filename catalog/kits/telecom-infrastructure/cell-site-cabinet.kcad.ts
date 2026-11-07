// SPDX-License-Identifier: CC0-1.0
// Cell site cabinet: Outdoor base-station cabinet with raised roof, split access doors, plinth and vent banks with clearly separated telecom materials and visible component cues.

meta({
  name: "cell-site-cabinet",
  license: 'CC0-1.0',
  title: "Cell site cabinet",
  description: "Outdoor base-station cabinet with raised roof, split access doors, plinth and vent banks. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("cell-site-cabinet");
p.part("cabinet", b(0, 0, 60, 900, 620, 1450).color(powderCoat));
p.part("roof", b(0, 0, 1510, 960, 680, 70).color(powderCoat));
p.part("left-door", b(-220, -318, 90, 420, 18, 1180).color(powderCoat));
p.part("right-door", b(220, -318, 90, 420, 18, 1180).color(powderCoat));
p.part("vent-1", b(0, -331, 300, 180, 16, 80).color(galvanizedSteel));
p.part("vent-2", b(0, -331, 450, 180, 16, 80).color(galvanizedSteel));
p.part("plinth", b(0, 0, 0, 940, 660, 60).color(galvanizedSteel));

return p.model();
