// SPDX-License-Identifier: CC0-1.0
// Wall mast stand-off bracket: Wall stand-off bracket with backplate, two arms, mast clamps and bolt heads with clearly separated telecom materials and visible component cues.

meta({
  name: "wall-mast-bracket",
  license: 'CC0-1.0',
  title: "Wall mast stand-off bracket",
  description: "Wall stand-off bracket with backplate, two arms, mast clamps and bolt heads. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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

const p = assembly("wall-mast-bracket");
p.part("backplate", b(0, 0, 100, 300, 60, 900).color(powderCoat));
p.part("arm-upper", b(0, -220, 430, 90, 460, 80).color(galvanizedSteel));
p.part("arm-lower", b(0, -220, 0, 90, 460, 80).color(galvanizedSteel));
p.part("clamp-upper", c(0, -220, 450, 100, 85, 8).color(stainlessSteel));
p.part("clamp-lower", c(0, -220, 20, 100, 85, 8).color(stainlessSteel));
p.part("gusset-a", b(0, -90, 260, 40, 300, 330).color(galvanizedSteel));
p.part("gusset-b", b(0, -90, 40, 40, 300, 330).color(galvanizedSteel));

return p.model();
