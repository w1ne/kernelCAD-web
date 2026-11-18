// SPDX-License-Identifier: CC0-1.0
// Conduit riser frame: Wall-mounted riser frame with three vertical conduits, stand-off brackets and top bridge with clearly separated telecom materials and visible component cues.

meta({
  name: "conduit-riser-frame",
  license: 'CC0-1.0',
  title: "Conduit riser frame",
  description: "Wall-mounted riser frame with three vertical conduits, stand-off brackets and top bridge. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
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
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
    powderCoat: '#52756b',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
    powderCoat: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("conduit-riser-frame");
p.part("conduit-0", c(-210, 0, 0, 1300, 40, 8).color(galvanizedSteel));
p.part("conduit-1", c(0, 0, 0, 1300, 40, 8).color(galvanizedSteel));
p.part("conduit-2", c(210, 0, 0, 1300, 40, 8).color(galvanizedSteel));
p.part("bridge-top", b(0, 90, 1140, 620, 120, 70).color(powderCoat));
p.part("bridge-bottom", b(0, 90, 250, 620, 120, 70).color(galvanizedSteel));
p.part("stand-off-a", b(0, 80, 530, 700, 55, 55).color(galvanizedSteel));
p.part("stand-off-b", b(0, 80, 950, 700, 55, 55).color(galvanizedSteel));


p.part('cable-band-0', cylinder(12, 45, 8).translate(-210, 0, 480).scale(scale).color(polymer));
p.part('cable-band-1', cylinder(12, 45, 8).translate(0, 0, 480).scale(scale).color(polymer));
p.part('cable-band-2', cylinder(12, 45, 8).translate(210, 0, 480).scale(scale).color(polymer));

return p.model();
