// SPDX-License-Identifier: CC0-1.0
// Fiber service-loop rack: wall plate with two open cable hoops and four narrow retaining fingers.

meta({
  name: "fiber-service-loop-rack",
  license: 'CC0-1.0',
  title: "Fiber service loop rack",
  description: "Wall rack with two open fiber service hoops and four narrow retaining fingers. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket, powder-coated steel.",
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
const annulus = (depth: number, outer: number, inner: number) =>
  cylinder(depth, outer, 12).subtract(cylinder(depth + 2, inner, 12).translate(0, 0, -1));
const p = assembly("fiber-service-loop-rack");
p.part("backplate", b(0, 0, 0, 400, 45, 800).color(powderCoat));
p.part('loop-left', annulus(40, 190, 174).rotateX(90).translate(0, -150, 300).scale(scale).color(polymer));
p.part('loop-right', annulus(40, 190, 174).rotateX(-90).translate(0, 150, 300).scale(scale).color(polymer));
p.part("finger-0", b(0, -220, 240, 42, 30, 440).color(galvanizedSteel));
p.part("finger-1", b(0, -75, 240, 42, 30, 440).color(galvanizedSteel));
p.part("finger-2", b(0, 70, 240, 42, 30, 440).color(galvanizedSteel));
p.part("finger-3", b(0, 215, 240, 42, 30, 440).color(galvanizedSteel));

return p.model();
