// SPDX-License-Identifier: CC0-1.0
// Fiber drop terminal: Small multiport drop terminal with six connector caps and a shallow rain hood with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-drop-terminal",
  license: 'CC0-1.0',
  title: "Fiber drop terminal",
  description: "Small multiport drop terminal with six connector caps and a shallow rain hood. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel.",
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

const p = assembly("fiber-drop-terminal");
p.part("case", b(0, 0, 0, 430, 180, 220).color(powderCoat));
p.part("hood", b(0, 0, 220, 470, 220, 45).color(powderCoat));
p.part("face", b(0, -96, 20, 370, 14, 150).color(powderCoat));
p.part("port-0", cylinder(45, 18, 8).rotate([1, 0, 0], 90).translate(-135, -96, 95).scale(scale).color(polymer));
p.part("port-1", cylinder(45, 18, 8).rotate([1, 0, 0], 90).translate(-81, -96, 95).scale(scale).color(polymer));
p.part("port-2", cylinder(45, 18, 8).rotate([1, 0, 0], 90).translate(-27, -96, 95).scale(scale).color(polymer));
p.part("port-3", cylinder(45, 18, 8).rotate([1, 0, 0], 90).translate(27, -96, 95).scale(scale).color(polymer));
p.part("port-4", cylinder(45, 18, 8).rotate([1, 0, 0], 90).translate(81, -96, 95).scale(scale).color(polymer));
p.part("port-5", cylinder(45, 18, 8).rotate([1, 0, 0], 90).translate(135, -96, 95).scale(scale).color(polymer));

return p.model();
