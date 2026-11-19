// SPDX-License-Identifier: CC0-1.0
// Lattice mast section: Square lattice mast segment with four corner legs, diagonal braces and end flanges with clearly separated telecom materials and visible component cues.

meta({
  name: "lattice-mast-section",
  license: 'CC0-1.0',
  title: "Lattice mast section",
  description: "Square lattice mast segment with four corner legs, diagonal braces and end flanges. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r: number) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, 8)
    .rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate(x0, y0, z0).scale(scale);
};

const p = assembly("lattice-mast-section");
p.part("leg-a", b(-220, -220, 35, 42, 42, 1100).color(powderCoat));
p.part("leg-b", b(220, -220, 35, 42, 42, 1100).color(galvanizedSteel));
p.part("leg-c", b(-220, 220, 35, 42, 42, 1100).color(galvanizedSteel));
p.part("leg-d", b(220, 220, 35, 42, 42, 1100).color(galvanizedSteel));
p.part("cross-x1", b(0, -220, 300, 480, 38, 38).color(galvanizedSteel));
p.part("cross-x2", b(0, 220, 300, 480, 38, 38).color(galvanizedSteel));
p.part("flange", b(0, 0, 0, 560, 560, 45).color(galvanizedSteel));


p.part('brace-front-a', span(-200, -220, 90, 200, -220, 1080, 15).color(galvanizedSteel));
p.part('brace-front-b', span(200, -220, 90, -200, -220, 1080, 15).color(galvanizedSteel));
p.part('brace-rear-a', span(-200, 220, 90, 200, 220, 1080, 15).color(galvanizedSteel));
p.part('brace-rear-b', span(200, 220, 90, -200, 220, 1080, 15).color(galvanizedSteel));

return p.model();
