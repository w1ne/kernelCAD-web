// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly packed scrubber column scene prop, modeled from scratch.
meta({
  name: 'packed-scrubber-column',
  license: 'CC0-1.0',
  title: 'Packed scrubber column',
  description: 'Packed scrubber tower with a wide sump, narrow stack, spray headers and ladder cage. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#70848d', { label: 'Body color' });
const accent = param('accent', '#dca84a', { label: 'Accent color' });
const p = assembly('packed-scrubber-column');
p.part('shell', cylinder(1065, 210, 10).translate(0, 0, 55).scale(scale).color(body));
p.part('roof-lip', cylinder(24, 222.6, 10).translate(0, 0, 1096).scale(scale).color(accent));
p.part('roof-cap', cylinder(36, 168, 10).translate(0, 0, 1120).scale(scale).color(body));
p.part('top-nozzle', cylinder(112, 29.4, 10).translate(0, 0, 1148).scale(scale).color(accent));
p.part('service-deck-0', box(556.5, 472.5, 14, true).translate(0, -25.2, 380.8).scale(scale).color(accent));
p.part('deck-post-0', box(12, 12, 76, true).translate(226.8, -25.2, 423.8).scale(scale).color(body));
p.part('service-deck-1', box(556.5, 472.5, 14, true).translate(0, -25.2, 604.8).scale(scale).color(accent));
p.part('deck-post-1', box(12, 12, 76, true).translate(226.8, -25.2, 647.8).scale(scale).color(body));
p.part('sump', cylinder(145, 256.2, 10).translate(0, 0, 0).scale(scale).color(accent));
p.part('support-leg-0', box(28, 28, 55, true).translate(151.2, 0, 27.5).scale(scale).color(accent));
p.part('foot-0', box(70, 56, 16, true).translate(151.2, 0, 8).scale(scale).color(body));
p.part('support-leg-1', box(28, 28, 55, true).translate(0, 151.2, 27.5).scale(scale).color(accent));
p.part('foot-1', box(70, 56, 16, true).translate(0, 151.2, 8).scale(scale).color(body));
p.part('support-leg-2', box(28, 28, 55, true).translate(-151.2, 0, 27.5).scale(scale).color(accent));
p.part('foot-2', box(70, 56, 16, true).translate(-151.2, 0, 8).scale(scale).color(body));
p.part('support-leg-3', box(28, 28, 55, true).translate(-0, -151.2, 27.5).scale(scale).color(accent));
p.part('foot-3', box(70, 56, 16, true).translate(-0, -151.2, 8).scale(scale).color(body));
p.part('side-nozzle', cylinder(147, 29.4, 10).rotate([0, 1, 0], 90).translate(119.7, 0, 627.2).scale(scale).color(accent));
p.part('side-flange', cylinder(20, 50.4, 10).rotate([0, 1, 0], 90).translate(263, 0, 627.2).scale(scale).color(body));
p.part('ladder-left-rail', box(12, 12, 873.6, true).translate(228.9, -159.6, 503).scale(scale).color(accent));
p.part('ladder-right-rail', box(12, 12, 873.6, true).translate(256.2, -159.6, 503).scale(scale).color(accent));
p.part('ladder-rung-0', box(14, 18, 12, true).translate(242.6, -159.6, 55).scale(scale).color(body));
p.part('ladder-rung-1', box(14, 18, 12, true).translate(242.6, -159.6, 189.4).scale(scale).color(body));
p.part('ladder-rung-2', box(14, 18, 12, true).translate(242.6, -159.6, 323.8).scale(scale).color(body));
p.part('ladder-rung-3', box(14, 18, 12, true).translate(242.6, -159.6, 458.2).scale(scale).color(body));
p.part('ladder-rung-4', box(14, 18, 12, true).translate(242.6, -159.6, 592.6).scale(scale).color(body));
p.part('ladder-rung-5', box(14, 18, 12, true).translate(242.6, -159.6, 727).scale(scale).color(body));

return p.model();
