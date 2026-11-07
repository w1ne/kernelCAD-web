// SPDX-License-Identifier: CC0-1.0
// Sector antenna frame: Triangular sector panel support frame with three vertical rails and top and bottom braces with clearly separated telecom materials and visible component cues.

meta({
  name: "antenna-sector-frame",
  license: 'CC0-1.0',
  title: "Sector antenna frame",
  description: "Triangular sector panel support frame with three vertical rails and top and bottom braces. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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

const p = assembly("antenna-sector-frame");
p.part("rail-a", b(-190, 0, 0, 36, 65, 1100).color(galvanizedSteel));
p.part("rail-b", b(0, 0, 0, 36, 65, 1100).color(galvanizedSteel));
p.part("rail-c", b(190, 0, 0, 36, 65, 1100).color(galvanizedSteel));
p.part("top", b(0, 0, 1090, 500, 100, 60).color(powderCoat));
p.part("bottom", b(0, 0, 5, 500, 100, 60).color(galvanizedSteel));
p.part("mount-arm", b(0, 170, 460, 65, 400, 65).color(galvanizedSteel));
p.part("clamp", b(0, 380, 460, 180, 70, 80).color(stainlessSteel));

return p.model();
