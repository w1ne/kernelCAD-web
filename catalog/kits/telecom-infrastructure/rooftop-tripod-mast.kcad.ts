// SPDX-License-Identifier: CC0-1.0
// Rooftop tripod mast: Short rooftop antenna mast on three splayed legs with a round base plate and collar with clearly separated telecom materials and visible component cues.

meta({
  name: "rooftop-tripod-mast",
  license: 'CC0-1.0',
  title: "Rooftop tripod mast",
  description: "Short rooftop antenna mast on three splayed legs with a round base plate and collar. Knobs: overall scale; galvanized steel, powder-coated steel, stainless steel.",
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

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r: number) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, 8)
    .rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate(x0, y0, z0).scale(scale);
};

const p = assembly("rooftop-tripod-mast");
p.part("base", c(0, 0, 0, 35, 270, 8).color(powderCoat));
p.part("mast", c(0, 0, 35, 1300, 42, 8).color(galvanizedSteel));
p.part("collar", c(0, 0, 870, 42, 65, 8).color(stainlessSteel));


p.part('leg-front', span(0, -330, 30, 0, 0, 805, 18).color(galvanizedSteel));
p.part('leg-left', span(-286, 165, 30, 0, 0, 805, 18).color(galvanizedSteel));
p.part('leg-right', span(286, 165, 30, 0, 0, 805, 18).color(galvanizedSteel));

return p.model();
