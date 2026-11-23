// SPDX-License-Identifier: CC0-1.0
// Guyed mast anchor set: Three-point guy-wire anchor layout with a central mast stub and ground cleat blocks with clearly separated telecom materials and visible component cues.

meta({
  name: "guy-wire-mast-anchor",
  license: 'CC0-1.0',
  title: "Guyed mast anchor set",
  description: "Three-point guy-wire anchor layout with a central mast stub and ground cleat blocks. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r: number) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, 8)
    .rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate(x0, y0, z0).scale(scale);
};

const p = assembly("guy-wire-mast-anchor");
p.part("mast", c(0, 0, 0, 820, 45, 8).color(galvanizedSteel));
p.part("base", c(0, 0, 0, 32, 180, 8).color(powderCoat));
p.part("anchor-a", b(-660, -380, 15, 180, 180, 30).color(galvanizedSteel));
p.part("anchor-b", b(660, -380, 15, 180, 180, 30).color(galvanizedSteel));
p.part("anchor-c", b(0, 760, 15, 180, 180, 30).color(galvanizedSteel));


p.part('guy-a', span(-330, -190, 30, 0, 0, 820, 10).color(galvanizedSteel));
p.part('guy-b', span(330, -190, 30, 0, 0, 820, 10).color(galvanizedSteel));
p.part('guy-c', span(0, 380, 30, 0, 0, 820, 10).color(galvanizedSteel));

return p.model();
