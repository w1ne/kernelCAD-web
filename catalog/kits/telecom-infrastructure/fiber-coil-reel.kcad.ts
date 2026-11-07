// SPDX-License-Identifier: CC0-1.0
// Fiber slack storage reel: spool with twin open flanges, a projecting center hub and a visible jacketed cable bundle.

meta({
  name: "fiber-coil-reel",
  license: 'CC0-1.0',
  title: "Fiber slack storage reel",
  description: "Compact fiber slack reel with twin open flanges, a projecting center hub and a jacketed cable bundle. Knobs: overall scale; galvanized steel, polymer cable jacket, powder-coated steel, stainless steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    powderCoat: '#52756b',
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    powderCoat: '#e0aa18',
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
    stainlessSteel: '#e4e9e6',
  },
});

const annulus = (depth: number, outer: number, inner: number) =>
  cylinder(depth, outer, 12).subtract(cylinder(depth + 2, inner, 12).translate(0, 0, -1));

const p = assembly("fiber-coil-reel");
p.part('flange-front', annulus(24, 250, 160).rotateX(90).translate(0, 140, 250).scale(scale).color(powderCoat));
p.part('flange-back', annulus(24, 250, 160).rotateX(90).translate(0, -116, 250).scale(scale).color(powderCoat));
p.part('hub', cylinder(300, 78, 10).rotateX(90).translate(0, 150, 250).scale(scale).color(stainlessSteel));


p.part('spoke-0', box(380, 18, 20, true).rotateY(0).translate(0, 148, 250).scale(scale).color(galvanizedSteel));
p.part('spoke-1', box(380, 18, 20, true).rotateY(45).translate(0, 148, 250).scale(scale).color(galvanizedSteel));
p.part('spoke-2', box(380, 18, 20, true).rotateY(90).translate(0, 148, 250).scale(scale).color(galvanizedSteel));
p.part('spoke-3', box(380, 18, 20, true).rotateY(135).translate(0, 148, 250).scale(scale).color(galvanizedSteel));
p.part('fiber-bundle', annulus(180, 185, 155).rotateX(90).translate(0, 90, 250).scale(scale).color(polymer));

return p.model();
