// SPDX-License-Identifier: CC0-1.0
// Fiber dome closure: Vertical dome splice enclosure with a domed-looking cap, lower collar and four cable ports with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-dome-closure",
  license: 'CC0-1.0',
  title: "Fiber dome closure",
  description: "Vertical dome splice enclosure with a domed-looking cap, lower collar and four cable ports. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
presets({
  fieldSite: {
    polymer: '#263a37',
    powderCoat: '#52756b',
  },
  highVisibility: {
    polymer: '#27363c',
    powderCoat: '#e0aa18',
  },
});

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-dome-closure");
p.part("base", c(0, 0, 0, 90, 170, 8).color(powderCoat));
p.part("body", c(0, 0, 90, 560, 140, 8).color(powderCoat));
p.part("dome", c(0, 0, 650, 140, 155, 8).color(polymer));
p.part("port-a", c(-105, -105, 20, 80, 42, 8).color(polymer));
p.part("port-b", c(105, -105, 20, 80, 42, 8).color(polymer));
p.part("port-c", c(-105, 105, 20, 80, 42, 8).color(polymer));
p.part("port-d", c(105, 105, 20, 80, 42, 8).color(polymer));

return p.model();
