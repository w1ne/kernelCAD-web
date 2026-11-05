// SPDX-License-Identifier: CC0-1.0
// Fiber splice closure: Inline fiber splice closure with tapered ends, raised center lid and two cable ports with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-splice-closure",
  license: 'CC0-1.0',
  title: "Fiber splice closure",
  description: "Inline fiber splice closure with tapered ends, raised center lid and two cable ports. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel.",
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

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-splice-closure");
p.part("shell", c(0, 0, 60, 460, 145, 8).color(powderCoat));
p.part("lid", c(0, 0, 485, 40, 155, 8).color(powderCoat));
p.part("port-left", c(0, -160, 210, 90, 62, 8).color(polymer));
p.part("port-right", c(0, 160, 210, 90, 62, 8).color(polymer));
p.part("mount-foot-left", b(-120, 0, 0, 90, 300, 40).color(powderCoat));
p.part("mount-foot-right", b(120, 0, 0, 90, 300, 40).color(powderCoat));

return p.model();
