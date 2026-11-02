// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly burner management skid scene prop, modeled from scratch.
meta({
  name: 'burner-management-skid',
  license: 'CC0-1.0',
  title: 'Burner management skid',
  description: 'Burner management skid with a gas train, control cabinet, paired valves and a pilot stack. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6b7d83', { label: 'Body color' });
const accent = param('accent', '#e4a43a', { label: 'Accent color' });
const p = assembly('burner-management-skid');
p.part('base-skid', box(720, 380, 38, true).translate(0, 0, 19).scale(scale).color(accent));
p.part('burner-control', box(245, 180, 381.6, true).translate(-230.4, 0, 212).scale(scale).color(body));
p.part('control-face', box(12, 130, 222.6, true).translate(-129.6, -100, 238.5).scale(scale).color(accent));
p.part('gas-header', cylinder(446.4, 30, 10).rotate([0, 1, 0], 90).translate(-115.2, 0, 222.6).scale(scale).color(body));
p.part('gas-valve-0', cylinder(90, 42, 10).translate(-43.2, 0, 222.6).scale(scale).color(accent));
p.part('valve-wheel-0', cylinder(22, 64, 8).translate(-43.2, 0, 280.9).scale(scale).color(body));
p.part('branch-0', cylinder(100, 14, 10).rotate([0, 1, 0], 90).translate(-93.2, 0, 344.5).scale(scale).color(accent));
p.part('gas-valve-1', cylinder(90, 42, 10).translate(100.8, 0, 222.6).scale(scale).color(accent));
p.part('valve-wheel-1', cylinder(22, 64, 8).translate(100.8, 0, 280.9).scale(scale).color(body));
p.part('branch-1', cylinder(100, 14, 10).rotate([0, 1, 0], 90).translate(50.8, 0, 344.5).scale(scale).color(accent));
p.part('gas-valve-2', cylinder(90, 42, 10).translate(244.8, 0, 222.6).scale(scale).color(accent));
p.part('valve-wheel-2', cylinder(22, 64, 8).translate(244.8, 0, 280.9).scale(scale).color(body));
p.part('branch-2', cylinder(100, 14, 10).rotate([0, 1, 0], 90).translate(194.8, 0, 344.5).scale(scale).color(accent));
p.part('pilot-stack', cylinder(238.5, 24, 10).translate(302.4, 0, 0).scale(scale).color(accent));

return p.model();
