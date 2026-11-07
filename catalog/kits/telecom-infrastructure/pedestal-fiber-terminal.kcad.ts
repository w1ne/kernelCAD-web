// SPDX-License-Identifier: CC0-1.0
// Pedestal fiber terminal: Slim ground pedestal with removable cap, service door and two conduit entries with clearly separated telecom materials and visible component cues.

meta({
  name: "pedestal-fiber-terminal",
  license: 'CC0-1.0',
  title: "Pedestal fiber terminal",
  description: "Slim ground pedestal with removable cap, service door and two conduit entries. Knobs: overall scale; galvanized steel, powder-coated steel.",
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
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("pedestal-fiber-terminal");
p.part("base", b(0, 0, 25, 430, 360, 50).color(powderCoat));
p.part("pedestal", b(0, 0, 390, 350, 280, 730).color(galvanizedSteel));
p.part("cap", b(0, 0, 780, 400, 330, 50).color(powderCoat));
p.part("door", b(0, -145, 390, 240, 18, 520).color(powderCoat));
p.part("conduit-a", c(-100, 0, 0, 220, 34, 8).color(galvanizedSteel));
p.part("conduit-b", c(100, 0, 0, 220, 34, 8).color(galvanizedSteel));

return p.model();
