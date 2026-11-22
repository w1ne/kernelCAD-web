// SPDX-License-Identifier: CC0-1.0
// Fiber distribution cabinet: Street-side fiber distribution cabinet with hinged-looking front, lock and cable plinth with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-distribution-cabinet",
  license: 'CC0-1.0',
  title: "Fiber distribution cabinet",
  description: "Street-side fiber distribution cabinet with hinged-looking front, lock and cable plinth. Knobs: overall scale; powder-coated steel, stainless steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    powderCoat: '#52756b',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    powderCoat: '#e0aa18',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-distribution-cabinet");
p.part("body", b(0, 0, 45, 620, 430, 920).color(powderCoat));
p.part("hood", b(0, 0, 985, 670, 480, 60).color(powderCoat));
p.part("door", b(0, -222, 65, 540, 16, 760).color(powderCoat));
p.part("lock", c(195, -238, 575, 28, 18, 8).color(stainlessSteel));
p.part("lower-skirt", b(0, 0, 0, 660, 470, 50).color(powderCoat));

return p.model();
