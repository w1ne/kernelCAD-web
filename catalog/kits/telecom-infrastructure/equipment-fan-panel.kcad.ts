// SPDX-License-Identifier: CC0-1.0
// Equipment fan panel: Ventilation panel with twin circular fan shrouds and four mounting tabs with clearly separated telecom materials and visible component cues.

meta({
  name: "equipment-fan-panel",
  license: 'CC0-1.0',
  title: "Equipment fan panel",
  description: "Ventilation panel with twin circular fan shrouds and four mounting tabs. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("equipment-fan-panel");
p.part("panel", b(0, 0, 170, 780, 90, 700).color(powderCoat));
p.part("fan-a", c(-190, -55, 0, 300, 145, 8).color(galvanizedSteel));
p.part("fan-b", c(190, -55, 0, 300, 145, 8).color(galvanizedSteel));
p.part("tab-0", b(-360, -70, 160, 90, 90, 45).color(galvanizedSteel));
p.part("tab-1", b(360, -70, 160, 90, 90, 45).color(galvanizedSteel));
p.part("tab-2", b(-360, 70, 160, 90, 90, 45).color(galvanizedSteel));
p.part("tab-3", b(360, 70, 160, 90, 90, 45).color(galvanizedSteel));

return p.model();
