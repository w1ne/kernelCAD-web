// SPDX-License-Identifier: CC0-1.0
// Pole mount radio cabinet: Compact pole-mounted radio enclosure with strap brackets, lid and front service panel with clearly separated telecom materials and visible component cues.

meta({
  name: "pole-mount-radio-cabinet",
  license: 'CC0-1.0',
  title: "Pole mount radio cabinet",
  description: "Compact pole-mounted radio enclosure with strap brackets, lid and front service panel. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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

const p = assembly("pole-mount-radio-cabinet");
p.part("box", b(0, 0, 0, 540, 360, 780).color(powderCoat));
p.part("lid", b(0, 0, 420, 580, 400, 60).color(powderCoat));
p.part("panel", b(0, -190, 10, 420, 18, 580).color(powderCoat));
p.part("strap-upper", b(0, 210, 260, 620, 46, 60).color(galvanizedSteel));
p.part("strap-lower", b(0, 210, 90, 620, 46, 60).color(galvanizedSteel));
p.part("lock", c(160, -214, 220, 24, 16, 8).color(stainlessSteel));

return p.model();
