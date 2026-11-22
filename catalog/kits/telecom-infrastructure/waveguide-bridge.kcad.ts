// SPDX-License-Identifier: CC0-1.0
// Waveguide bridge tray: Raised rooftop waveguide bridge with two support frames and a broad crossing tray with clearly separated telecom materials and visible component cues.

meta({
  name: "waveguide-bridge",
  license: 'CC0-1.0',
  title: "Waveguide bridge tray",
  description: "Raised rooftop waveguide bridge with two support frames and a broad crossing tray. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
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

const p = assembly("waveguide-bridge");
p.part("tray", b(0, 0, 520, 1800, 420, 65).color(galvanizedSteel));
p.part("rail-left", b(0, -215, 600, 1800, 30, 95).color(powderCoat));
p.part("rail-right", b(0, 215, 600, 1800, 30, 95).color(powderCoat));
p.part("leg--700--155", b(-700, -155, 0, 65, 65, 500).color(galvanizedSteel));
p.part("leg--700-155", b(-700, 155, 0, 65, 65, 500).color(galvanizedSteel));
p.part("leg-700--155", b(700, -155, 0, 65, 65, 500).color(galvanizedSteel));
p.part("leg-700-155", b(700, 155, 0, 65, 65, 500).color(galvanizedSteel));
p.part("cross-a", b(-700, 0, 70, 60, 420, 90).color(galvanizedSteel));
p.part("cross-b", b(700, 0, 70, 60, 420, 90).color(galvanizedSteel));


p.part('waveguide-jacket-0', b(0, -125, 615, 1750, 42, 24).color(polymer));
p.part('waveguide-jacket-1', b(0, 0, 615, 1750, 42, 24).color(polymer));
p.part('waveguide-jacket-2', b(0, 125, 615, 1750, 42, 24).color(polymer));

return p.model();
