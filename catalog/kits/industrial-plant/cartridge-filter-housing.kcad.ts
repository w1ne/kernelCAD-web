// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cartridge filter housing scene prop, modeled from scratch.
meta({
  name: 'cartridge-filter-housing',
  license: 'CC0-1.0',
  title: 'Cartridge filter housing',
  description: 'Vertical cartridge-filter vessel with a quick-access lid, inlet and outlet pipes and a drain. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#71848a', { label: 'Body color' });
const accent = param('accent', '#e6b24f', { label: 'Accent color' });
const p = assembly('cartridge-filter-housing');
p.part('shell', cylinder(565, 190, 10).translate(0, 0, 55).scale(scale).color(body));
p.part('roof-lip', cylinder(24, 201.4, 10).translate(0, 0, 596).scale(scale).color(accent));
p.part('roof-cap', cylinder(36, 152, 10).translate(0, 0, 620).scale(scale).color(body));
p.part('top-nozzle', cylinder(62, 26.6, 10).translate(0, 0, 648).scale(scale).color(accent));
p.part('stiffener-0', cylinder(14, 197.6, 10).translate(0, 0, 337.5).scale(scale).color(accent));
p.part('support-leg-0', box(28, 28, 55, true).translate(136.8, 0, 27.5).scale(scale).color(accent));
p.part('foot-0', box(70, 56, 16, true).translate(136.8, 0, 8).scale(scale).color(body));
p.part('support-leg-1', box(28, 28, 55, true).translate(-68.4, 118.5, 27.5).scale(scale).color(accent));
p.part('foot-1', box(70, 56, 16, true).translate(-68.4, 118.5, 8).scale(scale).color(body));
p.part('support-leg-2', box(28, 28, 55, true).translate(-68.4, -118.5, 27.5).scale(scale).color(accent));
p.part('foot-2', box(70, 56, 16, true).translate(-68.4, -118.5, 8).scale(scale).color(body));
p.part('side-nozzle', cylinder(133, 26.6, 10).rotate([0, 1, 0], 90).translate(108.3, 0, 347.2).scale(scale).color(accent));
p.part('side-flange', cylinder(20, 45.6, 10).rotate([0, 1, 0], 90).translate(237, 0, 347.2).scale(scale).color(body));
p.part('ladder-left-rail', box(12, 12, 483.6, true).translate(207.1, -144.4, 303).scale(scale).color(accent));
p.part('ladder-right-rail', box(12, 12, 483.6, true).translate(231.8, -144.4, 303).scale(scale).color(accent));
p.part('ladder-rung-0', box(14, 18, 12, true).translate(219.5, -144.4, 55).scale(scale).color(body));
p.part('ladder-rung-1', box(14, 18, 12, true).translate(219.5, -144.4, 129.4).scale(scale).color(body));
p.part('ladder-rung-2', box(14, 18, 12, true).translate(219.5, -144.4, 203.8).scale(scale).color(body));
p.part('ladder-rung-3', box(14, 18, 12, true).translate(219.5, -144.4, 278.2).scale(scale).color(body));
p.part('ladder-rung-4', box(14, 18, 12, true).translate(219.5, -144.4, 352.6).scale(scale).color(body));
p.part('ladder-rung-5', box(14, 18, 12, true).translate(219.5, -144.4, 427).scale(scale).color(body));

return p.model();
