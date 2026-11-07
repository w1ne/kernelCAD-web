// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly valve manifold station scene prop, modeled from scratch.
meta({
  name: 'valve-manifold-station',
  license: 'CC0-1.0',
  title: 'Valve manifold station',
  description: 'Process valve station with parallel pipe runs, isolation wheels, gauges and a support frame. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6c7e85', { label: 'Body color' });
const accent = param('accent', '#e4aa43', { label: 'Accent color' });
const p = assembly('valve-manifold-station');
p.part('support-frame', box(730, 380, 28, true).translate(0, 0, 14).scale(scale).color(accent));
p.part('header', cylinder(657, 36, 10).rotate([0, 1, 0], 90).translate(-328.5, 38, 192).scale(scale).color(body));
p.part('riser-0', cylinder(201.6, 20, 10).translate(-219, 0, 192).scale(scale).color(accent));
p.part('valve-0', cylinder(62, 38, 10).translate(-219, 0, 321.6).scale(scale).color(body));
p.part('handwheel-0', cylinder(90, 8, 8).rotate([0, 1, 0], 90).translate(-264, 0, 364.8).scale(scale).color(accent));
p.part('branch-outlet-0', cylinder(120, 22, 10).rotate([0, 1, 0], 90).translate(-279, 0, 403.2).scale(scale).color(body));
p.part('flange-0', cylinder(18, 44, 10).rotate([0, 1, 0], 90).translate(-166, 0, 403.2).scale(scale).color(accent));
p.part('riser-1', cylinder(201.6, 20, 10).translate(0, 0, 192).scale(scale).color(accent));
p.part('valve-1', cylinder(62, 38, 10).translate(0, 0, 321.6).scale(scale).color(body));
p.part('handwheel-1', cylinder(90, 8, 8).rotate([0, 1, 0], 90).translate(-45, 0, 364.8).scale(scale).color(accent));
p.part('branch-outlet-1', cylinder(120, 22, 10).rotate([0, 1, 0], 90).translate(-60, 0, 403.2).scale(scale).color(body));
p.part('flange-1', cylinder(18, 44, 10).rotate([0, 1, 0], 90).translate(53, 0, 403.2).scale(scale).color(accent));
p.part('riser-2', cylinder(201.6, 20, 10).translate(219, 0, 192).scale(scale).color(accent));
p.part('valve-2', cylinder(62, 38, 10).translate(219, 0, 321.6).scale(scale).color(body));
p.part('handwheel-2', cylinder(90, 8, 8).rotate([0, 1, 0], 90).translate(174, 0, 364.8).scale(scale).color(accent));
p.part('branch-outlet-2', cylinder(120, 22, 10).rotate([0, 1, 0], 90).translate(159, 0, 403.2).scale(scale).color(body));
p.part('flange-2', cylinder(18, 44, 10).rotate([0, 1, 0], 90).translate(272, 0, 403.2).scale(scale).color(accent));
p.part('stand--1', box(32, 32, 182.4, true).translate(-277.4, 0, 91.2).scale(scale).color(body));
p.part('stand-1', box(32, 32, 182.4, true).translate(277.4, 0, 91.2).scale(scale).color(body));

return p.model();
