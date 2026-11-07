// SPDX-License-Identifier: CC0-1.0
// Roof cable penetration seal: Low roof cable penetration boot with a rectangular base, collar and capped conduit with clearly separated telecom materials and visible component cues.

meta({
  name: "roof-penetration-seal",
  license: 'CC0-1.0',
  title: "Roof cable penetration seal",
  description: "Low roof cable penetration boot with a rectangular base, collar and capped conduit. Knobs: overall scale; galvanized steel, powder-coated steel, elastomer seals and pads, stainless steel.",
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
const rubber = param('rubber', '#282d30', { label: 'Elastomer seals and pads' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
    rubber: '#292e2d',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
    rubber: '#252a2c',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("roof-penetration-seal");
p.part("base", b(0, 0, 0, 420, 360, 50).color(powderCoat));
p.part("boot", c(0, 0, 25, 160, 145, 8).color(rubber));
p.part("collar", c(0, 0, 185, 55, 115, 8).color(stainlessSteel));
p.part("conduit", c(0, 0, 240, 420, 52, 8).color(galvanizedSteel));
p.part("cap", c(0, 0, 660, 35, 70, 8).color(powderCoat));

return p.model();
