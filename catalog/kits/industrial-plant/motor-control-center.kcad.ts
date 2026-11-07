// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly motor control center scene prop, modeled from scratch.
meta({
  name: 'motor-control-center',
  license: 'CC0-1.0',
  title: 'Motor control center',
  description: 'Motor-control-center lineup with three distinct bays, operator panels and a shared cable base. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#687b84', { label: 'Body color' });
const accent = param('accent', '#e3a944', { label: 'Accent color' });
const p = assembly('motor-control-center');
p.part('shared-plinth', box(820.8, 275, 55, true).translate(0, 0, 28).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('bay-0', box(241.3, 250, 760, true).translate(-253.3, 0, 435).translate(0, 0, -0.5).scale(scale).color(body));
p.part('bay-door-0', box(192.5, 12, 577.6, true).translate(-253.3, -132.5, 404.6).translate(0, 0, -0.5).scale(scale).color(body));
p.part('operator-panel-0', box(96.3, 14, 167.2, true).translate(-253.3, -140, 602.2).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('pushbutton-0-0', cylinder(16, 13, 8).translate(-270.3, -147.5, 617.4).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pushbutton-0-1', cylinder(16, 13, 8).translate(-236.3, -147.5, 617.4).translate(0, 0, -0.5).scale(scale).color(body));
p.part('bay-1', box(241.3, 250, 760, true).translate(0, 0, 435).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('bay-door-1', box(192.5, 12, 577.6, true).translate(0, -132.5, 404.6).translate(0, 0, -0.5).scale(scale).color(body));
p.part('operator-panel-1', box(96.3, 14, 167.2, true).translate(0, -140, 602.2).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('pushbutton-1-0', cylinder(16, 13, 8).translate(-17, -147.5, 617.4).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pushbutton-1-1', cylinder(16, 13, 8).translate(17, -147.5, 617.4).translate(0, 0, -0.5).scale(scale).color(body));
p.part('bay-2', box(241.3, 250, 760, true).translate(253.3, 0, 435).translate(0, 0, -0.5).scale(scale).color(body));
p.part('bay-door-2', box(192.5, 12, 577.6, true).translate(253.3, -132.5, 404.6).translate(0, 0, -0.5).scale(scale).color(body));
p.part('operator-panel-2', box(96.3, 14, 167.2, true).translate(253.3, -140, 602.2).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('pushbutton-2-0', cylinder(16, 13, 8).translate(236.3, -147.5, 617.4).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pushbutton-2-1', cylinder(16, 13, 8).translate(270.3, -147.5, 617.4).translate(0, 0, -0.5).scale(scale).color(body));
p.part('top-cable-duct', box(760, 105, 42, true).translate(0, 0, 836).translate(0, 0, -0.5).scale(scale).color(accent));

return p.model();
