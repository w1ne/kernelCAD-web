// SPDX-License-Identifier: CC0-1.0
// Site identification placard: Small site identification plate with a raised frame, two posts and bolted feet with clearly separated telecom materials and visible component cues.

meta({
  name: "site-id-placard",
  license: 'CC0-1.0',
  title: "Site identification placard",
  description: "Small site identification plate with a raised frame, two posts and bolted feet. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("site-id-placard");
p.part("plate", b(0, 0, 690, 760, 40, 380).color(powderCoat));
p.part("inset", b(0, -24, 690, 650, 14, 270).color(powderCoat));
p.part("post--280", b(-280, 0, 0, 42, 42, 620).color(galvanizedSteel));
p.part("post-280", b(280, 0, 0, 42, 42, 620).color(galvanizedSteel));
p.part("bolt--320", c(-320, -30, 780, 18, 15, 8).color(stainlessSteel));
p.part("bolt-320", c(320, -30, 780, 18, 15, 8).color(stainlessSteel));

return p.model();
