// SPDX-License-Identifier: CC0-1.0
// Optical patch panel: Rack-width optical patch panel with two connector rows and rack ears with clearly separated telecom materials and visible component cues.

meta({
  name: "optical-patch-panel",
  license: 'CC0-1.0',
  title: "Optical patch panel",
  description: "Rack-width optical patch panel with two connector rows and rack ears. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel.",
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

const p = assembly("optical-patch-panel");
p.part("panel", b(0, 0, 0, 480, 180, 240).color(powderCoat));
p.part("ear-left", b(-270, 0, 0, 60, 190, 280).color(powderCoat));
p.part("ear-right", b(270, 0, 0, 60, 190, 280).color(powderCoat));
p.part("port-0-0", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(-170, -96, 70).scale(scale).color(polymer));
p.part("port-0-1", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(-102, -96, 70).scale(scale).color(polymer));
p.part("port-0-2", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(-34, -96, 70).scale(scale).color(polymer));
p.part("port-0-3", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(34, -96, 70).scale(scale).color(polymer));
p.part("port-0-4", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(102, -96, 70).scale(scale).color(polymer));
p.part("port-1-0", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(-170, -96, 190).scale(scale).color(polymer));
p.part("port-1-1", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(-102, -96, 190).scale(scale).color(polymer));
p.part("port-1-2", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(-34, -96, 190).scale(scale).color(polymer));
p.part("port-1-3", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(34, -96, 190).scale(scale).color(polymer));
p.part("port-1-4", cylinder(38, 17, 8).rotate([1, 0, 0], 90).translate(102, -96, 190).scale(scale).color(polymer));

return p.model();
