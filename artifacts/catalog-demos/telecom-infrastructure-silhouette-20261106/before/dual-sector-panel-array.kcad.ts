// SPDX-License-Identifier: CC0-1.0
// Dual sector panel array: Pair of side-by-side sector panels on a shared rear rail with clamp brackets with clearly separated telecom materials and visible component cues.

meta({
  name: "dual-sector-panel-array",
  license: 'CC0-1.0',
  title: "Dual sector panel array",
  description: "Pair of side-by-side sector panels on a shared rear rail with clamp brackets. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel, stainless steel.",
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
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
    powderCoat: '#52756b',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
    powderCoat: '#e0aa18',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("dual-sector-panel-array");
p.part("panel-left", b(-180, 0, 520, 280, 120, 1200).color(powderCoat));
p.part("panel-right", b(180, 0, 520, 280, 120, 1200).color(powderCoat));
p.part("back-rail", b(0, 75, 520, 44, 50, 1320).color(galvanizedSteel));
p.part("clamp-upper", b(0, 220, 850, 400, 42, 60).color(stainlessSteel));
p.part("clamp-lower", b(0, 220, 250, 400, 42, 60).color(stainlessSteel));
p.part("connector-left", b(-180, -68, 0, 80, 25, 90).color(polymer));
p.part("connector-right", b(180, -68, 0, 80, 25, 90).color(polymer));

return p.model();
